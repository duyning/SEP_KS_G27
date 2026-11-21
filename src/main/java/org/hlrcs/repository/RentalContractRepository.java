package org.hlrcs.repository;
import org.hlrcs.entity.RentalContract;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface RentalContractRepository extends JpaRepository<RentalContract,Long> {
    List<RentalContract> findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(Integer roomId,Integer ownerId);
    List<RentalContract> findByRoomIdAndOwnerIdAndStatus(Integer roomId,Integer ownerId,String status);
}
