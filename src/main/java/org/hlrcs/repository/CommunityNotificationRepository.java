package org.hlrcs.repository;

import org.hlrcs.entity.CommunityNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface CommunityNotificationRepository extends JpaRepository<CommunityNotification, Integer> {
    Slice<CommunityNotification> findByRecipient_UserId(Integer id, Pageable page);
    Slice<CommunityNotification> findByRecipient_UserIdAndReadFalse(Integer id, Pageable page);
    long countByRecipient_UserIdAndReadFalse(Integer id);
    boolean existsByRecipient_UserIdAndEventKey(Integer id, String key);
    Optional<CommunityNotification> findByNotificationIdAndRecipient_UserId(Integer id, Integer userId);
    @Modifying
    @Query("update CommunityNotification n set n.read=true where n.recipient.userId=:userId and n.read=false")
    int readAll(@Param("userId") Integer userId);
    @Modifying
    @Query("delete from CommunityNotification n where n.recipient.userId=:userId and n.read=true")
    int deleteRead(@Param("userId") Integer userId);
}
