package org.hlrcs.repository;
import org.hlrcs.entity.PropertyAssignmentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PropertyAssignmentEventRepository extends JpaRepository<PropertyAssignmentEvent, Long> {
    @org.springframework.data.jpa.repository.Query("select max(e.createdAt) from PropertyAssignmentEvent e where e.newStaffId=:staffId")
    java.time.LocalDateTime lastAssignedAt(@org.springframework.data.repository.query.Param("staffId") Integer staffId);
    List<PropertyAssignmentEvent> findByRegistration_RegistrationIdOrderByAssignmentVersionAsc(Integer id);
}
