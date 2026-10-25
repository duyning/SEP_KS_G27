package org.hlrcs.repository;
import org.hlrcs.entity.Report;
import org.springframework.data.jpa.repository.*;
import java.util.List;
public interface ReportRepository extends JpaRepository<Report, Integer> {
    @EntityGraph(attributePaths = "reporter")
    List<Report> findAllByOrderByCreatedAtAsc();
}
