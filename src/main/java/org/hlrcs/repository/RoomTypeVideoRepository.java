package org.hlrcs.repository;
import org.hlrcs.entity.RoomTypeVideo;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RoomTypeVideoRepository extends JpaRepository<RoomTypeVideo,Integer> {
    void deleteByRoomType_RoomTypeId(Integer id);
}
