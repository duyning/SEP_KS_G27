package org.hlrcs.repository;

import jakarta.persistence.LockModeType;
import org.hlrcs.entity.DirectConversation;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;

public interface DirectConversationRepository extends JpaRepository<DirectConversation,Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<DirectConversation> findByLowUser_UserIdAndHighUser_UserId(Integer low,Integer high);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from DirectConversation c where c.id=:id")
    Optional<DirectConversation> lock(Long id);
    @Query("""
        select c from DirectConversation c where
        (c.lowUser.userId=:userId or c.highUser.userId=:userId) and
        (lower(coalesce(case when c.lowUser.userId=:userId then c.highUser.fullName else c.lowUser.fullName end,'Tài khoản')) like :query escape '!')
        order by c.updatedAt desc,c.id desc
        """)
    Slice<DirectConversation> inbox(Integer userId,String query,Pageable page);
}
