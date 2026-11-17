package org.hlrcs.repository;
import org.hlrcs.entity.HostApplicationIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
public interface HostApplicationIdentityRepository extends JpaRepository<HostApplicationIdentity,Integer> {
 boolean existsByApplicationIdAndBackContentIsNotNull(Integer applicationId);
}
