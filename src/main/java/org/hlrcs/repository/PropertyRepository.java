package org.hlrcs.repository;

import org.hlrcs.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Integer> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"registration"})
    List<Property> findByStatusOrderByPropertyIdDesc(String status);
    boolean existsByRegistration_RegistrationId(Integer registrationId);
    List<Property> findByOwner_UserIdOrderByPropertyIdAsc(Integer ownerId);
}
