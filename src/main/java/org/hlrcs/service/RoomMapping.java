package org.hlrcs.service;
import org.hlrcs.entity.Room;
import org.hlrcs.dto.response.HostRoomsResponse.RoomSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.util.List;

@Component @RequiredArgsConstructor
public class RoomMapping {
    private final ObjectMapper json;
    public RoomSummary summary(Room room) {
        var type=room.getRoomType();List<String> amenities=List.of();
        var confirmed = room.getConfirmedAt() == null ? null : room.getConfirmedAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        var freshness = AvailabilityFreshness.status(confirmed);
        if(type.getAmenitiesJson()!=null)try{amenities=java.util.Arrays.asList(json.readValue(type.getAmenitiesJson(),String[].class));}catch(tools.jackson.core.JacksonException ignored){/* Legacy type without structured amenities. */}
        return new RoomSummary(room.getRoomId(),room.getProperty().getPropertyId(),type.getRoomTypeId(),type.getRoomType(),room.getRoomNumber(),room.getFloor(),room.getStatus(),
                room.getCustomPrice()==null?type.getPrice():room.getCustomPrice(),room.getCustomPrice(),type.getAreaSqm(),type.getCapacity(),type.getDeposit(),amenities,room.getConfirmedAt(),freshness,"STALE".equals(freshness));
    }
}
