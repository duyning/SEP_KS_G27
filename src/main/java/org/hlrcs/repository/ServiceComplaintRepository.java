package org.hlrcs.repository;

import org.hlrcs.entity.ServiceComplaint;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface ServiceComplaintRepository extends JpaRepository<ServiceComplaint, Integer> {
    List<ServiceComplaint> findAllByOrderByComplaintIdDesc();
    List<ServiceComplaint> findByService_Provider_UserIdOrderByComplaintIdDesc(Integer id);
    List<ServiceComplaint> findByReporter_UserIdOrderByComplaintIdDesc(Integer id);
    boolean existsByService_ServiceIdAndReporter_UserIdAndStatusIn(Integer serviceId, Integer reporterId, List<String> statuses);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ServiceComplaint c where c.complaintId = :id")
    Optional<ServiceComplaint> findForReview(Integer id);
}
