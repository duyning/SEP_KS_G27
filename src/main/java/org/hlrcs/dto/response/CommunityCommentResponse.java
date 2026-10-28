package org.hlrcs.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record CommunityCommentResponse(Integer id, Integer postId, Integer authorId,
                                       String authorName, String content, LocalDateTime createdAt,
                                       LocalDateTime updatedAt, Integer parentId, Integer replyToId,
                                       String replyToAuthorName, long replyCount) {
    public record CommentPage(List<CommunityCommentResponse> content, int page, int size,
                              long totalElements, int totalPages, long commentCount) {}
}
