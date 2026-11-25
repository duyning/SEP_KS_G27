package org.hlrcs.service;

import org.junit.jupiter.api.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.springframework.transaction.support.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.mockito.Mockito.*;

class ServiceAutoReviewWorkerTest {
    final GeminiCommunityScanner scanner = mock(GeminiCommunityScanner.class);
    final ServiceRegistrationRepository registrations = mock(ServiceRegistrationRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final ModerationLogRepository logs = mock(ModerationLogRepository.class);
    final ServiceReviewService reviews = mock(ServiceReviewService.class);
    final TransactionTemplate tx = mock(TransactionTemplate.class);
    final ObjectMapper json = new ObjectMapper();
    ServiceAutoReviewWorker worker;
    @BeforeEach void setup() {
        worker = new ServiceAutoReviewWorker(scanner, registrations, users, logs, reviews, mock(PasswordEncoder.class), tx, json);
        ReflectionTestUtils.setField(worker, "enabled", true);
        when(scanner.configured()).thenReturn(true); when(scanner.modelName()).thenReturn("test-model");
        when(tx.execute(any())).thenAnswer(invocation -> ((TransactionCallback<?>) invocation.getArgument(0)).doInTransaction(null));
        when(users.findByEmail(anyString())).thenReturn(Optional.of(User.builder().userId(99).build()));
        when(logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(anyString(), anyInt())).thenReturn(List.of());
    }
    ServiceRegistration application(String operation) {
        return ServiceRegistration.builder().registrationId(5).revision(2).operation(operation).status(RegistrationStatus.PENDING)
                .serviceName("Giặt là").description("Giặt quần áo sinh viên").category(ServiceCategory.builder().name("Giặt là").build())
                .imageContent(new byte[]{1}).imageContentType("image/png").build();
    }
    @Test void approvesClearNewApplicationWithCapturedRevision() throws Exception {
        when(registrations.findAllByOrderByRegistrationIdDesc()).thenReturn(List.of(application("CREATE")));
        when(scanner.assessService(anyString(), anyList())).thenReturn(json.readTree("{\"decision\":\"APPROVE\",\"reason\":\"Nội dung và ảnh phù hợp dịch vụ.\"}"));
        worker.run(); verify(reviews).approveAutomatically(eq(5), eq(2), contains("test-model"), eq(99));
    }
    @Test void uncertaintyOrFailureNeverApproves() throws Exception {
        when(registrations.findAllByOrderByRegistrationIdDesc()).thenReturn(List.of(application("CREATE")));
        when(scanner.assessService(anyString(), anyList())).thenReturn(json.readTree("{\"decision\":\"HUMAN_REVIEW\",\"reason\":\"Cần nhân viên kiểm tra nội dung.\"}"));
        worker.run(); verifyNoInteractions(reviews);
        when(scanner.assessService(anyString(), anyList())).thenThrow(new java.io.IOException("failure"));
        worker.run(); verifyNoInteractions(reviews);
    }
    @Test void skipsChangesAndMissingConfiguration() throws Exception {
        when(registrations.findAllByOrderByRegistrationIdDesc()).thenReturn(List.of(application("UPDATE"), application("DELETE")));
        worker.run(); verify(scanner, never()).assessService(anyString(), anyList());
        when(scanner.configured()).thenReturn(false); worker.run(); verifyNoInteractions(reviews);
    }

    @Test void deletionNeedsNeitherAiConfigurationNorImages() throws Exception {
        var row = application("DELETE");
        row.setTargetService(org.hlrcs.entity.Service.builder().serviceId(12).build());
        row.setImageContent(null); row.setCategory(null);
        when(scanner.configured()).thenReturn(false);
        when(registrations.findAllByOrderByRegistrationIdDesc()).thenReturn(List.of(row));
        worker.run();
        verify(reviews).approveAutomatically(eq(5), eq(2), contains("xóa dịch vụ"), eq(99));
        verify(scanner, never()).assessService(anyString(), anyList());
    }
    @Test void cancelledDeletionAndDisabledWorkerNeverApprove() {
        var row = application("DELETE");
        row.setTargetService(org.hlrcs.entity.Service.builder().serviceId(12).build());
        row.setStatus(RegistrationStatus.CANCELLED);
        when(registrations.findAllByOrderByRegistrationIdDesc()).thenReturn(List.of(row));
        worker.run();
        row.setStatus(RegistrationStatus.PENDING);
        ReflectionTestUtils.setField(worker, "enabled", false);
        worker.run();
        verifyNoInteractions(reviews);
    }
}
