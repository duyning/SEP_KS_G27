package org.hlrcs.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record HostViewingsResponse(List<PropertySummary> properties, long pendingRegistrationCount,
                                  List<ViewingSummary> viewings) {
    public record PropertySummary(Integer propertyId, String name) {}
    public record ViewingSummary(Integer bookingId, Integer propertyId, String propertyName,
                                 String roomType, String renterName, String renterPhone,
                                 LocalDateTime scheduledDate, String status, String note,
                                 LocalDateTime createdAt) {}
}
