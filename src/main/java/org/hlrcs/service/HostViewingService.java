package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.HostViewingsResponse;
import org.hlrcs.dto.response.HostViewingsResponse.PropertySummary;
import org.hlrcs.dto.response.ViewingResponses.Viewing;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.repository.BookingRepository;
import org.hlrcs.repository.RoomRepository;
import org.hlrcs.exception.ResourceNotFoundException;
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
    private final RoomRepository rooms;

    @Transactional(readOnly = true)
    public long availableRooms(Integer id) {
        var booking = bookings.findByBookingIdAndRoomType_Property_Owner_UserId(id, authService.getCurrentUser().getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu xem phòng."));
        return rooms.countPublicVacancies(java.util.List.of(booking.getRoomType().getRoomTypeId())).stream()
                .mapToLong(RoomRepository.VacancyCount::getAvailableRooms).sum();
    }

    @Transactional(readOnly = true)
    public HostViewingsResponse getViewings() {
        Integer ownerId = authService.getCurrentUser().getUserId();
        var owned = properties.findByOwner_UserIdOrderByPropertyIdAsc(ownerId).stream()
                .map(property -> new PropertySummary(property.getPropertyId(), property.getName())).toList();
        var requests = bookings.findByRoomType_Property_Owner_UserIdOrderByCreatedAtDesc(ownerId).stream()
                .map(Viewing::from).toList();
        return new HostViewingsResponse(owned,
                registrations.countByUser_UserIdAndStatus(ownerId, RegistrationStatus.PENDING), requests);
    }
}
