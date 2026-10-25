package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name="rooms",uniqueConstraints=@UniqueConstraint(name="uk_room_property_number",columnNames={"property_id","room_number"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Room {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Integer roomId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="property_id",nullable=false)
    private Property property;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="room_type_id",nullable=false)
    private RoomType roomType;
    @Column(name="room_number",nullable=false,length=30)
    private String roomNumber;
    @Column(nullable=false,length=50)
    private String floor;
    @Column(nullable=false,length=20)
    private String status;
    @Column(precision=12,scale=2)
    private BigDecimal customPrice;
    private LocalDateTime confirmedAt;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}
