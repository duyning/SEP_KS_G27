package org.hlrcs.repository;

import jakarta.persistence.LockModeType;
import org.hlrcs.entity.CommunityScan;
import org.hlrcs.entity.CommunityScan.State;
import org.springframework.data.jpa.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CommunityScanRepository extends JpaRepository<CommunityScan, Integer> {
    interface QueueEntry { Integer getId(); Integer getPostId(); }
    Optional<QueueEntry> findFirstByStateOrderByIdAsc(State state);
    List<CommunityScan> findByPostIdOrderByRevisionDesc(Integer postId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from CommunityScan s where s.id = :id")
    Optional<CommunityScan> lockById(Integer id);

    @Modifying
    @Query("delete from CommunityScan s where s.postId = :postId")
    void deleteForPost(Integer postId);

    @Modifying
    @Query("""
            update CommunityScan s set s.state = :failed, s.finishedAt = :now
            where s.state = :running and s.startedAt < :deadline
            """)
    void expire(State running, State failed, LocalDateTime now, LocalDateTime deadline);
}
