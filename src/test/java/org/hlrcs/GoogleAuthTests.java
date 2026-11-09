package org.hlrcs;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.UserRole;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.security.GoogleTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.google.client-id=test-client")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GoogleAuthTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository users;
    @Autowired private GoogleTokenVerifier verifier;
    private KeyPair keys;
    private String subject;
    private String email;

    @BeforeEach
    void setUp() throws Exception {
        keys = KeyPairGenerator.getInstance("RSA").generateKeyPair();
        var decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) keys.getPublic()).build();
        ReflectionTestUtils.setField(verifier, "decoder", decoder);
        subject = UUID.randomUUID().toString();
        email = subject + "@gmail.com";
    }

    @Test
    void createsUserWithDefaultRoleAndReusesGoogleSubject() throws Exception {
        String response = googleLogin(token(email, "test-client", true, 300))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.fullName").value("Người dùng Google"))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andReturn().getResponse().getContentAsString();

        User account = users.findByGoogleSubject(subject).orElseThrow();
        assertEquals(UserRole.USER, account.getRole());
        assertEquals("GOOGLE", account.getAuthProvider());

        String accessToken = objectMapper.readTree(response).path("data").path("accessToken").asString();
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("USER"));

        account.setRole(UserRole.ROOM_HOST);
        users.save(account);
        googleLogin(token("changed-" + email, "test-client", true, 300))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(account.getUserId()))
                .andExpect(jsonPath("$.data.role").value("ROOM_HOST"));
    }

    @Test
    void rejectsUnlinkedEmailAndInactiveAccount() throws Exception {
        User account = users.save(User.builder()
                .email(email).passwordHash("existing-hash").role(UserRole.STAFF).status(UserStatus.ACTIVE)
                .build());
        String token = token(email, "test-client", true, 300);
        googleLogin(token).andExpect(status().isConflict());

        account.setGoogleSubject(subject);
        account.setStatus(UserStatus.INACTIVE);
        users.save(account);
        googleLogin(token).andExpect(status().isForbidden());
    }

    @Test
    void rejectsForgedAndInvalidCredentials() throws Exception {
        googleLogin("").andExpect(status().isBadRequest());
        googleLogin("test:" + email).andExpect(status().isUnauthorized());
        googleLogin("oauth2-redirect:" + email).andExpect(status().isUnauthorized());
        googleLogin(token(email, "other-client", true, 300)).andExpect(status().isUnauthorized());
        googleLogin(token(email, "test-client", false, 300)).andExpect(status().isUnauthorized());
        googleLogin(token(email, "test-client", true, -300)).andExpect(status().isUnauthorized());

        String signed = token(email, "test-client", true, 300);
        int signatureStart = signed.lastIndexOf('.') + 1;
        String forged = signed.substring(0, signatureStart)
                + (signed.charAt(signatureStart) == 'A' ? 'B' : 'A') + signed.substring(signatureStart + 1);
        googleLogin(forged).andExpect(status().isUnauthorized());
        org.junit.jupiter.api.Assertions.assertFalse(users.existsByEmail(email));
    }

    private org.springframework.test.web.servlet.ResultActions googleLogin(String idToken) throws Exception {
        return mockMvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("idToken", idToken, "role", "ADMIN"))));
    }

    private String token(String email, String audience, boolean verified, long expiresInSeconds) throws Exception {
        var claims = new JWTClaimsSet.Builder()
                .issuer("https://accounts.google.com")
                .audience(audience)
                .subject(subject)
                .expirationTime(Date.from(Instant.now().plusSeconds(expiresInSeconds)))
                .claim("email", email)
                .claim("email_verified", verified)
                .claim("name", "Người dùng Google")
                .build();
        var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).type(JOSEObjectType.JWT).build(), claims);
        jwt.sign(new RSASSASigner(keys.getPrivate()));
        return jwt.serialize();
    }
}
