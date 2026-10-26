package org.hlrcs.repository;
import jakarta.persistence.LockModeType;
import org.hlrcs.entity.HostApplication;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.Optional;
public interface HostApplicationRepository extends JpaRepository<HostApplication,Integer>, JpaSpecificationExecutor<HostApplication> {
 long countByStatus(String status);
 Optional<HostApplication> findByUser_UserId(Integer userId);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from HostApplication a where a.id=:id")
 Optional<HostApplication> findForReview(@Param("id") Integer id);
 Page<HostApplication> findByStatus(String status,Pageable pageable);
}
