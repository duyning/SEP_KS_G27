package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "room_tenancies", indexes = @Index(name = "ix_tenancy_room_owner", columnList = "room_id,owner_id"))
@Getter
@Setter
public class RoomTenancy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "room_id", nullable = false)
    private Integer roomId;
    @Column(name = "owner_id", nullable = false)
    private Integer ownerId;
    @Column(unique = true)
    private Integer activeRoomId;
    @Column(unique = true)
    private Long contractId;
    @Column(nullable = false)
    private LocalDate startDate;
    @Column(nullable = false)
    private LocalDate endDate;
    private LocalDate closedDate;
    @Column(precision = 12, scale = 2)
    private BigDecimal monthlyRent;
    @Column(precision = 12, scale = 2)
    private BigDecimal deposit;
    private Integer rentCycleMonths;
    private Integer rentDueDay;
    private LocalDate firstRentDueDate;
    @CreationTimestamp
    private LocalDateTime createdAt;
    @OneToMany(mappedBy = "tenancy", cascade = CascadeType.PERSIST)
    @OrderBy("id ASC")
    private List<RoomOccupant> occupants = new ArrayList<>();

    public void addOccupant(String name, String phone, LocalDate joinedOn, boolean primary) {
        var occupant = new RoomOccupant();
        occupant.setTenancy(this);
        occupant.setName(name);
        occupant.setPhone(phone);
        occupant.setJoinedOn(joinedOn);
        occupant.setPrimaryTenant(primary);
        occupants.add(occupant);
    }
}
