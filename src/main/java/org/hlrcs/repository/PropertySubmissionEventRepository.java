package org.hlrcs.repository;
import org.hlrcs.entity.PropertySubmissionEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PropertySubmissionEventRepository extends JpaRepository<PropertySubmissionEvent,Integer> {
    List<PropertySubmissionEvent> findByRegistration_RegistrationIdOrderByCreatedAtAsc(Integer id);
}
