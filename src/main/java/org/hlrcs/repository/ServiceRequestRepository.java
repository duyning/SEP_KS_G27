package org.hlrcs.repository;

import org.hlrcs.entity.ServiceRequest;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Integer> {
    List<ServiceRequest> findByCustomer_UserIdOrderByRequestIdDesc(Integer userId);
    List<ServiceRequest> findByService_Provider_UserIdOrderByRequestIdDesc(Integer userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ServiceRequest r where r.requestId = :id")
    Optional<ServiceRequest> findForResponse(@Param("id") Integer id);
}
