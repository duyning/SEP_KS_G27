package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "service_ratings", uniqueConstraints = @UniqueConstraint(name = "uk_service_rating_author", columnNames = {"service_id", "author_id"}))
@Getter @Setter @NoArgsConstructor
public class ServiceRating {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer ratingId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_id", nullable = false)
    private Service service;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false)
    private User author;
    @Column(nullable = false) private int stars;
    @Column(nullable = false, length = 3000) private String content;
    @Column(nullable = false) private Instant createdAt;
    @Column(length = 3000) private String reply;
    private Instant repliedAt;
    @ElementCollection @CollectionTable(name = "service_rating_images", joinColumns = @JoinColumn(name = "rating_id"))
    @OrderColumn(name = "image_position")
    private List<ServiceImage> images = new ArrayList<>();
}
