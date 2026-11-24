package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "viewing_notifications", uniqueConstraints = @UniqueConstraint(
        name = "uk_viewing_notification_event", columnNames = {"booking_id", "event_key"}),
        indexes = @Index(name = "idx_viewing_notification_inbox", columnList = "recipient_id,is_read,notification_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Integer notificationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "event_key", nullable = false, length = 20)
    private Event event;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum Event { REQUESTED, APPROVED, REJECTED, CANCELLED, EXPIRED }
}
