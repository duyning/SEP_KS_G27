package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.HostViewingsResponse;
import org.hlrcs.dto.response.HostViewingsResponse.PropertySummary;
import org.hlrcs.dto.response.HostViewingsResponse.ViewingSummary;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.repository.BookingRepository;
import org.hlrcs.repository.PropertyRepository;
import org.hlrcs.repository.PropertyRegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HostViewingService {
    private final AuthService authService;
    private final PropertyRepository properties;
    private final PropertyRegistrationRepository registrations;
    private final BookingRepository bookings;

    @Transactional(readOnly = true)
    public HostViewingsResponse getViewings() {
        Integer ownerId = authService.getCurrentUser().getUserId();
        var owned = properties.findByOwner_UserIdOrderByPropertyIdAsc(ownerId).stream()
                .map(property -> new PropertySummary(property.getPropertyId(), property.getName())).toList();
        var requests = bookings.findByRoomType_Property_Owner_UserIdOrderByCreatedAtDesc(ownerId).stream()
                .map(booking -> new ViewingSummary(booking.getBookingId(),
                        booking.getRoomType().getProperty().getPropertyId(), booking.getRoomType().getProperty().getName(),
                        booking.getRoomType().getRoomType(), booking.getRenter().getFullName(),
                        booking.getRenter().getPhoneNumber(), booking.getScheduledDate(), booking.getStatus().name(),
                        booking.getNote(), booking.getCreatedAt())).toList();
        return new HostViewingsResponse(owned,
                registrations.countByUser_UserIdAndStatus(ownerId, RegistrationStatus.PENDING), requests);
    }
}
