package org.hlrcs.security;

import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;

@Component
public class GoogleTokenVerifier {

    private final String clientId;
    private final JwtDecoder decoder;

    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId.trim();
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.decoder = NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .restOperations(new RestTemplate(requestFactory))
                .build();
    }

    public GoogleUserInfo verifyToken(String idToken) {
        if (clientId.isEmpty()) {
            throw new AppException("Đăng nhập Google chưa được cấu hình.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        try {
            Jwt jwt = decoder.decode(idToken);
            String issuer = jwt.getClaimAsString("iss");
            String email = jwt.getClaimAsString("email");
            String subject = jwt.getSubject();

            if (("https://accounts.google.com".equals(issuer) || "accounts.google.com".equals(issuer))
                    && jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                    && (jwt.getAudience().size() == 1 || clientId.equals(jwt.getClaimAsString("azp")))
                    && jwt.getExpiresAt() != null && jwt.getExpiresAt().isAfter(Instant.now())
                    && Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))
                    && email != null && email.contains("@") && email.length() <= 255
                    && subject != null && !subject.isBlank() && subject.length() <= 255) {
                return new GoogleUserInfo(subject, email, jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"));
            }
        } catch (JwtException | IllegalArgumentException ex) {
            // Reject invalid credentials without logging token contents.
        }
        throw new AppException("Thông tin xác thực Google không hợp lệ hoặc đã hết hạn.", HttpStatus.UNAUTHORIZED);
    }
}
