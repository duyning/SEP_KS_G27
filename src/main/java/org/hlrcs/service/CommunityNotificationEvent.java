package org.hlrcs.service;

import org.hlrcs.entity.Comment;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.User;

public record CommunityNotificationEvent(User recipient, Post post, Integer commentId,
                                         String actor, String kind, String reason, String key) {
    static CommunityNotificationEvent reviewed(Post post) {
        return new CommunityNotificationEvent(post.getAuthor(), post, null, null, post.getStatus().name(),
                post.getReviewNote(), "review:" + post.getPostId() + ":" + post.revision() + ":" + post.getStatus());
    }
    static CommunityNotificationEvent hidden(Post post, String reason) {
        return new CommunityNotificationEvent(post.getAuthor(), post, null, null, "HIDDEN", reason,
                "hidden:" + post.getPostId() + ":" + post.revision());
    }
    static CommunityNotificationEvent commented(Comment comment, User recipient, boolean reply) {
        return new CommunityNotificationEvent(recipient, comment.getPost(), comment.getCommentId(),
                comment.getAuthor().getFullName(), reply ? "REPLY" : "COMMENT", null, "comment:" + comment.getCommentId());
    }
}
