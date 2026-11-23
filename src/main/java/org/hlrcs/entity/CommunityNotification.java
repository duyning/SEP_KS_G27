package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "community_notifications", uniqueConstraints = @UniqueConstraint(
        name = "uk_community_notification_event", columnNames = {"recipient_id", "event_key"}),
        indexes = @Index(name = "idx_community_notification_inbox", columnList = "recipient_id,is_read,notification_id"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CommunityNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer notificationId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;
    @Column(name = "event_key", nullable = false, length = 100)
    private String eventKey;
    @Column(nullable = false, length = 30)
    private String kind;
    @Column(nullable = false)
    private Integer postId;
    private Integer commentId;
    @Column(nullable = false, length = 200)
    private String postTitle;
    @Column(length = 200)
    private String actor;
    @Column(length = 2000)
    private String reason;
    @Column(name = "is_read", nullable = false)
    private boolean read;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
