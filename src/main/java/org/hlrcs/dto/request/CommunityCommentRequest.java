package org.hlrcs.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommunityCommentRequest(
        @NotBlank(message = "Vui lòng nhập nội dung bình luận.")
        @Size(max = 2000, message = "Bình luận không được vượt quá 2000 ký tự.") String content
) {
    public CommunityCommentRequest { content = content == null ? "" : content.strip(); }
}
