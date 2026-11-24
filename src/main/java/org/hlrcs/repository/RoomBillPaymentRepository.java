package org.hlrcs.repository;

import org.hlrcs.entity.RoomBillPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoomBillPaymentRepository extends JpaRepository<RoomBillPayment, Long> {
    List<RoomBillPayment> findByBillIdOrderByPaidOnDescIdDesc(Long id);
    Optional<RoomBillPayment> findByBillIdAndRequestKey(Long id, String key);
}
