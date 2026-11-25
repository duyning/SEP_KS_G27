package org.hlrcs.service;

/** Private invalidation only; message content always comes from authorized REST APIs. */
public record MessagingChanged(Long conversationId,Integer firstUserId,Integer secondUserId) {
    public boolean visibleTo(Integer id) { return id!=null && (id.equals(firstUserId)||id.equals(secondUserId)); }
}
