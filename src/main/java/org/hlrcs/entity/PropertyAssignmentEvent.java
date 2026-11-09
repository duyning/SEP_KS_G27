package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "property_assignment_events", uniqueConstraints = @UniqueConstraint(columnNames = {"registration_id", "assignment_version"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PropertyAssignmentEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long eventId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "registration_id", nullable = false)
    private PropertyRegistration registration;
    @Column(name = "assignment_version", nullable = false)
    private long assignmentVersion;
    private Integer previousStaffId;
    private Integer newStaffId;
    @Column(nullable = false, length = 100)
    private String actor;
    @Column(nullable = false, length = 20)
    private String action;
    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
