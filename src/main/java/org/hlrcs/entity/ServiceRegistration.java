package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hlrcs.entity.enums.RegistrationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_registrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "registration_id")
    private Integer registrationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ServiceCategory category;

    @Column(name = "service_name", nullable = false)
    private String serviceName;

    @Column(name = "contact_info")
    private String contactInfo;

    @Column(name = "applicant_name", length = 100)
    private String applicantName;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "pricing_type", length = 20)
    private String pricingType;

    @Column(name = "service_area", length = 500)
    private String serviceArea;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RegistrationStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "capability_decision", length = 20)
    private String capabilityDecision;

    @Column(name = "listing_decision", length = 20)
    private String listingDecision;

    @Column(name = "reason_note", columnDefinition = "TEXT")
    private String reasonNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
}
