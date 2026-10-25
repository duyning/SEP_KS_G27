package org.hlrcs.repository;

import org.hlrcs.entity.RoomTypeImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomTypeImageRepository extends JpaRepository<RoomTypeImage,Integer> {
    interface Metadata { Integer getImageId(); String getFileName(); }
    List<Metadata> findByRoomType_RoomTypeIdOrderByImageIdAsc(Integer id);
    void deleteByRoomType_RoomTypeId(Integer id);
}
