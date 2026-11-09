package org.hlrcs.repository;

import org.hlrcs.entity.VerificationAssignmentQueue;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface VerificationAssignmentQueueRepository extends JpaRepository<VerificationAssignmentQueue, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select q from VerificationAssignmentQueue q where q.id=1")
    Optional<VerificationAssignmentQueue> lockQueue();
}
