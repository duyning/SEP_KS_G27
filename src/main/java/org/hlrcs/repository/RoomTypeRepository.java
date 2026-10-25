package org.hlrcs.repository;

import org.hlrcs.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomTypeRepository extends JpaRepository<RoomType, Integer> {
    List<RoomType> findByProperty_PropertyId(Integer propertyId);
    List<RoomType> findByProperty_Owner_UserId(Integer ownerId);
    boolean existsByProperty_PropertyIdAndRoomTypeIgnoreCase(Integer propertyId, String roomType);
    boolean existsByProperty_PropertyIdAndRoomTypeIgnoreCaseAndRoomTypeIdNot(Integer propertyId, String roomType, Integer id);
}
