package org.hlrcs.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record HostRoomTypesResponse(List<PropertySummary> properties, long pendingRegistrationCount,
                                    List<RoomTypeSummary> roomTypes) {
    public record PropertySummary(Integer propertyId, String name, String address, String status) {}
    public record RoomTypeSummary(Integer roomTypeId, Integer propertyId, String roomType,
                                   BigDecimal price, Float areaSqm, BigDecimal servicePrice,
                                   String description, Integer capacity, BigDecimal deposit, String imageUrl,
                                   List<String> amenities, BigDecimal electricityPrice, BigDecimal waterPrice,
                                   BigDecimal internetPrice, Integer totalRooms, Integer vacantRooms,
                                   java.time.LocalDateTime createdAt, List<Image> images, List<HostRoomsResponse.RoomSummary> rooms,
                                   java.time.Instant availabilityConfirmedAt, String availabilityConfirmationStatus, boolean availabilityStale) {}
    public record Image(Integer imageId, String fileName) {}
}
