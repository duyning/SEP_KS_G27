package org.hlrcs.repository;
import org.hlrcs.entity.ModerationLog;
import org.springframework.data.jpa.repository.*;
import java.util.List;
public interface ModerationLogRepository extends JpaRepository<ModerationLog, Integer> {
    @EntityGraph(attributePaths = "staff")
    List<ModerationLog> findAllByOrderByCreatedAtDesc();
    @EntityGraph(attributePaths = "staff")
    List<ModerationLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String type, Integer id);
}
