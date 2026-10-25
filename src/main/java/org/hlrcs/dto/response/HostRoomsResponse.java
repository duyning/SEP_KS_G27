package org.hlrcs.dto.response;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record HostRoomsResponse(List<HostRoomTypesResponse.PropertySummary> properties,long pendingRegistrationCount,
        List<HostRoomTypesResponse.RoomTypeSummary> roomTypes,List<RoomSummary> rooms) {
    public record RoomSummary(Integer roomId,Integer propertyId,Integer roomTypeId,String roomType,String roomNumber,String floor,
            String status,BigDecimal price,BigDecimal customPrice,Float areaSqm,Integer capacity,BigDecimal deposit,
            List<String> amenities,LocalDateTime confirmedAt) {}
}
