package org.hlrcs;

import org.hlrcs.service.RegistrationContact;
import org.hlrcs.service.RegistrationOtpSender;
import org.hlrcs.service.RegistrationOtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.concurrent.atomic.AtomicReference;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;

abstract class RegistrationOtpTestSupport {
    @Autowired RegistrationOtpService registrationOtp;
    @MockitoBean RegistrationOtpSender registrationOtpSender;

    AtomicReference<String> captureCode(String identifier) {
        var code = new AtomicReference<String>();
        doAnswer(invocation -> {
            code.set(invocation.getArgument(1));
            return null;
        }).when(registrationOtpSender).send(eq(RegistrationContact.parse(identifier)), anyString());
        return code;
    }

    String verifyContact(String identifier) {
        var code = captureCode(identifier);
        registrationOtp.send(identifier);
        return registrationOtp.verify(identifier, code.get()).verificationToken();
    }
}
