package org.hlrcs.repository;

import org.hlrcs.entity.RoomTypeImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomTypeImageRepository extends JpaRepository<RoomTypeImage,Integer> {
    interface PublicImage { Integer getImageId(); Integer getRoomTypeId(); String getContentType(); String getImageUrl(); }
    @org.springframework.data.jpa.repository.Query("select i.imageId as imageId, i.roomType.roomTypeId as roomTypeId, i.contentType as contentType, i.imageUrl as imageUrl " +
            "from RoomTypeImage i where i.roomType.roomTypeId in :ids order by i.imageId")
    List<PublicImage> findPublicImageMetadata(@org.springframework.data.repository.query.Param("ids") List<Integer> ids);
    interface Metadata { Integer getImageId(); String getFileName(); }
    List<Metadata> findByRoomType_RoomTypeIdOrderByImageIdAsc(Integer id);
    void deleteByRoomType_RoomTypeId(Integer id);
}
