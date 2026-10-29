package org.hlrcs.repository;

import org.hlrcs.entity.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Integer> {
    boolean existsByName(String name);
}
