package org.hlrcs.repository;

import org.hlrcs.entity.Feedback;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Integer> {
    interface RatingCount { Integer getRating(); Long getTotal(); }
    @Query("select f.rating as rating, count(f) as total from Feedback f where f.property.propertyId = :propertyId " +
            "and f.user.status = org.hlrcs.entity.enums.UserStatus.ACTIVE and f.rating between 1 and 5 group by f.rating")
    List<RatingCount> publicRatingCounts(@Param("propertyId") Integer propertyId);

    @EntityGraph(attributePaths = "user")
    @Query("select f from Feedback f where f.property.propertyId = :propertyId " +
            "and f.user.status = org.hlrcs.entity.enums.UserStatus.ACTIVE and f.rating between 1 and 5")
    List<Feedback> publicLatest(@Param("propertyId") Integer propertyId, Pageable pageable);
}
