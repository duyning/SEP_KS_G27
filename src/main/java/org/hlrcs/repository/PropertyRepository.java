package org.hlrcs.repository;

import org.hlrcs.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Integer> {
    interface PublicProfile { Integer getPropertyId(); String getDetails(); }
    @org.springframework.data.jpa.repository.Query("select p.propertyId as propertyId, r.registrationDetails as details from Property p join p.registration r join p.owner u where p.status='ACTIVE' and r.status=org.hlrcs.entity.enums.RegistrationStatus.APPROVED and u.status=org.hlrcs.entity.enums.UserStatus.ACTIVE")
    List<PublicProfile> findPublicProfiles();
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"registration"})
    List<Property> findByStatusOrderByPropertyIdDesc(String status);
    boolean existsByRegistration_RegistrationId(Integer registrationId);
    List<Property> findByOwner_UserIdOrderByPropertyIdAsc(Integer ownerId);
}
