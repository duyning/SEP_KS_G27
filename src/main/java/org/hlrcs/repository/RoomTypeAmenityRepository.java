package org.hlrcs.repository;
import org.hlrcs.entity.RoomTypeAmenity;
import org.hlrcs.entity.RoomTypeAmenityId;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RoomTypeAmenityRepository extends JpaRepository<RoomTypeAmenity,RoomTypeAmenityId> {
    void deleteByRoomType_RoomTypeId(Integer id);
}
