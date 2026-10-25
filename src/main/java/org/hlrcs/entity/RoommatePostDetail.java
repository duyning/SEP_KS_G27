package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hlrcs.entity.enums.RoommateType;

@Entity
@Table(name = "roommate_post_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoommatePostDetail {

    @Id
    @Column(name = "post_id")
    private Integer postId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "post_id")
    private Post post;

    @Enumerated(EnumType.STRING)
    @Column(name = "roommate_type")
    private RoommateType roommateType;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "location")
    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Property property;

    @Column(name = "property_description", columnDefinition = "TEXT")
    private String propertyDescription;
}
