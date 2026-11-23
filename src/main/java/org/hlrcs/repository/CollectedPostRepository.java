package org.hlrcs.repository;

import org.hlrcs.entity.CollectedPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.List;

public interface CollectedPostRepository extends JpaRepository<CollectedPost, Long> {
    boolean existsByExternalId(String externalId);
    java.util.Optional<CollectedPost> findByExternalId(String externalId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from CollectedPost p where p.externalId = :externalId")
    java.util.Optional<CollectedPost> lockByExternalId(String externalId);
    @Query("select p from CollectedPost p where p.deleted = false and p.published = :published and p.id < :before order by p.id desc")
    List<CollectedPost> feed(boolean published, long before, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from CollectedPost p where p.id in :ids order by p.id")
    List<CollectedPost> lockAll(List<Long> ids);
}
