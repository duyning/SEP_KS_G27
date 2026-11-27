package org.hlrcs.repository;

import jakarta.persistence.LockModeType;
import org.hlrcs.entity.PasswordResetChallenge;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;

public interface PasswordResetChallengeRepository extends JpaRepository<PasswordResetChallenge, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from PasswordResetChallenge c where c.id = :id")
    Optional<PasswordResetChallenge> findLocked(@Param("id") String id);
    @Modifying @Query("delete from PasswordResetChallenge c where c.expiresAt < :cutoff")
    void deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
