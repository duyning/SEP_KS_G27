package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.Objects;

/** Explicit development/test provisioning only. No controller or applicant input calls this. */
@Service @RequiredArgsConstructor
@Profile("(assignment-dev | test) & !prod & !production")
public class DevelopmentVerificationAssignments {
    private final PropertyRegistrationRepository registrations;
    private final PropertyAssignmentEventRepository events;
    private final UserRepository users;
    private final PropertyVerificationAccess policy;
    private final jakarta.persistence.EntityManager entityManager;
    public record Command(Integer registrationId, long expectedVersion, Integer expectedStaffId, Integer newStaffId) {}

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void apply(Command command, String operator) {
        if (command.registrationId() == null || command.expectedVersion() < 0 || operator == null || !operator.matches("[a-zA-Z0-9_.@-]{1,65}"))
            throw new BadRequestException("Phân công phát triển thiếu định danh hoặc phiên bản hợp lệ.");
        var ownerId = registrations.findOwnerId(command.registrationId()).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ."));
        users.findForRegistrationUpdate(ownerId).orElseThrow();
        var row = registrations.findForReview(command.registrationId()).orElseThrow();
        entityManager.refresh(row, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        var old = row.getAssignedStaff() == null ? null : row.getAssignedStaff().getUserId();
        var actor = "SYSTEM:assignment-dev:" + operator;
        // Repeating the very same successful command is a no-op, not a new assignment.
        if (row.getAssignmentVersion() == command.expectedVersion() + 1 && Objects.equals(old, command.newStaffId())) {
            var prior = events.findByRegistration_RegistrationIdOrderByAssignmentVersionAsc(row.getRegistrationId());
            if (!prior.isEmpty()) {
                var last = prior.get(prior.size()-1);
                if (last.getAssignmentVersion() == row.getAssignmentVersion() && Objects.equals(last.getActor(), actor)
                        && Objects.equals(last.getPreviousStaffId(), command.expectedStaffId()) && Objects.equals(last.getNewStaffId(), command.newStaffId())) return;
            }
        }
        if (row.getAssignmentVersion() != command.expectedVersion() || !Objects.equals(old, command.expectedStaffId()))
            throw new AppException("Phân công đã thay đổi; không ghi đè cấu hình cũ.", HttpStatus.CONFLICT);
        if (Objects.equals(old, command.newStaffId())) throw new BadRequestException("Lệnh không thay đổi phân công.");
        User next = null;
        if (command.newStaffId() != null) {
            next = users.findForRegistrationUpdate(command.newStaffId()).orElseThrow(() -> new BadRequestException("Không tìm thấy Staff."));
            entityManager.refresh(next, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (next.getRole() != UserRole.STAFF || next.getStatus() != UserStatus.ACTIVE || policy.conflict(row, next.getUserId()))
                throw new BadRequestException("Chỉ phân công cho Staff đang hoạt động, không sở hữu/quản lý hoặc nộp hồ sơ.");
        }
        row.setAssignedStaff(next);
        row.setAssignmentVersion(row.getAssignmentVersion() + 1);
        registrations.saveAndFlush(row);
        events.saveAndFlush(PropertyAssignmentEvent.builder().registration(row).assignmentVersion(row.getAssignmentVersion())
            .previousStaffId(old).newStaffId(command.newStaffId()).actor(actor)
            .action(next == null ? "REVOKED" : old == null ? "ASSIGNED" : "TRANSFERRED").build());
    }
}
