package org.hlrcs.repository;

import org.hlrcs.entity.PropertyRegistration;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyRegistrationRepository extends JpaRepository<PropertyRegistration, Integer> {
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
