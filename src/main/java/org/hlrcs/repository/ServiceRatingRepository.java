package org.hlrcs.repository;

import org.hlrcs.entity.ServiceRating;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface ServiceRatingRepository extends JpaRepository<ServiceRating, Integer> {
    boolean existsByService_ServiceIdAndAuthor_UserId(Integer serviceId, Integer authorId);
    Optional<ServiceRating> findByService_ServiceIdAndAuthor_UserId(Integer serviceId, Integer authorId);
    @Query("select r from ServiceRating r where r.service.serviceId = :id and (:stars is null or r.stars = :stars) order by r.ratingId desc")
    Page<ServiceRating> ratings(Integer id, Integer stars, Pageable pageable);
    @Query("select r.stars, count(r) from ServiceRating r where r.service.serviceId = :id group by r.stars")
    List<Object[]> counts(Integer id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ServiceRating r where r.ratingId = :id")
    Optional<ServiceRating> findForReply(Integer id);
}
