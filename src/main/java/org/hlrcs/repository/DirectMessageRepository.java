package org.hlrcs.repository;

import org.hlrcs.entity.DirectMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface DirectMessageRepository extends JpaRepository<DirectMessage,Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<DirectMessage> findByConversation_IdAndSender_UserIdAndClientMessageId(Long conversationId,Integer senderId,String key);
    Optional<DirectMessage> findFirstByConversation_IdOrderBySequenceNumberDesc(Long id);
    @Query("select m from DirectMessage m where m.conversation.id=:id and m.sequenceNumber<:before order by m.sequenceNumber desc")
    List<DirectMessage> history(Long id,long before,Pageable page);
    @Query("select count(m) from DirectMessage m where m.conversation.id=:id and m.sender.userId<>:viewer and m.sequenceNumber>:after")
    long unreadIn(Long id,Integer viewer,long after);
    @Query("""
        select count(m) from DirectMessage m join m.conversation c where m.sender.userId<>:viewer and
        ((c.lowUser.userId=:viewer and m.sequenceNumber>c.lowReadSequence) or
         (c.highUser.userId=:viewer and m.sequenceNumber>c.highReadSequence))
        """)
    long unread(Integer viewer);
}
