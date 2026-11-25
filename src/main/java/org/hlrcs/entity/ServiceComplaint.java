package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "service_complaints")
@Getter @Setter @NoArgsConstructor
public class ServiceComplaint {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer complaintId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_id", nullable = false)
    private Service service;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;
    @Column(nullable = false, length = 3000) private String content;
    @Column(nullable = false, length = 30) private String status;
    @Column(length = 20) private String outcome;
    private Boolean responseRequested;
    // Legacy rows remain readable before the optional data migration is run.
    public String workflowStatus() { return Set.of("DISMISSED", "REMOVED", "RESOLVED").contains(status) ? "RESOLVED" : "PENDING"; }
    public String resolution() { return outcome != null ? outcome : "DISMISSED".equals(status) ? "DISMISS" : "REMOVED".equals(status) ? "REMOVE" : null; }
    public boolean awaitingResponse() { return "PENDING".equals(workflowStatus()) && (responseRequested != null ? responseRequested : "NEEDS_EXPLANATION".equals(status)); }
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private int revision;
    @ElementCollection @CollectionTable(name = "service_complaint_images", joinColumns = @JoinColumn(name = "complaint_id"))
    @OrderColumn(name = "image_position")
    private List<ServiceImage> images = new ArrayList<>();
}
