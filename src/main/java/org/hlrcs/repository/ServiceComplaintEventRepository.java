package org.hlrcs.repository;

import org.hlrcs.entity.ServiceComplaintEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceComplaintEventRepository extends JpaRepository<ServiceComplaintEvent, Integer> {
    List<ServiceComplaintEvent> findByComplaint_ComplaintIdOrderByEventIdAsc(Integer id);
}
