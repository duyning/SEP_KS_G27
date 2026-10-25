package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pass_item_post_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PassItemPostDetail {

    @Id
    @Column(name = "post_id")
    private Integer postId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(name = "item_description", columnDefinition = "TEXT")
    private String itemDescription;
}
