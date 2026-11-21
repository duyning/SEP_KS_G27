package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.*;

/** Owner-only snapshot; deliberately excluded from all public room DTOs. */
@Entity @Table(name="rental_contracts",indexes=@Index(name="ix_rental_contract_room_owner",columnList="room_id,owner_id"))
@Getter @Setter @NoArgsConstructor
public class RentalContract {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="room_id",nullable=false) private Integer roomId;
    @Column(name="owner_id",nullable=false) private Integer ownerId;
    @Column(nullable=false,length=20) private String status;
    @Column(nullable=false,length=150) private String propertyName;
    @Column(length=500) private String propertyAddress;
    @Column(nullable=false,length=30) private String roomNumber;
    @Column(nullable=false) private LocalDate startDate;
    @Column(nullable=false) private LocalDate endDate;
    @Column(nullable=false,columnDefinition="MEDIUMTEXT") private String detailsJson;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime closedAt;
}
