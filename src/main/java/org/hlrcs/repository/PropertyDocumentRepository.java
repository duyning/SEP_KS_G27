package org.hlrcs.repository;

import org.hlrcs.entity.PropertyDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyDocumentRepository extends JpaRepository<PropertyDocument, Integer> {
    interface Metadata {
        Integer getDocumentId();
        String getDocumentType();
        String getFileName();
        String getContentType();
        String getVerificationStatus();
        Long getFileSize();
        java.time.LocalDateTime getUploadedAt();
    }
    @org.springframework.data.jpa.repository.Query("select d.documentId as documentId, d.documentType as documentType, d.fileName as fileName, d.contentType as contentType, d.verificationStatus as verificationStatus, d.fileSize as fileSize, d.uploadedAt as uploadedAt from PropertyDocument d where d.registration.registrationId=:registrationId and d.archivedAt is null order by d.documentId")
    java.util.List<Metadata> findByRegistration_RegistrationIdOrderByDocumentIdAsc(@org.springframework.data.repository.query.Param("registrationId") Integer registrationId);
    @org.springframework.data.jpa.repository.Query("select (count(d)>0) from PropertyDocument d where d.registration.registrationId=:registrationId and d.documentType=:documentType and d.fileContent is not null and d.archivedAt is null")
    boolean existsByRegistration_RegistrationIdAndDocumentTypeAndFileContentIsNotNull(Integer registrationId, String documentType);
    @org.springframework.data.jpa.repository.Query("select d from PropertyDocument d where d.registration.registrationId=:registrationId and d.archivedAt is null")
    java.util.List<PropertyDocument> findByRegistration_RegistrationId(@org.springframework.data.repository.query.Param("registrationId") Integer registrationId);
    long countByRegistration_RegistrationId(Integer registrationId);
}
