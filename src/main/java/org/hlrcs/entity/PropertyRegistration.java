package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hlrcs.entity.enums.RegistrationStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_registrations", indexes = @Index(name = "idx_property_assignment_queue", columnList = "assigned_staff_id,created_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "registration_id")
    private Integer registrationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "address")
    private String address;

    @Column(name = "contact_info")
    private String contactInfo;

    @Column(name = "google_map_link")
    private String googleMapLink;

    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 50)
    private RegistrationStatus status;

    // A change request references a published property without replacing its approved registration.
    private Integer targetPropertyId;
    private Integer baseRegistrationId;
    @Column(columnDefinition = "TEXT")
    private String requestedFieldsJson;
    @Column(columnDefinition = "TEXT")
    private String fieldNotesJson;
    @Column(columnDefinition = "DATETIME(6)")
    private LocalDateTime submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewer;

    // Responsibility is independent of the actor who recorded the last decision.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Builder.Default
    @Column(name = "assignment_version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private long assignmentVersion = 0;

    @Column(name = "reason_note", columnDefinition = "TEXT")
    private String reasonNote;

    @Column(name = "registration_details", columnDefinition = "TEXT")
    private String registrationDetails;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
