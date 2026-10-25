package org.hlrcs.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record HostDashboardResponse(
        List<PropertySummary> properties, int roomTypeCount,
        long pendingViewingCount, long pendingRegistrationCount,
        List<ViewingSummary> recentViewings, long totalRoomCount, long availableRoomCount, String occupancyRate) {
    public record PropertySummary(Integer propertyId, String name, String address,
                                  String status, long roomTypeCount, BigDecimal minimumPrice) {}
    public record ViewingSummary(Integer bookingId, String renterName, String renterPhone,
                                 String propertyName, String roomType, LocalDateTime scheduledDate,
                                 String status) {}
}
