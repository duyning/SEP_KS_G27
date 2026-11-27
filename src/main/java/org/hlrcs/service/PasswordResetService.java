package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.PasswordResetChallenge;
import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.FieldValidationException;
import org.hlrcs.repository.PasswordResetChallengeRepository;
import org.hlrcs.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.Duration;
import java.util.*;

@Service @RequiredArgsConstructor
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final PasswordResetChallengeRepository challenges;
    private final UserRepository users;
    private final RegistrationOtpSender emailSender;
    private final PhoneOtpProvider phoneSender;
    private final PasswordEncoder encoder;

    public record Sent(Instant resendAt, Instant expiresAt, String channel, String message) {}
    public record Verified(String verificationToken, Instant expiresAt) {}

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Sent send(String identifier, Integer expectedUserId) {
        var contact = contact(identifier);
        var user = account(contact, expectedUserId);
        var now = Instant.now();
        var challenge = challenges.findLocked(key(contact)).orElseGet(() -> new PasswordResetChallenge(key(contact)));
        if (challenge.getSentAt() != null && now.isBefore(challenge.getSentAt().plusSeconds(60)))
            throw new AppException("Vui lòng chờ 60 giây giữa hai lần gửi mã.", HttpStatus.TOO_MANY_REQUESTS);
        if (challenge.getWindowStart() == null || !now.isBefore(challenge.getWindowStart().plusSeconds(86400))) {
            challenge.setWindowStart(now); challenge.setSends(0);
        }
        if (challenge.getSends() >= 10)
            throw new AppException("Đã đạt giới hạn 10 lần gửi mã trong 24 giờ. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS);
        String previousReference = challenge.getProviderReference();
        int attempts = challenge.getFailedAttempts();
        challenge.setUserId(user == null ? null : user.getUserId());
        challenge.setSessionVersion(user == null ? 0 : user.getSessionVersion());
        challenge.setSentAt(now); challenge.setExpiresAt(now.plusSeconds(300));
        challenge.setVerified(false); challenge.setSecretHash(null); challenge.setProviderReference(null);
        challenge.setSends(challenge.getSends() + 1);
        try { challenges.saveAndFlush(challenge); }
        catch (DataIntegrityViolationException ex) {
            throw new AppException("Yêu cầu đang được xử lý. Vui lòng chờ rồi gửi lại mã.", HttpStatus.TOO_MANY_REQUESTS);
        }
        String reference = null;
        String hash;
        if (user != null && contact.phone()) {
            var sent = phoneSender.send("+" + contact.internationalPhone());
            reference = sent.reference(); hash = sent.codeHash();
        } else {
            String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
            hash = encoder.encode(code);
            if (user != null) emailSender.sendPasswordResetEmail(contact.identifier(), code);
        }
        challenge.setSecretHash(hash); challenge.setProviderReference(reference);
        challenge.setFailedAttempts(reference != null && reference.equals(previousReference) ? attempts : 0);
        // Unknown, disabled and ineligible accounts receive the same successful envelope.
        return new Sent(now.plusSeconds(60), challenge.getExpiresAt(), contact.phone() ? "SMS" : "EMAIL",
                "Nếu thông tin khớp tài khoản đang hoạt động, mã xác minh sẽ được gửi. Dùng SĐT đăng ký hoặc đã xác minh.");
    }

    @Transactional(noRollbackFor = FieldValidationException.class)
    public Verified verify(String identifier, String code, Integer expectedUserId) {
        var contact = contact(identifier);
        var user = account(contact, expectedUserId);
        var challenge = challenges.findLocked(key(contact)).orElse(null);
        if (!bound(challenge, user) || challenge.isVerified() || challenge.getFailedAttempts() >= 5) throw invalidCode();
        boolean valid = challenge.getSecretHash() != null ? encoder.matches(code, challenge.getSecretHash())
                : challenge.getProviderReference() != null && phoneSender.check(challenge.getProviderReference(), code);
        if (!valid) {
            challenge.setFailedAttempts(challenge.getFailedAttempts() + 1);
            throw invalidCode();
        }
        String token = UUID.randomUUID().toString();
        challenge.setSecretHash(encoder.encode(token)); challenge.setProviderReference(null);
        challenge.setVerified(true); challenge.setExpiresAt(Instant.now().plusSeconds(600));
        return new Verified(token, challenge.getExpiresAt());
    }

    @Transactional
    public void confirm(String identifier, String token, String password, Integer expectedUserId) {
        PasswordRules.validate(password);
        var contact = contact(identifier);
        var user = account(contact, expectedUserId);
        var challenge = challenges.findLocked(key(contact)).orElse(null);
        if (!bound(challenge, user) || !challenge.isVerified() || challenge.getSecretHash() == null
                || !encoder.matches(token, challenge.getSecretHash()))
            throw new FieldValidationException("verificationToken", "Phiên xác minh đã hết hạn hoặc đã dùng. Vui lòng yêu cầu mã mới.");
        if (encoder.matches(password, user.getPasswordHash()))
            throw new FieldValidationException("newPassword", "Mật khẩu mới phải khác mật khẩu hiện tại.");
        user.setPasswordHash(encoder.encode(password));
        user.setSessionVersion(user.getSessionVersion() + 1);
        users.save(user);
        challenge.setSecretHash(null); challenge.setProviderReference(null);
        challenge.setVerified(false); challenge.setExpiresAt(Instant.now());
    }

    // All paths lock the account before its challenge, including authenticated password changes.
    private User account(RegistrationContact contact, Integer expectedUserId) {
        var matches = contact.phone() ? users.findByPhoneNumberIn(contact.phoneVariants())
                : users.findAllByEmailIgnoreCase(contact.identifier());
        var candidate = matches.size() == 1 ? matches.get(0) : null;
        var user = candidate == null ? null : users.findForRegistrationUpdate(candidate.getUserId()).orElse(null);
        if (expectedUserId != null && (user == null || !expectedUserId.equals(user.getUserId())))
            throw new FieldValidationException("identifier", "Chọn email hoặc SĐT đã xác minh của tài khoản đang đăng nhập.");
        if (user == null || user.getStatus() != UserStatus.ACTIVE) return null;
        // Recheck destination after obtaining the lock, so a concurrent profile update cannot bind another contact.
        if (contact.phone()) {
            boolean phoneRegistration = contact.accountEmail().equalsIgnoreCase(user.getEmail())
                    || ("+" + contact.internationalPhone() + "@hlrcs.user").equalsIgnoreCase(user.getEmail());
            if ((user.getPhoneVerifiedAt() == null && !phoneRegistration)
                    || !contact.phoneVariants().contains(user.getPhoneNumber())) return null;
        } else if (!contact.identifier().equalsIgnoreCase(user.getEmail())) return null;
        return user;
    }

    private boolean bound(PasswordResetChallenge challenge, User user) {
        return challenge != null && user != null && Objects.equals(challenge.getUserId(), user.getUserId())
                && challenge.getSessionVersion() == user.getSessionVersion()
                && challenge.getExpiresAt().isAfter(Instant.now());
    }
    private static FieldValidationException invalidCode() {
        return new FieldValidationException("code", "Mã OTP không đúng, đã hết hạn hoặc đã dùng. Sau 5 lần sai, hãy yêu cầu mã mới.");
    }
    private static RegistrationContact contact(String value) {
        return RegistrationContact.parse(value == null || value.contains("@") ? value : value.replaceAll("[\\s.()-]", ""));
    }
    private static String key(RegistrationContact contact) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(("password-reset:" + contact.identifier()).getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1H") @Transactional
    public void deleteExpired() { challenges.deleteExpiredBefore(Instant.now().minus(Duration.ofDays(1))); }
}
