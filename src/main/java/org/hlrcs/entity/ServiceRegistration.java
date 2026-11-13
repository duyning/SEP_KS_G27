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

    @Column(name = "custom_service_areas", length = 600)
    private String customServiceAreas;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "price_unit", length = 20)
    private String priceUnit;

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

    @Column(nullable = false, columnDefinition = "integer default 0")
    @Builder.Default
    private int revision = 0;

    @Column(columnDefinition = "TEXT")
    private String requestedChanges;

    private LocalDateTime supplementRequestedAt;
    private LocalDateTime resubmittedAt;

    @Column(length = 2000)
    private String resubmissionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_service_id")
    private Service targetService;

    @Builder.Default
    @Column(length = 20)
    private String operation = "CREATE";

    private Integer serviceRevision;

    @Lob
    @Column(columnDefinition = "LONGBLOB")
    private byte[] imageContent;

    @Column(length = 100)
    private String imageContentType;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "service_registration_images", joinColumns = @JoinColumn(name = "registration_id"))
    @OrderColumn(name = "image_position")
    @Builder.Default
    private java.util.List<ServiceImage> additionalImages = new java.util.ArrayList<>();

    public int imageCount() { return imageContent == null ? 0 : 1 + additionalImages.size(); }

    public ServiceImage imageAt(int index) {
        if (index < 0 || index >= imageCount()) throw new org.hlrcs.exception.ResourceNotFoundException("Không tìm thấy ảnh dịch vụ.");
        return index == 0 ? new ServiceImage(imageContent, imageContentType) : additionalImages.get(index - 1);
    }
}
