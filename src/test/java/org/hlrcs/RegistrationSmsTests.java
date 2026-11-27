package org.hlrcs;

import com.sun.net.httpserver.HttpServer;
import org.hlrcs.entity.RegistrationOtp;
import org.hlrcs.repository.RegistrationOtpRepository;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.service.GeminiAccommodationClient;
import org.hlrcs.service.impl.EsmsPhoneOtpProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.*;
import java.util.regex.Pattern;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:registration-sms;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "app.phone-otp.provider=esms", "app.phone-otp.esms.api-key=test-key", "app.phone-otp.esms.secret-key=test-secret",
        "app.phone-otp.esms.brandname=Test", "app.registration.mail-from=otp@example.test"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class RegistrationSmsTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RegistrationOtpRepository challenges;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired EsmsPhoneOtpProvider provider;
    @MockitoBean JavaMailSender mail;
    @MockitoBean GeminiAccommodationClient gemini;
    private HttpServer sms;
    private String phone;
    private final AtomicReference<String> code = new AtomicReference<>();
    private final AtomicInteger calls = new AtomicInteger(), responseStatus = new AtomicInteger(200);
    private static final String BASE = "/api/auth/register";

    @BeforeEach void setup() throws Exception {
        challenges.deleteAll(); reset(mail); code.set(null); calls.set(0); responseStatus.set(200);
        phone = "03" + String.format(Locale.ROOT, "%08d", new java.security.SecureRandom().nextInt(100_000_000));
        sms = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        sms.createContext("/sms", exchange -> {
            calls.incrementAndGet();
            var body = json.readTree(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            assertEquals(phone, body.path("Phone").asString());
            assertEquals("2", body.path("SmsType").asString());
            var match = Pattern.compile("\\b([0-9]{6})\\b").matcher(body.path("Content").asString());
            assertTrue(match.find()); code.set(match.group(1));
            byte[] response = ("{\"CodeResult\":\"100\",\"SMSID\":\"registration-" + calls.get() + "\"}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(responseStatus.get(), response.length);
            exchange.getResponseBody().write(response); exchange.close();
        });
        sms.start();
        ReflectionTestUtils.setField(provider, "endpoint", URI.create("http://127.0.0.1:" + sms.getAddress().getPort() + "/sms"));
    }
    @AfterEach void stop() { if (sms != null) sms.stop(0); }
    private String postResult(String path, Object body, int expected) throws Exception {
        var result = mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andReturn().getResponse();
        assertEquals(expected, result.getStatus(), result.getContentAsString());
        return result.getContentAsString();
    }
    private void send(int status) throws Exception { postResult(BASE + "/otp/send", Map.of("identifier", phone), status); }
    private String verify(String value, int status) throws Exception {
        return json.readTree(postResult(BASE + "/otp/verify", Map.of("identifier", phone, "code", value), status))
                .path("data").path("verificationToken").asString();
    }
    private RegistrationOtp challenge() { return challenges.findAll().get(0); }
    private void allowResend() { var c = challenge(); c.setSentAt(Instant.now().minusSeconds(61)); challenges.saveAndFlush(c); }
    private Map<String, String> registration(String token) {
        return Map.of("phoneNumber", phone, "fullName", "SMS member", "password", "Strong123", "role", "ADMIN", "verificationToken", token);
    }

    @Test void esmsRegistersNormalizedPhoneWithOneUseProofAndUserRole() throws Exception {
        String result = postResult(BASE + "/otp/send", Map.of("identifier", "+84" + phone.substring(1)), 200);
        assertFalse(json.readTree(result).path("data").has("code"));
        assertFalse(result.contains("registration-1"));
        assertTrue(encoder.matches(code.get(), challenge().getSecretHash()));
        assertEquals("registration-1", challenge().getProviderReference());
        String token = verify(code.get(), 200);
        verify(code.get(), 400);
        var data = json.readTree(postResult(BASE, registration(token), 201)).path("data");
        assertEquals("USER", data.path("role").asString());
        var account = users.findById(data.path("userId").asInt()).orElseThrow();
        assertEquals(phone, account.getPhoneNumber()); assertNotNull(account.getPhoneVerifiedAt());
        postResult(BASE, registration(token), 400); send(409);
        assertNull(challenge().getSecretHash()); assertNull(challenge().getProviderReference());
        assertEquals(1, calls.get()); verifyNoInteractions(mail);
    }

    @Test void wrongAttemptsPersistCooldownAndResendUsesNewSmsChallenge() throws Exception {
        send(200); send(429); assertEquals(1, calls.get());
        String wrong = code.get().equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 5; i++) verify(wrong, 400);
        assertEquals(5, challenge().getFailedAttempts()); verify(code.get(), 400);
        allowResend(); send(200);
        assertEquals(2, calls.get()); assertEquals(0, challenge().getFailedAttempts());
        assertEquals("registration-2", challenge().getProviderReference()); verify(code.get(), 200);
    }

    @Test void providerFailureRollsBackAndDoesNotAutomaticallyRetryOrConsumeOldProof() throws Exception {
        responseStatus.set(503); send(503); assertEquals(1, calls.get()); assertEquals(0, challenges.count());
        responseStatus.set(200); send(200); String proof = verify(code.get(), 200);
        allowResend(); responseStatus.set(503); send(503); assertEquals(3, calls.get());
        assertTrue(challenge().isVerified()); assertTrue(encoder.matches(proof, challenge().getSecretHash()));
        postResult(BASE, registration(proof), 201);
    }

    @Test void expiredCodesProofsAndWrongDestinationCannotRegister() throws Exception {
        send(200); var c = challenge(); c.setExpiresAt(Instant.now().minusSeconds(1)); challenges.saveAndFlush(c);
        verify(code.get(), 400); allowResend(); send(200); String proof = verify(code.get(), 200);
        var wrongDestination = new HashMap<>(registration(proof)); wrongDestination.put("phoneNumber", "0399999988");
        postResult(BASE, wrongDestination, 400);
        c = challenge(); c.setExpiresAt(Instant.now().minusSeconds(1)); challenges.saveAndFlush(c);
        postResult(BASE, registration(proof), 400);
    }

    @Test void emailRegistrationKeepsSmtpAndDoesNotSendSms() throws Exception {
        var emailCode = new AtomicReference<String>();
        doAnswer(invocation -> { var message = invocation.getArgument(0, SimpleMailMessage.class);
            var match = Pattern.compile("\\b([0-9]{6})\\b").matcher(message.getText()); assertTrue(match.find());
            emailCode.set(match.group(1)); return null;
        }).when(mail).send(any(SimpleMailMessage.class));
        String email = "sms-migration-" + UUID.randomUUID() + "@example.test";
        postResult(BASE + "/otp/send", Map.of("identifier", email), 200);
        var result = postResult(BASE + "/otp/verify", Map.of("identifier", email, "code", emailCode.get()), 200);
        String token = json.readTree(result).path("data").path("verificationToken").asString();
        postResult(BASE, Map.of("email", email, "password", "Strong123", "fullName", "Email member", "verificationToken", token), 201);
        assertEquals(0, calls.get()); assertNull(challenge().getProviderReference());
    }
}
