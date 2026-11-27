package org.hlrcs;

import com.sun.net.httpserver.HttpServer;
import org.hlrcs.entity.User;
import org.hlrcs.entity.PasswordResetChallenge;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:password-recovery;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "app.phone-otp.provider=esms", "app.phone-otp.esms.api-key=test-key", "app.phone-otp.esms.secret-key=test-secret",
        "app.phone-otp.esms.brandname=Test", "app.registration.mail-from=otp@example.test"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class PasswordRecoveryTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordResetChallengeRepository challenges;
    @Autowired RegistrationOtpRepository registrationChallenges;
    @Autowired PasswordEncoder encoder;
    @Autowired EsmsPhoneOtpProvider smsProvider;
    @MockitoBean JavaMailSender mail;
    @MockitoBean GeminiAccommodationClient gemini;
    private HttpServer sms;
    private User user;
    private String email;
    private final AtomicReference<String> emailCode = new AtomicReference<>(), smsCode = new AtomicReference<>();
    private final AtomicInteger smsStatus = new AtomicInteger(200), smsCalls = new AtomicInteger();
    private static final String BASE = "/api/auth/password-reset";

    @BeforeEach void setup() throws Exception {
        challenges.deleteAll();
        reset(mail); emailCode.set(null); smsCode.set(null); smsStatus.set(200); smsCalls.set(0);
        email = "reset-" + UUID.randomUUID() + "@example.test";
        user = users.save(User.builder().email(email).fullName("Password test").phoneNumber("0912345678")
                .phoneVerifiedAt(Instant.now()).passwordHash(encoder.encode("OldPass123"))
                .role(UserRole.USER).status(UserStatus.ACTIVE).build());
        // Other fixtures may own this phone. Keep the new test account's destination unambiguous.
        for (var previous : users.findByPhoneNumberIn(List.of("0912345678", "+84912345678")))
            if (!previous.getUserId().equals(user.getUserId())) { previous.setPhoneNumber(null); users.save(previous); }
        doAnswer(invocation -> { var message = invocation.getArgument(0, SimpleMailMessage.class);
            emailCode.set(code(message.getText())); return null; }).when(mail).send(any(SimpleMailMessage.class));
        sms = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        sms.createContext("/sms", exchange -> {
            smsCalls.incrementAndGet();
            var payload = json.readTree(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            smsCode.set(code(payload.path("Content").asString()));
            assertEquals("0912345678", payload.path("Phone").asString());
            byte[] body = "{\"CodeResult\":\"100\",\"SMSID\":\"local-delivery\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(smsStatus.get(), body.length); exchange.getResponseBody().write(body); exchange.close();
        });
        sms.start();
        ReflectionTestUtils.setField(smsProvider, "endpoint", URI.create("http://127.0.0.1:" + sms.getAddress().getPort() + "/sms"));
    }
    @AfterEach void stop() { if (sms != null) sms.stop(0); }
    private static String code(String text) { var matcher = Pattern.compile("\\b([0-9]{6})\\b").matcher(text); assertTrue(matcher.find()); return matcher.group(1); }
    private String postOk(String path, Object body) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }
    private String login() throws Exception { return json.readTree(postOk("/api/auth/login", Map.of("email", email, "password", "OldPass123"))).path("data").path("accessToken").asString(); }
    private String proof(String destination, String code) throws Exception { return json.readTree(postOk(BASE + "/verify-otp", Map.of("identifier", destination, "code", code))).path("data").path("verificationToken").asString(); }
    private PasswordResetChallenge challenge() { return challenges.findAll().get(0); }
    private void confirm(String identifier, String token, String password) throws Exception { postOk(BASE + "/confirm", Map.of("identifier", identifier, "verificationToken", token, "newPassword", password)); }
    private void waitResend() { var c = challenge(); c.setSentAt(Instant.now().minusSeconds(61)); challenges.save(c); }

    @Test void emailResetConsumesProofAndRevokesOldJwtAndPassword() throws Exception {
        String jwt = login();
        postOk(BASE + "/send-otp", Map.of("identifier", email.toUpperCase(Locale.ROOT)));
        assertNotNull(emailCode.get()); assertNotEquals(emailCode.get(), challenge().getSecretHash());
        String token = proof(email, emailCode.get());
        mvc.perform(post(BASE + "/verify-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "code", emailCode.get())))).andExpect(status().isBadRequest());
        confirm(email, token, "NewPass123");
        assertTrue(encoder.matches("NewPass123", users.findById(user.getUserId()).orElseThrow().getPasswordHash()));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwt)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email", email, "password", "OldPass123")))).andExpect(status().isUnauthorized());
        postOk("/api/auth/login", Map.of("email", email, "password", "NewPass123"));
        mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", "OtherPass123")))).andExpect(status().isBadRequest());
    }
    @Test void verifiedPhoneUsesRealEsmsAdapterAgainstLocalHttpStandIn() throws Exception {
        postOk(BASE + "/send-otp", Map.of("identifier", "+84 912 345 678"));
        assertEquals(1, smsCalls.get()); assertNotNull(smsCode.get());
        confirm("0912345678", proof("+84912345678", smsCode.get()), "SmsNew123");
        assertEquals(1, smsCalls.get(), "Verification must use the saved hash, without sending another SMS");
    }
    @Test void otpAttemptsCommitAndLockAtFive() throws Exception {
        postOk(BASE + "/send-otp", Map.of("identifier", email));
        String wrong = emailCode.get().equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 5; i++) mvc.perform(post(BASE + "/verify-otp").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("identifier", email, "code", wrong)))).andExpect(status().isBadRequest());
        assertEquals(5, challenge().getFailedAttempts());
        mvc.perform(post(BASE + "/verify-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "code", emailCode.get())))).andExpect(status().isBadRequest());
    }
    @Test void expiredCodesAndExpiredProofCannotChangePassword() throws Exception {
        postOk(BASE + "/send-otp", Map.of("identifier", email));
        var c = challenge(); c.setExpiresAt(Instant.now().minusSeconds(1)); challenges.save(c);
        mvc.perform(post(BASE + "/verify-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "code", emailCode.get())))).andExpect(status().isBadRequest());
        waitResend(); postOk(BASE + "/send-otp", Map.of("identifier", email)); String token = proof(email, emailCode.get());
        c = challenge(); c.setExpiresAt(Instant.now().minusSeconds(1)); challenges.save(c);
        mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", "Expired123")))).andExpect(status().isBadRequest());
        assertTrue(encoder.matches("OldPass123", users.findById(user.getUserId()).orElseThrow().getPasswordHash()));
    }
    @Test void resendInvalidatesPreviousProofAndEnforcesCooldownAndDailyLimit() throws Exception {
        postOk(BASE + "/send-otp", Map.of("identifier", email)); String token = proof(email, emailCode.get());
        mvc.perform(post(BASE + "/send-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email)))).andExpect(status().isTooManyRequests());
        waitResend(); postOk(BASE + "/send-otp", Map.of("identifier", email));
        mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", "Invalid123")))).andExpect(status().isBadRequest());
        var c = challenge(); c.setSends(10); c.setSentAt(Instant.now().minusSeconds(61)); challenges.save(c);
        mvc.perform(post(BASE + "/send-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email)))).andExpect(status().isTooManyRequests());
    }
    @Test void unknownInactiveAndUnverifiedPhonesDoNotReceiveCodes() throws Exception {
        String unknown = postOk(BASE + "/send-otp", Map.of("identifier", "missing@example.test"));
        assertFalse(json.readTree(unknown).path("data").has("userId"));
        user.setPhoneVerifiedAt(null); users.save(user);
        postOk(BASE + "/send-otp", Map.of("identifier", "0912345678"));
        user.setStatus(UserStatus.INACTIVE); users.save(user);
        postOk(BASE + "/send-otp", Map.of("identifier", email));
        verify(mail, never()).send(any(SimpleMailMessage.class)); assertEquals(0, smsCalls.get());
    }
    @Test void profileOtpCannotTargetAnotherAccountAndRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/auth/profile/password-reset/send-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email)))).andExpect(status().isUnauthorized());
        String jwt = login();
        mvc.perform(post("/api/auth/profile/password-reset/send-otp").header("Authorization", "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", "other@example.test")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/profile/password-reset/send-otp").header("Authorization", "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email)))).andExpect(status().isOk());
    }
    @Test void smsFailureRollsBackChallengeWithoutAutomaticRetry() throws Exception {
        smsStatus.set(503);
        mvc.perform(post(BASE + "/send-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", "0912345678")))).andExpect(status().isServiceUnavailable());
        assertEquals(1, smsCalls.get()); assertEquals(0, challenges.count());
    }
    @Test void passwordPolicyAndSamePasswordLeaveProofUsable() throws Exception {
        postOk(BASE + "/send-otp", Map.of("identifier", email)); String token = proof(email, emailCode.get());
        for (String invalid : List.of("short", "OldPass123", "ậ".repeat(30))) {
            mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", invalid)))).andExpect(status().isBadRequest());
        }
        confirm(email, token, "GoodPass123");
    }
    @Test void normalProfileChangeRevokesSessionsAndPreviouslyIssuedResetProof() throws Exception {
        String jwt = login(); postOk(BASE + "/send-otp", Map.of("identifier", email)); String token = proof(email, emailCode.get());
        mvc.perform(put("/api/auth/change-password").header("Authorization", "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("oldPassword", "OldPass123", "newPassword", "ProfileNew123")))).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwt)).andExpect(status().isUnauthorized());
        mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", "Replay123")))).andExpect(status().isBadRequest());
    }
    @Test void concurrentConfirmationHasExactlyOneWinner() throws Exception {
        postOk(BASE + "/send-otp", Map.of("identifier", email)); String token = proof(email, emailCode.get());
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try {
            var jobs = new ArrayList<java.util.concurrent.Future<Integer>>();
            for (String password : List.of("ConcurrentOne123", "ConcurrentTwo123")) jobs.add(executor.submit(() -> {
                start.await(); return mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", password))))
                        .andReturn().getResponse().getStatus();
            }));
            start.countDown();
            var statuses = List.of(jobs.get(0).get(), jobs.get(1).get());
            assertEquals(1, statuses.stream().filter(status -> status == 200).count());
            assertEquals(1, statuses.stream().filter(status -> status == 400).count());
            assertEquals(1, users.findById(user.getUserId()).orElseThrow().getSessionVersion());
        } finally { executor.shutdownNow(); }
    }
    @Test void authenticatedOtpFlowKeepsGoogleLinkAndRevokesTheCurrentSession() throws Exception {
        user.setAuthProvider("GOOGLE"); user.setGoogleSubject("google-" + UUID.randomUUID()); users.save(user);
        String jwt = login(); String profile = "/api/auth/profile/password-reset";
        mvc.perform(post(profile + "/send-otp").header("Authorization", "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email)))).andExpect(status().isOk());
        String response = mvc.perform(post(profile + "/verify-otp").header("Authorization", "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "code", emailCode.get())))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(response).path("data").path("verificationToken").asString();
        mvc.perform(post(profile + "/confirm").header("Authorization", "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", "GoogleLocal123")))).andExpect(status().isOk());
        var saved = users.findById(user.getUserId()).orElseThrow();
        assertEquals(user.getGoogleSubject(), saved.getGoogleSubject()); assertEquals(UserRole.USER, saved.getRole());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwt)).andExpect(status().isUnauthorized());
    }
    @Test void emailDeliveryFailureDoesNotCreateUsableProof() throws Exception {
        doThrow(new org.springframework.mail.MailSendException("Simulated delivery failure")).when(mail).send(any(SimpleMailMessage.class));
        mvc.perform(post(BASE + "/send-otp").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("identifier", email)))).andExpect(status().isBadGateway());
        assertEquals(0, challenges.count());
    }
    @Test void malformedOtpProofAndOversizedPasswordAreRejectedBeforeEncoding() throws Exception {
        for (String token : List.of("not-a-proof", "ậ".repeat(36), "x".repeat(100)))
            mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("identifier", email, "verificationToken", token, "newPassword", "SafePass123"))))
                    .andExpect(status().isBadRequest());
        mvc.perform(post(BASE + "/verify-otp").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("identifier", email, "code", "12x456")))).andExpect(status().isBadRequest());
        assertTrue(encoder.matches("OldPass123", users.findById(user.getUserId()).orElseThrow().getPasswordHash()));
    }
    @Test void legacyPhoneRegistrationWithoutVerificationTimestampCanRecoverUsingItsOriginalPhone() throws Exception {
        user.setEmail("0912345678@hlrcs.user"); user.setPhoneVerifiedAt(null); users.save(user);
        postOk(BASE + "/send-otp", Map.of("identifier", "0912345678"));
        assertEquals(1, smsCalls.get());
        confirm("0912345678", proof("0912345678", smsCode.get()), "LegacyPhone123");
        assertTrue(encoder.matches("LegacyPhone123", users.findById(user.getUserId()).orElseThrow().getPasswordHash()));
    }
    @Test void phoneRegistrationRecordsItsExistingOtpProofAsVerifiedPhoneMetadata() throws Exception {
        String phone = "035" + String.format("%07d", user.getUserId());
        String token = UUID.randomUUID().toString();
        String key = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(phone.getBytes(StandardCharsets.UTF_8)));
        var registration = new org.hlrcs.entity.RegistrationOtp(key);
        registration.setSecretHash(encoder.encode(token)); registration.setVerified(true);
        registration.setSentAt(Instant.now()); registration.setExpiresAt(Instant.now().plusSeconds(300));
        registrationChallenges.saveAndFlush(registration);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("phoneNumber", phone, "fullName", "Phone registration", "password", "Register123", "verificationToken", token))))
                .andExpect(status().isCreated());
        var saved = users.findByPhoneNumber(phone).orElseThrow();
        assertNotNull(saved.getPhoneVerifiedAt()); assertEquals(UserRole.USER, saved.getRole());
        // Registration proof belongs to another purpose and cannot reset the new account's password.
        mvc.perform(post(BASE + "/confirm").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("identifier", phone, "verificationToken", token, "newPassword", "Purpose123"))))
                .andExpect(status().isBadRequest());
    }
}
