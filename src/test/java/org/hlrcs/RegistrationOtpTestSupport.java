package org.hlrcs;

import org.hlrcs.service.RegistrationContact;
import org.hlrcs.service.PhoneOtpProvider;
import org.hlrcs.service.RegistrationOtpSender;
import org.hlrcs.service.RegistrationOtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.concurrent.atomic.AtomicReference;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;

abstract class RegistrationOtpTestSupport {
    @Autowired RegistrationOtpService registrationOtp;
    @MockitoBean RegistrationOtpSender registrationOtpSender;
    @MockitoBean PhoneOtpProvider registrationPhoneSender;
    @Autowired PasswordEncoder registrationEncoder;

    AtomicReference<String> captureCode(String identifier) {
        var code = new AtomicReference<String>();
        var contact = RegistrationContact.parse(identifier);
        if (contact.phone()) {
            org.mockito.Mockito.when(registrationPhoneSender.send("+" + contact.internationalPhone())).thenAnswer(invocation -> {
                String value = String.format(java.util.Locale.ROOT, "%06d", new java.security.SecureRandom().nextInt(1_000_000));
                code.set(value);
                return new PhoneOtpProvider.SentOtp(java.util.UUID.randomUUID().toString(), registrationEncoder.encode(value));
            });
            return code;
        }
        doAnswer(invocation -> {
            code.set(invocation.getArgument(1));
            return null;
        }).when(registrationOtpSender).sendEmail(eq(contact.identifier()), anyString());
        return code;
    }

    String verifyContact(String identifier) {
        var code = captureCode(identifier);
        registrationOtp.send(identifier);
        return registrationOtp.verify(identifier, code.get()).verificationToken();
    }
}
