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
    }
    java.util.List<Metadata> findByRegistration_RegistrationIdOrderByDocumentIdAsc(Integer registrationId);
    boolean existsByRegistration_RegistrationIdAndDocumentTypeAndFileContentIsNotNull(Integer registrationId, String documentType);
    java.util.List<PropertyDocument> findByRegistration_RegistrationId(Integer registrationId);
    long countByRegistration_RegistrationId(Integer registrationId);
}
