package org.hlrcs.repository;

import org.hlrcs.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceRepository extends JpaRepository<Service, Integer> {
    List<Service> findByProvider_UserIdOrderByServiceIdDesc(Integer providerId);
    boolean existsByProvider_UserIdAndServiceNameIgnoreCaseAndStatusNot(Integer providerId, String name, String status);
    boolean existsByRegistration_RegistrationId(Integer registrationId);
    List<Service> findByStatusOrderByServiceIdDesc(String status);
    List<Service> findByStatusAndCategory_CategoryIdOrderByServiceIdDesc(String status, Integer categoryId);
    java.util.Optional<Service> findByRegistration_RegistrationId(Integer registrationId);
}
