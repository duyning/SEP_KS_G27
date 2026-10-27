package org.hlrcs.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CommunityPostResponse(
        Integer id, String type, String typeLabel, String title, String content,
        BigDecimal price, String location, String authorName, String authorPhone,
        String status, LocalDateTime createdAt, LocalDateTime updatedAt,
        String decisionNote, String reviewedBy, LocalDateTime reviewedAt
) {
    public record Activity(Integer id, String action, String note, String staffName, LocalDateTime createdAt) {}
    public record Detail(CommunityPostResponse post, String accountName, List<Activity> history) {}
}
