package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name="property_submission_events")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PropertySubmissionEvent {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer eventId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="registration_id",nullable=false) private PropertyRegistration registration;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_id",nullable=false) private User actor;
    @Column(nullable=false) private String action;
    @Column(columnDefinition="TEXT") private String previousDetails;
    @Column(columnDefinition="TEXT") private String submittedDetails;
    @Column(columnDefinition="TEXT") private String previousDocumentIds;
    @Column(columnDefinition="TEXT") private String previousReviewNote;
    @org.hibernate.annotations.CreationTimestamp private LocalDateTime createdAt;
}
