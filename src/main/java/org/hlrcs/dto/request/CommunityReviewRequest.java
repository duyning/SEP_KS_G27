package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;

public record CommunityReviewRequest(
        @NotBlank(message = "Vui lòng chọn quyết định kiểm duyệt.")
        @Pattern(regexp = "APPROVE|REJECT|REQUEST_CHANGES", message = "Quyết định kiểm duyệt không hợp lệ.")
        String decision,
        @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự.") String note
) {
    public CommunityReviewRequest { note = note == null ? "" : note.strip(); }
}
