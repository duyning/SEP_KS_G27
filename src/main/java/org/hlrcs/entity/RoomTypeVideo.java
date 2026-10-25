package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "room_type_videos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTypeVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "video_id")
    private Integer videoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Column(name = "video_url", nullable = false)
    private String videoUrl;
}
