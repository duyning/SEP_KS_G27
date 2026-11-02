package org.hlrcs.repository;

import org.hlrcs.entity.PropertyRegistration;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyRegistrationRepository extends JpaRepository<PropertyRegistration, Integer> {
    @org.springframework.data.jpa.repository.Query("select r.registrationId from PropertyRegistration r where r.registrationId>:afterId and r.assignedStaff is null and r.status=org.hlrcs.entity.enums.RegistrationStatus.PENDING order by r.registrationId")
    java.util.List<Integer> findWaitingAssignmentIds(@org.springframework.data.repository.query.Param("afterId") Integer afterId, org.springframework.data.domain.Pageable pageable);
    long countByStatus(RegistrationStatus status);
    long countByAssignedStaffIsNull();
    long countByAssignedStaffIsNullAndStatus(RegistrationStatus status);
    long countByAssignedStaff_UserId(Integer userId);
    long countByAssignedStaff_UserIdAndStatus(Integer userId,RegistrationStatus status);
    interface AssignmentOverview {
        Integer getRegistrationId(); String getName(); String getOwnerName(); String getStatus();
        Integer getAssignedStaffId(); String getAssignedStaffName(); String getAssignedStaffStatus();
        long getAssignmentVersion(); java.time.LocalDateTime getCreatedAt();
    }
    @org.springframework.data.jpa.repository.Query("select r.registrationId as registrationId, r.name as name, u.fullName as ownerName, cast(r.status as string) as status, s.userId as assignedStaffId, s.fullName as assignedStaffName, cast(s.status as string) as assignedStaffStatus, r.assignmentVersion as assignmentVersion, r.createdAt as createdAt from PropertyRegistration r join r.user u left join r.assignedStaff s where (:unassigned=false or (s is null and r.status=org.hlrcs.entity.enums.RegistrationStatus.PENDING)) and (lower(r.name) like :query or lower(coalesce(u.fullName,'')) like :query) order by r.createdAt desc, r.registrationId desc")
    org.springframework.data.domain.Page<AssignmentOverview> findAdminAssignments(@org.springframework.data.repository.query.Param("query") String query, @org.springframework.data.repository.query.Param("unassigned") boolean unassigned, org.springframework.data.domain.Pageable pageable);
    // Shared SQL scope for list, dashboard, private detail and moderation history.
    String ASSIGNED_SCOPE = "r.assignedStaff.userId = :staffId and r.assignedStaff.role = org.hlrcs.entity.enums.UserRole.STAFF "
        + "and r.assignedStaff.status = org.hlrcs.entity.enums.UserStatus.ACTIVE and r.user.userId <> :staffId "
        + "and not exists (select p.propertyId from Property p where (p.registration = r or p.propertyId = r.targetPropertyId) and p.owner.userId = :staffId)";

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "reviewer", "assignedStaff"})
    @org.springframework.data.jpa.repository.Query("select r from PropertyRegistration r where " + ASSIGNED_SCOPE + " order by r.createdAt desc")
    java.util.List<PropertyRegistration> findAssigned(@org.springframework.data.repository.query.Param("staffId") Integer staffId);

    @org.springframework.data.jpa.repository.Query("select r from PropertyRegistration r where r.registrationId = :id and " + ASSIGNED_SCOPE)
    java.util.Optional<PropertyRegistration> findAssignedById(@org.springframework.data.repository.query.Param("id") Integer id, @org.springframework.data.repository.query.Param("staffId") Integer staffId);
    @org.springframework.data.jpa.repository.Query("select r.user.userId from PropertyRegistration r where r.registrationId=:id")
    java.util.Optional<Integer> findOwnerId(@org.springframework.data.repository.query.Param("id") Integer id);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "reviewer"})
    java.util.List<PropertyRegistration> findAllByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from PropertyRegistration r where r.registrationId = :id")
    java.util.Optional<PropertyRegistration> findForReview(@org.springframework.data.repository.query.Param("id") Integer id);
    java.util.List<PropertyRegistration> findByUser_UserIdOrderByCreatedAtDesc(Integer userId);
    java.util.Optional<PropertyRegistration> findFirstByUser_UserIdAndStatusOrderByCreatedAtDesc(Integer userId, RegistrationStatus status);
    long countByUser_UserIdAndStatus(Integer userId, RegistrationStatus status);
}
