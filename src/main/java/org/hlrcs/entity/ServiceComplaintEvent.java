package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "service_complaint_events")
@Getter @Setter @NoArgsConstructor
public class ServiceComplaintEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer eventId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "complaint_id", nullable = false)
    private ServiceComplaint complaint;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "actor_id", nullable = false)
    private User actor;
    @Column(nullable = false, length = 30) private String action;
    @Column(nullable = false, length = 3000) private String content;
    @Column(nullable = false) private Instant createdAt;
    @ElementCollection @CollectionTable(name = "service_complaint_event_images", joinColumns = @JoinColumn(name = "event_id"))
    @OrderColumn(name = "image_position")
    private List<ServiceImage> images = new ArrayList<>();
}
