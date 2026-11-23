package org.hlrcs.service;

import org.hlrcs.entity.Post;
import org.hlrcs.entity.enums.PostStatus;
import org.hlrcs.entity.enums.UserRole;

// Invalidation only: never carry content, contact details, reports or evidence.
public record CommunityRealtimeEvent(String type, Integer postId, Integer recipientId,
                                     boolean publicAudience, boolean staff, boolean admin) {
    public static CommunityRealtimeEvent post(Post post, boolean previouslyPublic) {
        return new CommunityRealtimeEvent("posts", post.getPostId(), post.getAuthor().getUserId(),
                previouslyPublic || post.getStatus() == PostStatus.APPROVED, true, true);
    }
    public static CommunityRealtimeEvent comments(Integer postId) {
        return new CommunityRealtimeEvent("comments", postId, null, true, true, true);
    }
    public static CommunityRealtimeEvent notifications(Integer userId) {
        return new CommunityRealtimeEvent("notifications", null, userId, false, false, false);
    }
    public static CommunityRealtimeEvent reports(Integer postId) {
        return new CommunityRealtimeEvent("reports", postId, null, false, false, true);
    }
    public boolean visibleTo(Integer userId, UserRole role) {
        return publicAudience || recipientId != null && recipientId.equals(userId)
                || staff && role == UserRole.STAFF || admin && role == UserRole.ADMIN;
    }
}
