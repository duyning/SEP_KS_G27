package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "service_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Integer documentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registration_id", nullable = false)
    private ServiceRegistration registration;

    @Column(name = "document_name")
    private String documentName;

    @Column(name = "document_url")
    private String documentUrl;

    @Column(name = "verification_status")
    private String verificationStatus;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Lob
    @Column(name = "file_content", columnDefinition = "LONGBLOB")
    private byte[] fileContent;
}
