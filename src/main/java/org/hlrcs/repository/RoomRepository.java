package org.hlrcs.repository;
import org.hlrcs.entity.Room;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room,Integer> {
    @EntityGraph(attributePaths={"property","roomType"})
    List<Room> findByProperty_Owner_UserIdOrderByRoomNumberAsc(Integer ownerId);
    @EntityGraph(attributePaths={"roomType"})
    List<Room> findByRoomType_RoomTypeIdOrderByRoomNumberAsc(Integer typeId);
    boolean existsByRoomType_RoomTypeId(Integer typeId);
    boolean existsByProperty_PropertyIdAndRoomNumberIgnoreCaseAndRoomIdNot(Integer propertyId,String number,Integer id);
    long countByProperty_PropertyId(Integer propertyId);
    long countByProperty_PropertyIdAndStatus(Integer propertyId,String status);
    long countByProperty_Owner_UserId(Integer ownerId);
    long countByProperty_Owner_UserIdAndStatus(Integer ownerId,String status);
}
