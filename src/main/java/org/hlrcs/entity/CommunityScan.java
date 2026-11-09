package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hlrcs.entity.enums.PostStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_scans", uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "revision"}),
        indexes = @Index(columnList = "state,id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityScan {
    public enum State { QUEUED, RUNNING, CLEAR, FLAGGED, OFF_TOPIC, FAILED, SKIPPED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "post_id", nullable = false)
    private Integer postId;

    @Column(nullable = false)
    private int revision;

    @Column(nullable = false)
    private boolean autoEligible;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private State state;

    @Column(columnDefinition = "TEXT")
    private String findings;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;

    @Enumerated(EnumType.STRING)
    private PostStatus decision;
    @Column(length = 2000)
    private String decisionNote;
}
