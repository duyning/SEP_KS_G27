package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "community_report_evidence")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityReportEvidence {
    @Id
    private Integer reportId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id")
    private Report report;

    @Column(nullable = false, length = 200)
    private String fileName;

    @Column(nullable = false, length = 40)
    private String contentType;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] fileContent;
}
