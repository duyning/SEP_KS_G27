package org.hlrcs.repository;

import org.hlrcs.entity.RoomBill;
import org.hlrcs.entity.RoomBill.Kind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface RoomBillRepository extends JpaRepository<RoomBill, Long> {
    Optional<RoomBill> findByIdAndOwnerId(Long id, Integer ownerId);
    List<RoomBill> findByOwnerIdAndPropertyIdAndBillingMonthOrderByRoomNumberAscIdDesc(
            Integer ownerId, Integer propertyId, LocalDate billingMonth);
    @Query("select b from RoomBill b where b.ownerId = :ownerId and b.propertyId = :propertyId and b.billingMonth < :month"
            + " and b.issuedAt is not null and b.paidAmount < b.totalAmount order by b.dueDate, b.id")
    List<RoomBill> findEarlierDebt(Integer ownerId, Integer propertyId, LocalDate month);
    Optional<RoomBill> findByTenancyIdAndBillingMonthAndKind(Long tenancyId, LocalDate billingMonth, Kind kind);
    boolean existsByTenancyIdAndIssuedAtIsNotNullAndRentAmountGreaterThan(Long tenancyId, BigDecimal amount);
    @Query("select distinct b.tenancyId from RoomBill b where b.tenancyId in :ids and b.issuedAt is not null and b.rentAmount > 0")
    List<Long> findLockedScheduleIds(Collection<Long> ids);
    boolean existsByTenancyIdAndIssuedAtIsNotNullAndRentAmountGreaterThanAndRentFromLessThanEqualAndRentThroughGreaterThanEqual(
            Long tenancyId, BigDecimal amount, LocalDate through, LocalDate from);
}
