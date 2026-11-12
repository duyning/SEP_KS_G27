package org.hlrcs.repository;
import jakarta.persistence.LockModeType;
import org.hlrcs.entity.Report;
import org.hlrcs.entity.enums.ReportStatus;
import org.hlrcs.entity.enums.ReportTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Integer> {
    @EntityGraph(attributePaths = "reporter")
    List<Report> findByTargetTypeNotOrderByCreatedAtAsc(ReportTargetType type);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Report r where r.targetType = :type and r.targetId = :postId and r.reporter.userId = :reporterId")
    List<Report> lockByReporter(@Param("type") ReportTargetType type, @Param("postId") Integer postId,
                                @Param("reporterId") Integer reporterId);

    @EntityGraph(attributePaths = {"reporter", "handler"})
    Page<Report> findByTargetTypeAndStatusIn(ReportTargetType type, Collection<ReportStatus> statuses, Pageable page);

    Page<Report> findByTargetTypeAndReporter_UserId(ReportTargetType type, Integer reporterId, Pageable page);

    Optional<Report> findByReportIdAndTargetType(Integer id, ReportTargetType type);

    @Query("select r.targetId from Report r where r.reportId = :id and r.targetType = :type")
    Optional<Integer> findTargetId(@Param("id") Integer id, @Param("type") ReportTargetType type);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Report r where r.targetType = :type and r.targetId = :postId order by r.reportId")
    List<Report> lockForTarget(@Param("type") ReportTargetType type, @Param("postId") Integer postId);
}
