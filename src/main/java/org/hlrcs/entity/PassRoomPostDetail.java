package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "pass_room_post_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PassRoomPostDetail {

    @Id
    @Column(name = "post_id")
    private Integer postId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Property property;

    @Column(name = "property_info", columnDefinition = "TEXT")
    private String propertyInfo;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "pass_reason", columnDefinition = "TEXT")
    private String passReason;

    @Column(name = "available_date")
    private LocalDateTime availableDate;

    @Column(name = "contract_expire_date")
    private LocalDateTime contractExpireDate;
}
