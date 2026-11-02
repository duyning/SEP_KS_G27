package org.hlrcs.configuration;

import lombok.RequiredArgsConstructor;
import org.hlrcs.service.AutomaticVerificationAssignment;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.transaction.event.*;

@Configuration @EnableScheduling @RequiredArgsConstructor
public class AutomaticAssignmentConfiguration implements ApplicationRunner {
    private final AutomaticVerificationAssignment assignment;
    @Override public void run(ApplicationArguments args) { assignment.initialize(); }

    @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
    public void submitted(AutomaticVerificationAssignment.Submitted event) { assignment.tryAssign(event.registrationId()); }

    @Scheduled(initialDelayString="${app.verification.auto-assignment.initial-delay-ms:30000}",
        fixedDelayString="${app.verification.auto-assignment.retry-delay-ms:60000}")
    public void retryWaiting() { assignment.retryWaiting(); }
}
