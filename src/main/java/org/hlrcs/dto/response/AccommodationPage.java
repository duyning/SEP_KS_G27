package org.hlrcs.dto.response;

import java.util.List;

/** Zero-based page index; totals are calculated after applying the public visibility policy. */
public record AccommodationPage(List<AccommodationSummary> items, int page, int size,
                                long totalElements, int totalPages) {
}
