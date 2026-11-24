package org.hlrcs.repository;
import org.hlrcs.entity.UserNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UserNoticeRepository extends JpaRepository<UserNotice,Long> {
 List<UserNotice> findByRecipient_UserId(Integer userId);
 Optional<UserNotice> findByIdAndRecipient_UserId(Long id,Integer userId);
}
