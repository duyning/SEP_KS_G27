package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.HostDashboardResponse;
import org.hlrcs.dto.response.HostDashboardResponse.PropertySummary;
import org.hlrcs.dto.response.HostDashboardResponse.ViewingSummary;
import org.hlrcs.entity.RoomType;
import org.hlrcs.entity.enums.BookingStatus;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HostDashboardService {
    private final AuthService authService;
    private final PropertyRepository properties;
    private final RoomTypeRepository roomTypes;
    private final BookingRepository bookings;
    private final PropertyRegistrationRepository registrations;
    private final RoomRepository rooms;

    @Transactional(readOnly = true)
    public HostDashboardResponse getDashboard() {
        // Ownership comes only from the authenticated principal, never a query parameter.
        Integer ownerId = authService.getCurrentUser().getUserId();
        var ownedProperties = properties.findByOwner_UserIdOrderByPropertyIdAsc(ownerId);
        var ownedTypes = roomTypes.findByProperty_Owner_UserId(ownerId);
        var typesByProperty = ownedTypes.stream().collect(Collectors.groupingBy(type -> type.getProperty().getPropertyId()));
        var summaries = ownedProperties.stream().map(property -> {
            var types = typesByProperty.getOrDefault(property.getPropertyId(), java.util.List.of());
            var minimumPrice = types.stream().map(RoomType::getPrice).filter(Objects::nonNull).min(java.math.BigDecimal::compareTo).orElse(null);
            return new PropertySummary(property.getPropertyId(), property.getName(), property.getAddress(),
                    property.getStatus(), types.size(), minimumPrice);
        }).toList();
        var recent = bookings.findTop5ByRoomType_Property_Owner_UserIdOrderByCreatedAtDesc(ownerId).stream()
                .map(booking -> new ViewingSummary(booking.getBookingId(), booking.getRenter().getFullName(),
                        booking.getRenter().getPhoneNumber(), booking.getRoomType().getProperty().getName(),
                        booking.getRoomType().getRoomType(), booking.getScheduledDate(), booking.getStatus().name())).toList();
        long total=rooms.countByProperty_Owner_UserId(ownerId), vacant=rooms.countByProperty_Owner_UserIdAndStatus(ownerId,"VACANT");
        return new HostDashboardResponse(summaries, ownedTypes.size(),
                bookings.countByRoomType_Property_Owner_UserIdAndStatus(ownerId, BookingStatus.PENDING),
                registrations.countByUser_UserIdAndStatus(ownerId, RegistrationStatus.PENDING), recent,total,vacant,(total==0?0:Math.round(100d*(total-vacant)/total))+"%");
    }
}
