package org.hlrcs.repository;
import org.hlrcs.entity.Room;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room,Integer> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.roomId in :ids and r.property.owner.userId = :ownerId and r.property.propertyId = :propertyId order by r.roomId")
    List<Room> findForStatusUpdate(@org.springframework.data.repository.query.Param("ids") java.util.Set<Integer> ids,
            @org.springframework.data.repository.query.Param("ownerId") Integer ownerId,
            @org.springframework.data.repository.query.Param("propertyId") Integer propertyId);
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<Room> findFirstByRoomTypeAndPropertyAndStatusAndPublicVisibleTrueOrderByRoomIdAsc(
            org.hlrcs.entity.RoomType roomType, org.hlrcs.entity.Property property, String status);

    interface VacancyCount { Integer getRoomTypeId(); Long getAvailableRooms(); }
    @Query("select r.roomType.roomTypeId as roomTypeId, count(r) as availableRooms from Room r " +
            "where r.roomType.roomTypeId in :ids and r.property = r.roomType.property and r.publicVisible = true and r.status = 'VACANT' group by r.roomType.roomTypeId")
    List<VacancyCount> countPublicVacancies(@org.springframework.data.repository.query.Param("ids") List<Integer> ids);
    @EntityGraph(attributePaths={"property","property.owner"})
    java.util.Optional<Room> findByRoomIdAndProperty_Owner_UserId(Integer roomId, Integer ownerId);
    @EntityGraph(attributePaths={"property","roomType"})
    List<Room> findByProperty_Owner_UserIdOrderByRoomNumberAsc(Integer ownerId);
    @EntityGraph(attributePaths={"roomType"})
    List<Room> findByRoomType_RoomTypeIdOrderByRoomNumberAsc(Integer typeId);
    boolean existsByRoomType_RoomTypeId(Integer typeId);
    boolean existsByProperty_PropertyIdAndRoomNumberIgnoreCaseAndRoomIdNot(Integer propertyId,String number,Integer id);
    boolean existsByProperty_PropertyIdAndPublicVisibleTrue(Integer propertyId);
    boolean existsByRoomType_RoomTypeIdAndPublicVisibleTrue(Integer roomTypeId);
    long countByProperty_PropertyId(Integer propertyId);
    long countByProperty_PropertyIdAndStatus(Integer propertyId,String status);
    long countByProperty_Owner_UserId(Integer ownerId);
    long countByProperty_Owner_UserIdAndStatus(Integer ownerId,String status);
}
