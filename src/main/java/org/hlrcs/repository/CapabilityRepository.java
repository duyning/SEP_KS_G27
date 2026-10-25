package org.hlrcs.repository;

import org.hlrcs.entity.Capability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CapabilityRepository extends JpaRepository<Capability, Integer> {

    Optional<Capability> findByCode(String code);

    boolean existsByCode(String code);
}
