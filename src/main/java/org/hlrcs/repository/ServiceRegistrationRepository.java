package org.hlrcs.repository;

import org.hlrcs.entity.ServiceRegistration;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceRegistrationRepository extends JpaRepository<ServiceRegistration, Integer> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from ServiceRegistration r where r.registrationId = :id")
    java.util.Optional<ServiceRegistration> findForReview(@org.springframework.data.repository.query.Param("id") Integer id);
    List<ServiceRegistration> findAllByOrderByRegistrationIdDesc();
    List<ServiceRegistration> findByAssignedStaff_UserIdOrderByRegistrationIdDesc(Integer staffId);
    List<ServiceRegistration> findByUser_UserIdOrderByRegistrationIdDesc(Integer userId);
    boolean existsByUser_UserIdAndStatusIn(Integer userId, List<RegistrationStatus> statuses);
}
