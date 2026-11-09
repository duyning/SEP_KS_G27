package org.hlrcs.dto.response;

import java.math.BigDecimal;

/** Public contract shared by accommodation lists and their summary links. No owner documents or contacts. */
public record AccommodationSummary(
        Integer propertyId, Integer roomTypeId, String propertyName, String roomTypeName,
        String address, String imageUrl, BigDecimal price, Float areaSqm,
        String verificationStatus, long availableRooms, Integer capacity, java.util.List<String> amenities,
        BigDecimal electricityPrice, BigDecimal waterPrice, BigDecimal latitude, BigDecimal longitude) {
}
