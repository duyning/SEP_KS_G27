package org.hlrcs.repository;

import org.hlrcs.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Integer> {
    List<Property> findByOwner_UserIdOrderByPropertyIdAsc(Integer ownerId);
}
