package org.hlrcs.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record FavoriteResponse(Integer favoriteId, Integer roomTypeId, LocalDateTime createdAt,
                               boolean available, AccommodationSummary accommodation) {
    public record Page(List<FavoriteResponse> items, int page, int size, long totalElements, int totalPages) { }
    public record StateItem(Integer roomTypeId, Integer favoriteId) { }
    public record State(List<StateItem> items, long total) { }
}
