package org.hlrcs.repository;

import org.hlrcs.entity.ViewingNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ViewingNotificationRepository extends JpaRepository<ViewingNotification, Integer> {
    Slice<ViewingNotification> findByRecipient_UserId(Integer userId, Pageable page);
    Slice<ViewingNotification> findByRecipient_UserIdAndReadFalse(Integer userId, Pageable page);
    long countByRecipient_UserIdAndReadFalse(Integer userId);
    Optional<ViewingNotification> findByNotificationIdAndRecipient_UserId(Integer id, Integer userId);
}
