package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "room_bill_payments", uniqueConstraints = @UniqueConstraint(name = "uk_room_bill_payment_request",
        columnNames = {"bill_id", "request_key"}))
@Getter
@Setter
public class RoomBillPayment {
    public enum Method { CASH, TRANSFER, OTHER }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "bill_id", nullable = false)
    private Long billId;
    @Column(name = "request_key", nullable = false, length = 36)
    private String requestKey;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal amount;
    @Column(nullable = false)
    private LocalDate paidOn;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Method method;
    @Column(length = 400)
    private String note;
    @Column(nullable = false)
    private Instant recordedAt;
}
