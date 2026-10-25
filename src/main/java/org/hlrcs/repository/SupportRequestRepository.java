package org.hlrcs.repository;
import org.hlrcs.entity.SupportRequest;
import org.springframework.data.jpa.repository.*;
import java.util.List;
public interface SupportRequestRepository extends JpaRepository<SupportRequest, Integer> {
    @EntityGraph(attributePaths = {"requester", "targetProperty"})
    List<SupportRequest> findAllByOrderByCreatedAtAsc();
}
