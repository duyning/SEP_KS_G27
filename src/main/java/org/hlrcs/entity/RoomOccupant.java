package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Table(name = "room_occupants", indexes = @Index(name = "ix_occupant_tenancy", columnList = "tenancy_id"))
@Getter
@Setter
public class RoomOccupant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenancy_id", nullable = false)
    private RoomTenancy tenancy;
    @Column(nullable = false, length = 150)
    private String name;
    @Column(length = 30)
    private String phone;
    @Column(nullable = false)
    private LocalDate joinedOn;
    private LocalDate leftOn;
    @Column(nullable = false)
    private boolean primaryTenant;
}
