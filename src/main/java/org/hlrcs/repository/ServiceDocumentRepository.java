package org.hlrcs.repository;

import org.hlrcs.entity.ServiceDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ServiceDocumentRepository extends JpaRepository<ServiceDocument, Integer> {
    List<ServiceDocument> findByRegistration_RegistrationIdOrderByDocumentIdAsc(Integer registrationId);
    Optional<ServiceDocument> findByDocumentIdAndRegistration_User_UserId(Integer documentId, Integer userId);
}
