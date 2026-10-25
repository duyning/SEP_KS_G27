package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "property_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Integer documentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registration_id", nullable = false)
    private PropertyRegistration registration;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "document_url")
    private String documentUrl;

    @Column(name = "verification_status")
    private String verificationStatus;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(columnDefinition = "DATETIME(6)")
    private java.time.LocalDateTime archivedAt;

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "uploaded_at", updatable = false, columnDefinition = "DATETIME(6)")
    private java.time.LocalDateTime uploadedAt;

    @PrePersist
    void fillFileSize() {
        if (fileSize == null && fileContent != null) fileSize = (long) fileContent.length;
    }

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "file_content", columnDefinition = "LONGBLOB")
    private byte[] fileContent;
}
