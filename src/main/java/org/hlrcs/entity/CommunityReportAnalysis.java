package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "community_report_analyses", indexes = @Index(columnList = "state,report_id"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CommunityReportAnalysis {
    public enum State { QUEUED, RUNNING, READY, FAILED, DISABLED, SKIPPED }
    @Id @Column(name = "report_id") private Integer reportId;
    @Column(nullable = false) private Integer postId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private State state;
    @Column(nullable = false) private int generation;
    @Column(length = 64) private String fingerprint;
    @Column(length = 40) private String rulesVersion;
    @Column(length = 100) private String model;
    @Column(columnDefinition = "TEXT") private String findings;
    @Column(length = 30) private String recommendation;
    @Column(length = 40) private String errorCode;
    private int completedChecks;
    private int totalChecks;
    private LocalDateTime requestedAt;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}
