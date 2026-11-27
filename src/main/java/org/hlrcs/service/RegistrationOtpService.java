package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.RegistrationOtp;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.FieldValidationException;
import org.hlrcs.repository.RegistrationOtpRepository;
import org.hlrcs.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationOtpService {
    private static final Duration RESEND_DELAY = Duration.ofMinutes(1);
    private static final Duration CODE_LIFETIME = Duration.ofMinutes(5);
    private static final Duration VERIFICATION_LIFETIME = Duration.ofMinutes(10);
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RegistrationOtpRepository repository;
    private final UserRepository users;
    private final RegistrationOtpSender sender;
    private final PhoneOtpProvider phoneSender;
    private final PasswordEncoder encoder;

    public record Sent(int resendAfterSeconds, int expiresInSeconds) {}
    public record Verification(String verificationToken, int expiresInSeconds) {}

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Sent send(String identifier) {
        RegistrationContact contact = RegistrationContact.parse(identifier);
        requireAvailable(contact);
        String key = key(contact);
        RegistrationOtp challenge = repository.findLocked(key).orElseGet(() -> new RegistrationOtp(key));
        Instant now = Instant.now();
        if (challenge.getSentAt() != null && now.isBefore(challenge.getSentAt().plus(RESEND_DELAY))) {
            throw resendTooSoon();
        }

        String previousReference = challenge.isVerified() ? null : challenge.getProviderReference();
        int previousAttempts = challenge.getFailedAttempts();
        challenge.setSecretHash(null);
        challenge.setProviderReference(null);
        challenge.setSentAt(now);
        challenge.setExpiresAt(now.plus(CODE_LIFETIME));
        challenge.setFailedAttempts(0);
        challenge.setVerified(false);
        try {
            // Claim the destination in the database before sending to the provider.
            repository.saveAndFlush(challenge);
        } catch (DataIntegrityViolationException ex) {
            throw resendTooSoon();
        }
        if (contact.phone()) {
            var sent = phoneSender.send("+" + contact.internationalPhone());
            challenge.setSecretHash(sent.codeHash());
            challenge.setProviderReference(sent.reference());
            // Remote providers can reuse a code/reference; resending must not reset its attempt budget.
            if (sent.reference() != null && sent.reference().equals(previousReference) && sent.codeHash() == null)
                challenge.setFailedAttempts(previousAttempts);
        } else {
            String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
            challenge.setSecretHash(encoder.encode(code));
            sender.sendEmail(contact.identifier(), code);
        }
        return new Sent((int) RESEND_DELAY.toSeconds(), (int) CODE_LIFETIME.toSeconds());
    }

    @Transactional(noRollbackFor = FieldValidationException.class)
    public Verification verify(String identifier, String code) {
        RegistrationContact contact = RegistrationContact.parse(identifier);
        RegistrationOtp challenge = repository.findLocked(key(contact)).orElse(null);
        if (!hasLiveSecret(challenge) || challenge.isVerified() || challenge.getFailedAttempts() >= MAX_ATTEMPTS) {
            throw new FieldValidationException("code", "Mã OTP đã hết hạn hoặc đã dùng. Vui lòng gửi mã mới.");
        }
        boolean valid = challenge.getSecretHash() != null ? encoder.matches(code, challenge.getSecretHash())
                : phoneSender.check(challenge.getProviderReference(), code);
        if (!valid) {
            challenge.setFailedAttempts(challenge.getFailedAttempts() + 1);
            if (challenge.getFailedAttempts() >= MAX_ATTEMPTS) {
                challenge.setSecretHash(null);
                throw new FieldValidationException("code", "Bạn đã nhập sai quá nhiều lần. Vui lòng gửi mã mới.");
            }
            throw new FieldValidationException("code", "Mã OTP không đúng.");
        }

        String token = UUID.randomUUID().toString();
        challenge.setSecretHash(encoder.encode(token));
        challenge.setExpiresAt(Instant.now().plus(VERIFICATION_LIFETIME));
        challenge.setVerified(true);
        return new Verification(token, (int) VERIFICATION_LIFETIME.toSeconds());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void consume(RegistrationContact contact, String token) {
        RegistrationOtp challenge = repository.findLocked(key(contact)).orElse(null);
        if (!hasLiveSecret(challenge) || !challenge.isVerified() || !encoder.matches(token, challenge.getSecretHash())) {
            throw new FieldValidationException("verificationToken",
                    "Phiên xác minh không hợp lệ hoặc đã hết hạn. Vui lòng xác minh lại.");
        }
        requireAvailable(contact);
        challenge.setSecretHash(null);
        challenge.setProviderReference(null);
    }

    private void requireAvailable(RegistrationContact contact) {
        boolean taken = users.existsByEmailIgnoreCase(contact.accountEmail());
        if (contact.phone()) {
            String international = contact.internationalPhone();
            taken = taken || users.existsByPhoneNumberIn(contact.phoneVariants())
                    || users.existsByEmailIgnoreCase(international + "@hlrcs.user");
        }
        if (taken) {
            throw new AppException(contact.phone() ? "Số điện thoại đã được sử dụng." : "Email đã được sử dụng.",
                    HttpStatus.CONFLICT);
        }
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1H")
    @Transactional
    public void deleteExpired() {
        repository.deleteExpiredBefore(Instant.now().minus(Duration.ofDays(1)));
    }

    private static String key(RegistrationContact contact) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(contact.identifier().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private static boolean hasLiveSecret(RegistrationOtp challenge) {
        return challenge != null && (challenge.getSecretHash() != null || challenge.getProviderReference() != null)
                && challenge.getExpiresAt().isAfter(Instant.now());
    }

    private static AppException resendTooSoon() {
        return new AppException("Vui lòng chờ 60 giây giữa hai lần gửi mã.", HttpStatus.TOO_MANY_REQUESTS);
    }
}
