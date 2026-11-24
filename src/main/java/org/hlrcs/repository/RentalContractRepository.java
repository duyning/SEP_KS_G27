package org.hlrcs.repository;
import jakarta.persistence.LockModeType;
import org.hlrcs.entity.RentalContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface RentalContractRepository extends JpaRepository<RentalContract,Long> {
    List<RentalContract> findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(Integer roomId,Integer ownerId);
    List<RentalContract> findByRoomIdAndOwnerIdAndStatus(Integer roomId,Integer ownerId,String status);
    List<RentalContract> findByOwnerIdAndRoomIdIn(Integer ownerId, Collection<Integer> roomIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RentalContract> findByIdAndOwnerId(Long id, Integer ownerId);

    Optional<RentalContract> findBySigningTokenHash(String signingTokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RentalContract> findForUpdateBySigningTokenHash(String signingTokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RentalContract c where c.roomId = :roomId and c.ownerId = :ownerId and c.status = 'ACTIVE'")
    List<RentalContract> lockActiveForRoom(Integer roomId, Integer ownerId);
}
