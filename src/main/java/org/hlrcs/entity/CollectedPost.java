package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "collected_posts", indexes = @Index(name = "idx_collected_visibility_id", columnList = "published,id"))
@Getter @Setter @NoArgsConstructor
public class CollectedPost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 64)
    private String externalId;
    @Column(nullable = false, length = 512)
    private String sourceUrl;
    @Column(nullable = false, length = 512)
    private String groupUrl;
    @Column(nullable = false, length = 255)
    private String author;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String caption;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "collected_post_images", joinColumns = @JoinColumn(name = "post_id"))
    @OrderColumn(name = "image_order")
    @Column(name = "image_url", length = 2048, nullable = false)
    private List<String> images = new ArrayList<>();
    @Column(nullable = false)
    private Instant sourcePublishedAt;
    @Column(nullable = false)
    private Instant collectedAt;
    @Column(nullable = false)
    private boolean published;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted;
    private Instant publishedAt;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collected_by", nullable = false)
    private User collectedBy;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by")
    private User publishedBy;
}
