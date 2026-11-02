package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.*;

/** Internal policy, not a public assignment endpoint. All callers use a transaction. */
@Service @RequiredArgsConstructor
public class PropertyVerificationAccess {
    private final AuthService auth;
    private final UserRepository users;
    private final PropertyRegistrationRepository registrations;
    private final PropertyRepository properties;
    private final jakarta.persistence.EntityManager entityManager;

    public User actor() {
        var actor = auth.getCurrentUser();
        if (actor.getStatus() != UserStatus.ACTIVE || !Set.of(UserRole.STAFF, UserRole.ADMIN).contains(actor.getRole()))
            throw new AppException("Không có quyền truy cập nghiệp vụ xác minh.", HttpStatus.FORBIDDEN);
        return actor;
    }
    public List<PropertyRegistration> list() {
        var actor = actor();
        return actor.getRole() == UserRole.ADMIN ? registrations.findAllByOrderByCreatedAtDesc() : registrations.findAssigned(actor.getUserId());
    }
    public PropertyRegistration read(Integer id) {
        var actor = actor();
        return (actor.getRole() == UserRole.ADMIN ? registrations.findById(id) : registrations.findAssignedById(id, actor.getUserId()))
            .orElseThrow(this::missing);
    }
    private boolean adminAuthority() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream().anyMatch(value -> "ROLE_ADMIN".equals(value.getAuthority()));
    }
    /** Operation eligibility is independent of assignment and conflicts of interest. */
    public User reviewActor() {
        var actor = actor();
        if (actor.getRole() != UserRole.STAFF || adminAuthority())
            throw new AppException("Admin chỉ được giám sát hồ sơ xác minh; chỉ Staff hợp lệ được xét duyệt.", HttpStatus.FORBIDDEN);
        return actor;
    }
    public boolean conflict(PropertyRegistration row, Integer staffId) {
        return row.getUser().getUserId().equals(staffId) || properties.findByOwner_UserIdOrderByPropertyIdAsc(staffId).stream()
            .anyMatch(p -> Objects.equals(p.getPropertyId(), row.getTargetPropertyId()) || p.getRegistration() != null && Objects.equals(p.getRegistration().getRegistrationId(), row.getRegistrationId()));
    }
    public void decision(PropertyRegistration locked, Long expectedVersion) {
        var current = reviewActor();
        // Lock fresh account state too: disabling/role changes cannot race the save.
        var staff = users.findForRegistrationUpdate(current.getUserId()).orElseThrow(this::missing);
        entityManager.refresh(staff, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (staff.getRole() != UserRole.STAFF || staff.getStatus() != UserStatus.ACTIVE || locked.getAssignedStaff() == null
                || !locked.getAssignedStaff().getUserId().equals(staff.getUserId()) || conflict(locked, staff.getUserId())) throw missing();
        if (expectedVersion == null || expectedVersion != locked.getAssignmentVersion())
            throw new AppException("Phân công hồ sơ đã thay đổi. Vui lòng tải lại trước khi xét duyệt.", HttpStatus.CONFLICT);
        // All outcomes, including rejection/supplement, need trustworthy current ownership.
        var linked = locked.getTargetPropertyId() == null ? properties.findByRegistration_RegistrationId(locked.getRegistrationId()).orElse(null) : null;
        Integer propertyId = locked.getTargetPropertyId() != null ? locked.getTargetPropertyId() : linked == null ? null : linked.getPropertyId();
        if (propertyId != null) {
            var property = properties.findForVerificationReview(propertyId).orElseThrow(this::uncertainOwnership);
            entityManager.refresh(property, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (property.getOwner() == null || property.getOwner().getUserId() == null) throw uncertainOwnership();
            if (property.getOwner().getUserId().equals(staff.getUserId())) throw missing();
            if (!property.getOwner().getUserId().equals(locked.getUser().getUserId())) throw uncertainOwnership();
            if (locked.getTargetPropertyId() != null && (locked.getBaseRegistrationId() == null || property.getRegistration() == null
                    || !Objects.equals(locked.getBaseRegistrationId(), property.getRegistration().getRegistrationId()))) throw uncertainOwnership();
        } else if (locked.getBaseRegistrationId() != null) throw uncertainOwnership();
    }
    public boolean canReview(PropertyRegistration row) {
        var actor = actor();
        if (actor.getRole() != UserRole.STAFF || adminAuthority() || row.getAssignedStaff() == null
                || !row.getAssignedStaff().getUserId().equals(actor.getUserId()) || conflict(row, actor.getUserId())
                || !Set.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT).contains(row.getStatus())) return false;
        if (row.getTargetPropertyId() == null) return row.getBaseRegistrationId() == null && properties.findByRegistration_RegistrationId(row.getRegistrationId())
            .map(p -> p.getOwner() != null && p.getOwner().getUserId().equals(row.getUser().getUserId())).orElse(true);
        return properties.findById(row.getTargetPropertyId()).filter(p -> p.getOwner() != null && p.getRegistration() != null
            && p.getOwner().getUserId().equals(row.getUser().getUserId()) && Objects.equals(row.getBaseRegistrationId(),p.getRegistration().getRegistrationId())).isPresent();
    }
    private AppException uncertainOwnership() { return new AppException("Không đủ dữ liệu sở hữu hoặc phiên bản nhà trọ đã thay đổi. Vui lòng kiểm tra lại hồ sơ trước khi xét duyệt.", HttpStatus.CONFLICT); }
    private ResourceNotFoundException missing() { return new ResourceNotFoundException("Không tìm thấy hồ sơ xác minh hoặc bạn không còn được phân công."); }
}
