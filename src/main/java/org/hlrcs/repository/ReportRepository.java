package org.hlrcs.repository;
import jakarta.persistence.LockModeType;
import org.hlrcs.entity.Report;
import org.hlrcs.entity.enums.ReportStatus;
import org.hlrcs.entity.enums.ReportTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
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

    interface PostReportGroup {
        Integer getPostId();
        Integer getSelectedReportId();
        long getReportCount();
        long getOpenCount();
        LocalDateTime getLatestAt();
    }

    @Query(value = """
            select r.targetId as postId,
                   max(case when r.status in :statuses then r.reportId else null end) as selectedReportId,
                   count(r) as reportCount,
                   sum(case when r.status in :openStatuses then 1 else 0 end) as openCount,
                   max(r.createdAt) as latestAt
            from Report r where r.targetType = :type
            group by r.targetId
            having sum(case when r.status in :statuses then 1 else 0 end) > 0
            order by max(r.createdAt) desc, r.targetId desc
            """, countQuery = """
            select count(distinct r.targetId) from Report r where r.targetType = :type and r.status in :statuses
            """)
    Page<PostReportGroup> groupByPost(@Param("type") ReportTargetType type,
                                     @Param("statuses") Collection<ReportStatus> statuses,
                                     @Param("openStatuses") Collection<ReportStatus> openStatuses, Pageable page);

    @EntityGraph(attributePaths = "reporter")
    List<Report> findByTargetTypeAndTargetId(ReportTargetType type, Integer postId);

    Page<Report> findByTargetTypeAndReporter_UserId(ReportTargetType type, Integer reporterId, Pageable page);

    Optional<Report> findByReportIdAndTargetType(Integer id, ReportTargetType type);

    @Query("select r.targetId from Report r where r.reportId = :id and r.targetType = :type")
    Optional<Integer> findTargetId(@Param("id") Integer id, @Param("type") ReportTargetType type);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Report r where r.targetType = :type and r.targetId = :postId order by r.reportId")
    List<Report> lockForTarget(@Param("type") ReportTargetType type, @Param("postId") Integer postId);
}
