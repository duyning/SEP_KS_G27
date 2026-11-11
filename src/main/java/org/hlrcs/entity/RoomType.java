package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "room_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_type_id")
    private Integer roomTypeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "room_type", nullable = false)
    private String roomType;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "area_sqm")
    private Float areaSqm;

    @Column(name = "service_price", precision = 12, scale = 2)
    private BigDecimal servicePrice;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    private Integer capacity;

    // Null for legacy/unconfirmed inventory. Never inferred from updatedAt.
    private java.time.Instant availabilityConfirmedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "availability_confirmed_by")
    private User availabilityConfirmedBy;

    @Column(precision = 12, scale = 2)
    private BigDecimal deposit;

    @Column(length = 1000)
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String amenitiesJson;

    @Column(precision = 12, scale = 2)
    private BigDecimal electricityPrice;

    @Column(precision = 12, scale = 2)
    private BigDecimal waterPrice;

    @Column(precision = 12, scale = 2)
    private BigDecimal internetPrice;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
