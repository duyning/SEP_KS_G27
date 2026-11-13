package org.hlrcs.repository;

import org.hlrcs.entity.Booking;
import org.hlrcs.entity.enums.BookingStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
    @Query("select b.bookingId from Booking b where b.status = :status and b.scheduledDate <= :cutoff order by b.scheduledDate, b.bookingId")
    List<Integer> findDueIds(BookingStatus status, LocalDateTime cutoff, Pageable page);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.bookingId = :id")
    Optional<Booking> findForDecision(Integer id);

    @EntityGraph(attributePaths = {"renter", "roomType", "roomType.property"})
    Slice<Booking> findByRenter_UserId(Integer renterId, Pageable page);

    @EntityGraph(attributePaths = {"renter", "roomType", "roomType.property"})
    Slice<Booking> findByRenter_UserIdAndStatus(Integer renterId, BookingStatus status, Pageable page);

    Optional<Booking> findByBookingIdAndRenter_UserId(Integer id, Integer renterId);

    boolean existsByBookingIdAndRenter_UserId(Integer id, Integer renterId);

    Optional<Booking> findFirstByRenter_UserIdAndRoomType_RoomTypeIdAndStatusOrderByBookingIdDesc(
            Integer renterId, Integer roomTypeId, BookingStatus status);

    boolean existsByRenter_UserIdAndRoomType_RoomTypeIdAndScheduledDateAndStatusInAndBookingIdNot(
            Integer renterId, Integer roomTypeId, LocalDateTime date, java.util.Collection<BookingStatus> statuses, Integer id);

    Optional<Booking> findByBookingIdAndRoomType_Property_Owner_UserId(Integer id, Integer ownerId);

    boolean existsByBookingIdAndRoomType_Property_Owner_UserId(Integer id, Integer ownerId);

    Optional<Booking> findFirstByRenter_UserIdAndRoomType_RoomTypeIdAndScheduledDateOrderByBookingIdDesc(
            Integer renterId, Integer roomTypeId, LocalDateTime date);

    boolean existsByRoomType_RoomTypeId(Integer id);
    long countByRoomType_Property_PropertyIdAndStatus(Integer propertyId, BookingStatus status);
    @EntityGraph(attributePaths = {"renter", "roomType", "roomType.property"})
    List<Booking> findByRoomType_Property_Owner_UserIdOrderByCreatedAtDesc(Integer ownerId);

    long countByRoomType_Property_Owner_UserIdAndStatus(Integer ownerId, BookingStatus status);

    @EntityGraph(attributePaths = {"renter", "roomType", "roomType.property"})
    List<Booking> findTop5ByRoomType_Property_Owner_UserIdOrderByCreatedAtDesc(Integer ownerId);
}
