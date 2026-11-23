package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "room_bills", uniqueConstraints = @UniqueConstraint(name = "uk_room_bill_period_kind",
        columnNames = {"tenancy_id", "billing_month", "kind"}),
        indexes = @Index(name = "ix_room_bill_property_period", columnList = "owner_id,property_id,billing_month"))
@Getter
@Setter
public class RoomBill {
    public enum Kind { MAIN, UTILITIES }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private Long revision;
    @Column(name = "owner_id", nullable = false)
    private Integer ownerId;
    @Column(name = "property_id", nullable = false)
    private Integer propertyId;
    @Column(nullable = false)
    private Integer roomId;
    @Column(name = "tenancy_id", nullable = false)
    private Long tenancyId;
    @Column(nullable = false, length = 30)
    private String roomNumber;
    @Column(nullable = false, length = 150)
    private String tenantName;
    @Column(name = "billing_month", nullable = false)
    private LocalDate billingMonth;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Kind kind;
    @Column(nullable = false)
    private LocalDate dueDate;
    private LocalDate rentFrom;
    private LocalDate rentThrough;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal rentAmount;
    @Column(unique = true)
    private Long utilityReadingId;
    private Long utilityRevision;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal electricityAmount;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal waterAmount;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String chargesJson;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal totalAmount;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal paidAmount = BigDecimal.ZERO;
    private Instant issuedAt;
}
