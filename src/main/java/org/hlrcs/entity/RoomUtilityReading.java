package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "room_utility_readings",
        uniqueConstraints = @UniqueConstraint(name = "uk_room_utility_tenancy_month", columnNames = {"tenancy_id", "billing_month"}),
        indexes = @Index(name = "ix_room_utility_room_month", columnList = "room_id,billing_month"))
@Getter
@Setter
public class RoomUtilityReading {
    public enum WaterMode { METER, PER_PERSON, FIXED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private Long revision;
    @Column(name = "tenancy_id", nullable = false)
    private Long tenancyId;
    @Column(name = "room_id", nullable = false)
    private Integer roomId;
    @Column(nullable = false)
    private Integer ownerId;
    @Column(name = "billing_month", nullable = false)
    private LocalDate billingMonth;
    @Column(nullable = false)
    private LocalDate periodStart;
    @Column(nullable = false)
    private LocalDate readOn;
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal electricityStart;
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal electricityEnd;
    @Column(nullable = false, precision = 9, scale = 0)
    private BigDecimal electricityRate;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal electricityAmount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 14)
    private WaterMode waterMode;
    @Column(precision = 12, scale = 3)
    private BigDecimal waterStart;
    @Column(precision = 12, scale = 3)
    private BigDecimal waterEnd;
    @Column(nullable = false, precision = 9, scale = 0)
    private BigDecimal waterRate;
    private Integer occupantCount;
    @Column(nullable = false, precision = 20, scale = 0)
    private BigDecimal waterAmount;
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
