package org.hlrcs.repository;
import org.hlrcs.entity.ModerationLog;
import org.springframework.data.jpa.repository.*;
import java.util.List;
public interface ModerationLogRepository extends JpaRepository<ModerationLog, Integer> {
    @EntityGraph(attributePaths = "staff")
    @Query("select l from ModerationLog l where l.targetType <> 'PROPERTY_REGISTRATION' or exists (select r.registrationId from PropertyRegistration r where r.registrationId = l.targetId and " + PropertyRegistrationRepository.ASSIGNED_SCOPE + ") order by l.createdAt desc")
    List<ModerationLog> findVisibleForVerificationStaff(@org.springframework.data.repository.query.Param("staffId") Integer staffId);
    @EntityGraph(attributePaths = "staff")
    List<ModerationLog> findAllByOrderByCreatedAtDesc();
    @EntityGraph(attributePaths = "staff")
    List<ModerationLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String type, Integer id);
}
