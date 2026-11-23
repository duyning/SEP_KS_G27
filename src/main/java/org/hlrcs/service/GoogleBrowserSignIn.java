package org.hlrcs.service;

import org.hlrcs.exception.AppException;
import org.hlrcs.security.GoogleTokenVerifier;
import org.hlrcs.security.GoogleUserInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class GoogleBrowserSignIn {
    public record Attempt(String id, String proof) {}
    public record BrowserOptions(String clientId) {}
    public record Confirmation(String code) {}

    private static final Duration LIFETIME = Duration.ofMinutes(5);
    private static final int CAPACITY = 256;
    private static final int MAX_TRIES = 5;
    private final Map<String, Pending> attempts = new HashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final GoogleTokenVerifier verifier;
    private final String origin;
    private final String clientId;

    private static final class Pending {
        final String proof;
        final Instant expiresAt = Instant.now().plus(LIFETIME);
        int checks;
        int codeChecks;
        String code;
        GoogleUserInfo user;

        Pending(String proof) { this.proof = proof; }
    }

    public GoogleBrowserSignIn(GoogleTokenVerifier verifier,
                               @Value("${app.google.mobile-browser-origin:}") String origin,
                               @Value("${app.google.client-id:}") String clientId) {
        this.verifier = verifier;
        this.origin = origin.trim().replaceFirst("/$", "");
        this.clientId = clientId.trim();
    }

    public synchronized Attempt begin() {
        if (!isHttpsOrigin(origin) || clientId.isEmpty()) {
            throw new AppException("Chưa cấu hình địa chỉ HTTPS cho đăng nhập Google trên Expo Go.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        attempts.values().removeIf(attempt -> !attempt.expiresAt.isAfter(Instant.now()));
        if (attempts.size() >= CAPACITY) {
            throw new AppException("Đăng nhập Google đang bận. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS);
        }
        String id = randomToken();
        String proof = randomToken();
        attempts.put(id, new Pending(proof));
        return new Attempt(id, proof);
    }

    public synchronized BrowserOptions options(String browserOrigin, String id) {
        requireBrowserOrigin(browserOrigin);
        active(id);
        return new BrowserOptions(clientId);
    }

    public Confirmation complete(String browserOrigin, String id, String token) {
        requireBrowserOrigin(browserOrigin);
        final Pending pending;
        synchronized (this) {
            pending = active(id);
            if (pending.user != null || pending.checks >= MAX_TRIES) throw expired();
            pending.checks++;
        }
        // Never hold the lock while the verifier fetches Google's public signing keys.
        GoogleUserInfo user = verifier.verifyToken(token, id);
        synchronized (this) {
            if (active(id) != pending || pending.user != null) throw expired();
            pending.user = user;
            pending.code = String.format(Locale.ROOT, "%08d", random.nextInt(100_000_000));
            return new Confirmation(pending.code);
        }
    }

    public synchronized GoogleUserInfo redeem(String id, String proof, String code) {
        Pending pending = active(id);
        if (!equal(pending.proof, proof)) throw expired();
        if (pending.user == null) {
            throw new AppException("Hãy lấy mã xác nhận trong trình duyệt trước.", HttpStatus.CONFLICT);
        }
        if (!equal(pending.code, code)) {
            if (++pending.codeChecks >= MAX_TRIES) {
                attempts.remove(id);
                throw expired();
            }
            throw new AppException("Mã xác nhận chưa đúng.", HttpStatus.BAD_REQUEST);
        }
        attempts.remove(id);
        return pending.user;
    }

    private void requireBrowserOrigin(String browserOrigin) {
        if (!isHttpsOrigin(origin) || !origin.equals(browserOrigin)) {
            throw new AppException("Địa chỉ đăng nhập chưa được cấu hình.", HttpStatus.FORBIDDEN);
        }
    }

    private Pending active(String id) {
        Pending pending = attempts.get(id);
        if (pending != null && pending.expiresAt.isAfter(Instant.now())) return pending;
        attempts.remove(id);
        throw expired();
    }

    private static AppException expired() {
        return new AppException("Phiên xác nhận Google đã hết hạn. Vui lòng bắt đầu lại.", HttpStatus.GONE);
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static boolean equal(String first, String second) {
        return MessageDigest.isEqual(first.getBytes(StandardCharsets.UTF_8), second.getBytes(StandardCharsets.UTF_8));
    }

    private static boolean isHttpsOrigin(String value) {
        try {
            URI uri = URI.create(value);
            return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getRawUserInfo() == null &&
                    uri.getRawQuery() == null && uri.getRawFragment() == null && uri.getPath().isEmpty();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
