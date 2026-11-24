package org.hlrcs.repository;

import org.hlrcs.entity.RoomUtilityReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface RoomUtilityReadingRepository extends JpaRepository<RoomUtilityReading, Long> {
    List<RoomUtilityReading> findByOwnerIdAndRoomIdInAndBillingMonthBetween(
            Integer ownerId, Collection<Integer> roomIds, LocalDate first, LocalDate last);
    @Query("""
            select r from RoomUtilityReading r
            where r.tenancyId in :tenancyIds and (
                r.billingMonth = (select max(p.billingMonth) from RoomUtilityReading p
                                  where p.tenancyId = r.tenancyId and p.billingMonth < :first)
                or r.billingMonth = (select min(n.billingMonth) from RoomUtilityReading n
                                     where n.tenancyId = r.tenancyId and n.billingMonth > :last))
            """)
    List<RoomUtilityReading> findOutsideWindow(Collection<Long> tenancyIds, LocalDate first, LocalDate last);
    boolean existsByTenancyIdAndReadOnAfter(Long tenancyId, LocalDate date);
    boolean existsByTenancyId(Long tenancyId);
}
