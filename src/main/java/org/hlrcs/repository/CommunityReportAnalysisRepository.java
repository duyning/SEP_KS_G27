package org.hlrcs.repository;

import jakarta.persistence.LockModeType;
import org.hlrcs.entity.CommunityReportAnalysis;
import org.hlrcs.entity.CommunityReportAnalysis.State;
import org.springframework.data.jpa.repository.*;
import java.time.LocalDateTime;
import java.util.*;

public interface CommunityReportAnalysisRepository extends JpaRepository<CommunityReportAnalysis, Integer> {
    interface QueueId { Integer getReportId(); }
    Optional<QueueId> findFirstByStateOrderByRequestedAtAscReportIdAsc(State state);
    List<CommunityReportAnalysis> findByPostId(Integer postId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from CommunityReportAnalysis a where a.reportId = :id")
    Optional<CommunityReportAnalysis> lockById(Integer id);
    @Modifying
    @Query("update CommunityReportAnalysis a set a.state=:failed, a.errorCode='TIMEOUT', a.finishedAt=:now where a.state=:running and a.startedAt<:deadline")
    int expire(State running, State failed, LocalDateTime now, LocalDateTime deadline);
}
