package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;

/** Network assessment runs outside the approval transaction; revision checks serialize with staff/cancel. */
@Component
@RequiredArgsConstructor
@Slf4j
public class ServiceAutoReviewWorker {
    private final GeminiCommunityScanner scanner;
    private final ServiceRegistrationRepository registrations;
    private final UserRepository users;
    private final ModerationLogRepository logs;
    private final ServiceReviewService reviews;
    private final PasswordEncoder passwords;
    private final TransactionTemplate transactions;
    private final tools.jackson.databind.ObjectMapper json;
    @Value("${service.ai.auto-review.enabled:false}") private boolean enabled;
    record Snapshot(Integer id, int revision, boolean deletion, String context, List<ServiceImage> images) {}

    @Scheduled(scheduler = "serviceAiScheduler", initialDelayString = "${service.ai.auto-review.initial-delay-ms:30000}", fixedDelayString = "${service.ai.auto-review.delay-ms:60000}")
    public void run() {
        if (!enabled) return;
        boolean aiConfigured = scanner.configured();
        var snapshots = transactions.execute(status -> registrations.findAllByOrderByRegistrationIdDesc().stream()
                .filter(r -> r.getStatus() == RegistrationStatus.PENDING && ("DELETE".equals(r.getOperation()) && r.getTargetService() != null
                        || aiConfigured && r.getTargetService() == null && (r.getOperation() == null || "CREATE".equals(r.getOperation()))))
                .filter(r -> "DELETE".equals(r.getOperation()) || logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION", r.getRegistrationId()).stream()
                        .noneMatch(l -> "AI_HUMAN_REVIEW".equals(l.getAction()) && l.getNote().startsWith("Revision " + r.getRevision() + ":")))
                .sorted(Comparator.comparing(ServiceRegistration::getRegistrationId)).limit(3).map(this::snapshot).toList());
        if (snapshots == null) return;
        for (var snapshot : snapshots) {
            try {
                if (snapshot.deletion()) {
                    Integer actorId = transactions.execute(status -> reviewer().getUserId());
                    reviews.approveAutomatically(snapshot.id(), snapshot.revision(), "Hệ thống tự động duyệt yêu cầu xóa dịch vụ của nhà cung cấp.", actorId);
                    continue;
                }
                if (snapshot.images().isEmpty()) continue;
                var answer = scanner.assessService(snapshot.context(), snapshot.images());
                String decision = answer.path("decision").asText(), reason = answer.path("reason").asText().trim();
                if (!Set.of("APPROVE", "HUMAN_REVIEW").contains(decision) || reason.length() < 10 || reason.length() > 1600) continue;
                Integer actorId = transactions.execute(status -> reviewer().getUserId());
                String note = "AI (" + scanner.modelName() + "): " + reason;
                if ("APPROVE".equals(decision)) reviews.approveAutomatically(snapshot.id(), snapshot.revision(), note, actorId);
                else transactions.executeWithoutResult(status -> {
                    var row = registrations.findForReview(snapshot.id()).orElseThrow();
                    if (row.getStatus() == RegistrationStatus.PENDING && row.getRevision() == snapshot.revision())
                        logs.save(ModerationLog.builder().staff(users.findById(actorId).orElseThrow()).targetType("SERVICE_REGISTRATION")
                                .targetId(row.getRegistrationId()).action("AI_HUMAN_REVIEW")
                                .note("Revision " + snapshot.revision() + ": " + note).build());
                });
            } catch (InterruptedException ex) { Thread.currentThread().interrupt(); return; }
            catch (Exception ex) { log.warn("Service AI review deferred for application {} ({})", snapshot.id(), ex.getClass().getSimpleName()); }
        }
    }

    private User reviewer() {
        return users.findByEmail("service-review-ai@system.invalid").orElseGet(() -> users.save(User.builder()
                .email("service-review-ai@system.invalid").fullName("AI xét duyệt dịch vụ")
                .passwordHash(passwords.encode(UUID.randomUUID().toString() + UUID.randomUUID()))
                .role(UserRole.USER).status(UserStatus.ACTIVE).build()));
    }

    private Snapshot snapshot(ServiceRegistration r) {
        if ("DELETE".equals(r.getOperation())) return new Snapshot(r.getRegistrationId(), r.getRevision(), true, "", List.of());
        var fields = new LinkedHashMap<String, Object>();
        fields.put("serviceName", r.getServiceName()); fields.put("category", r.getCategory().getName());
        fields.put("description", r.getDescription()); fields.put("pricingType", r.getPricingType());
        fields.put("price", r.getPrice()); fields.put("priceUnit", r.getPriceUnit());
        fields.put("serviceArea", r.getServiceArea()); fields.put("customServiceAreas", r.getCustomServiceAreas());
        var images = new ArrayList<ServiceImage>();
        for (int index = 0; index < r.imageCount(); index++) {
            var image = r.imageAt(index);
            images.add(new ServiceImage(image.getContent().clone(), image.getContentType()));
        }
        return new Snapshot(r.getRegistrationId(), r.getRevision(), false, json.writeValueAsString(fields), images);
    }
}
