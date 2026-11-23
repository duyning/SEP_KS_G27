package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hlrcs.entity.enums.ReportStatus;
import org.hlrcs.entity.enums.ReportTargetType;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports", indexes = {
        @Index(name = "idx_report_target", columnList = "target_type,target_id"),
        @Index(name = "idx_report_queue", columnList = "target_type,status,created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Integer reportId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Integer targetId;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(length = 40)
    private String reasonCode;

    private String postTitle;

    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 50)
    private ReportStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handler_id")
    private User handler;

    @Column(length = 1000)
    private String resolutionNote;

    private LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
