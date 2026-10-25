package org.hlrcs.repository;

import org.hlrcs.entity.Booking;
import org.hlrcs.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
    boolean existsByRoomType_RoomTypeId(Integer id);
    long countByRoomType_Property_PropertyIdAndStatus(Integer propertyId, BookingStatus status);
    @EntityGraph(attributePaths = {"renter", "roomType", "roomType.property"})
    List<Booking> findByRoomType_Property_Owner_UserIdOrderByCreatedAtDesc(Integer ownerId);

    long countByRoomType_Property_Owner_UserIdAndStatus(Integer ownerId, BookingStatus status);

    @EntityGraph(attributePaths = {"renter", "roomType", "roomType.property"})
    List<Booking> findTop5ByRoomType_Property_Owner_UserIdOrderByCreatedAtDesc(Integer ownerId);
}
