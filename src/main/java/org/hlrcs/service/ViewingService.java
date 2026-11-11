package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ViewingRequests.Create;
import org.hlrcs.dto.request.ViewingRequests.Cancel;
import org.hlrcs.dto.request.ViewingRequests.Decision;
import org.hlrcs.dto.response.ViewingResponses.*;
import org.hlrcs.entity.Booking;
import org.hlrcs.entity.RoomType;
import org.hlrcs.entity.User;
import org.hlrcs.entity.ViewingNotification;
import org.hlrcs.entity.ViewingNotification.Event;
import org.hlrcs.entity.enums.BookingStatus;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.BookingRepository;
import org.hlrcs.repository.RoomTypeRepository;
import org.hlrcs.repository.RoomRepository;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.repository.ViewingNotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ViewingService {
    private static final ZoneId VIEWING_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final EnumSet<BookingStatus> OPEN = EnumSet.of(BookingStatus.PENDING, BookingStatus.APPROVED);

    private final AuthService auth;
    private final UserRepository users;
    private final RoomTypeRepository roomTypes;
    private final AccommodationService accommodations;
    private final RoomRepository rooms;
    private final BookingRepository bookings;
    private final ViewingNotificationRepository notifications;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Viewing create(Create request) {
        // Serialize requests from the same account, including retries arriving on another server.
        var renter = users.findForRegistrationUpdate(currentId()).orElseThrow(ViewingService::missing);
        var type = publicType(request.propertyId(), request.roomTypeId());
        var owner = type.getProperty().getOwner();
        if (owner.getUserId().equals(renter.getUserId())) {
            throw new BadRequestException("Bạn không thể gửi lịch xem nhà trọ của mình.");
        }

        var date = request.scheduledDate().withSecond(0).withNano(0);
        String phone = contactPhone(request.contactPhone());
        String name = request.contactName().strip();
        String note = optionalText(request.note());
        var existing = bookings.findFirstByRenter_UserIdAndRoomType_RoomTypeIdAndScheduledDateOrderByBookingIdDesc(
                renter.getUserId(), type.getRoomTypeId(), date).orElse(null);
        if (existing != null) {
            if (name.equals(existing.getContactName()) && phone.equals(existing.getContactPhone())
                    && Objects.equals(note, existing.getNote())) return Viewing.from(existing);
            if (OPEN.contains(existing.getStatus())) {
                throw new AppException("Bạn đã có yêu cầu xem loại phòng này vào cùng thời điểm.", HttpStatus.CONFLICT);
            }
        }
        var now = LocalDateTime.now(VIEWING_ZONE);
        validateDate(date, now);
        if (pendingFor(renter.getUserId(), type.getRoomTypeId()).isPresent()) {
            throw new AppException("Bạn đã có lịch chờ xác nhận. Vui lòng cập nhật lịch đó.", HttpStatus.CONFLICT);
        }

        var booking = bookings.save(Booking.builder().renter(renter).roomType(type).scheduledDate(date)
                .contactName(name).contactPhone(phone).note(note).status(BookingStatus.PENDING).createdAt(now).build());
        notify(booking, owner, Event.REQUESTED, "Bạn có yêu cầu xem phòng mới.");
        return Viewing.from(booking);
    }

    @Transactional(readOnly = true)
    public Viewing pending(Integer propertyId, Integer roomTypeId) {
        return pendingFor(currentId(), roomTypeId)
                .filter(booking -> booking.getRoomType().getProperty().getPropertyId().equals(propertyId))
                .map(Viewing::from).orElse(null);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Viewing update(Integer id, Create request) {
        Integer renterId = currentId();
        if (!bookings.existsByBookingIdAndRenter_UserId(id, renterId)) throw missing();
        var booking = bookings.findForDecision(id).orElseThrow(ViewingService::missing);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException("Lịch đã được xử lý và không thể cập nhật.", HttpStatus.CONFLICT);
        }

        // Coordinate the date check with new requests and other edits from the same renter.
        users.findForRegistrationUpdate(renterId).orElseThrow(ViewingService::missing);
        var type = booking.getRoomType();
        if (!type.getRoomTypeId().equals(request.roomTypeId())
                || !type.getProperty().getPropertyId().equals(request.propertyId())) throw missing();
        publicType(request.propertyId(), request.roomTypeId());

        var date = request.scheduledDate().withSecond(0).withNano(0);
        validateDate(date, LocalDateTime.now(VIEWING_ZONE));
        if (bookings.existsByRenter_UserIdAndRoomType_RoomTypeIdAndScheduledDateAndStatusInAndBookingIdNot(
                renterId, type.getRoomTypeId(), date, OPEN, id)) {
            throw new AppException("Bạn đã có yêu cầu xem loại phòng này vào cùng thời điểm.", HttpStatus.CONFLICT);
        }

        booking.setScheduledDate(date);
        booking.setContactName(request.contactName().strip());
        booking.setContactPhone(contactPhone(request.contactPhone()));
        booking.setNote(optionalText(request.note()));
        return Viewing.from(booking);
    }

    @Transactional(readOnly = true)
    public ViewingPage list(BookingStatus status, int page) {
        Integer userId = currentId();
        var pageable = page(page, "bookingId");
        var result = status == null ? bookings.findByRenter_UserId(userId, pageable)
                : bookings.findByRenter_UserIdAndStatus(userId, status, pageable);
        var items = result.map(Viewing::from).getContent();
        var covers = accommodations.publicCoverImages(items.stream().map(Viewing::roomTypeId).distinct().toList());
        return new ViewingPage(items, result.hasNext(), covers);
    }

    @Transactional(readOnly = true)
    public Viewing detail(Integer id) {
        return bookings.findByBookingIdAndRenter_UserId(id, currentId()).map(Viewing::from)
                .orElseThrow(ViewingService::missing);
    }

    @Transactional
    public Viewing cancel(Integer id, Cancel request) {
        var renter = auth.getCurrentUser();
        if (!bookings.existsByBookingIdAndRenter_UserId(id, renter.getUserId())) throw missing();
        var booking = bookings.findForDecision(id).orElseThrow(ViewingService::missing);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException("Chỉ lịch đang chờ xác nhận mới có thể hủy.", HttpStatus.CONFLICT);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setProcessedBy(renter);
        booking.setProcessedAt(LocalDateTime.now(VIEWING_ZONE));
        booking.setDecisionReason(optionalText(request.reason()));
        notify(booking, booking.getRoomType().getProperty().getOwner(), Event.CANCELLED,
                "Người đặt đã hủy lịch xem phòng.");
        return Viewing.from(booking);
    }

    @Transactional
    public Viewing decide(Integer id, Decision request) {
        var host = auth.getCurrentUser();
        // Scope before locking so another host cannot use this endpoint to lock a foreign request.
        if (!bookings.existsByBookingIdAndRoomType_Property_Owner_UserId(id, host.getUserId())) throw missing();
        var booking = bookings.findForDecision(id).orElseThrow(ViewingService::missing);
        if (!booking.getRoomType().getProperty().getOwner().getUserId().equals(host.getUserId())) throw missing();

        var decision = request.status();
        if (decision != BookingStatus.APPROVED && decision != BookingStatus.REJECTED) {
            throw new BadRequestException("Chỉ được xác nhận hoặc từ chối yêu cầu.");
        }
        String reason = optionalText(request.reason());
        if (decision == BookingStatus.REJECTED && reason == null) {
            throw new BadRequestException("Vui lòng nhập lý do từ chối.");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException("Yêu cầu này đã được xử lý. Vui lòng tải lại kết quả.", HttpStatus.CONFLICT);
        }
        if (request.expectedScheduledDate() != null && !request.expectedScheduledDate().equals(booking.getScheduledDate())) {
            throw new AppException("Khách vừa đổi giờ hẹn. Vui lòng tải lại lịch trước khi phản hồi.", HttpStatus.CONFLICT);
        }
        var now = LocalDateTime.now(VIEWING_ZONE);
        if (decision == BookingStatus.APPROVED && !booking.getScheduledDate().isAfter(now)) {
            throw new AppException("Giờ hẹn đã qua. Bạn có thể từ chối và đề nghị khách gửi lịch mới.", HttpStatus.CONFLICT);
        }

        var type = booking.getRoomType();
        if (decision == BookingStatus.APPROVED
                && rooms.findFirstByRoomTypeAndPropertyAndStatusOrderByRoomIdAsc(type, type.getProperty(), "VACANT").isEmpty()) {
            throw new AppException("Loại phòng này đã hết phòng trống. Vui lòng tải lại trước khi xử lý.", HttpStatus.CONFLICT);
        }

        booking.setStatus(decision);
        booking.setDecisionReason(reason);
        booking.setProcessedBy(host);
        booking.setProcessedAt(now);
        if (decision == BookingStatus.APPROVED) {
            notify(booking, booking.getRenter(), Event.APPROVED, "Chủ trọ đã xác nhận lịch xem phòng của bạn.");
        } else {
            notify(booking, booking.getRenter(), Event.REJECTED, "Chủ trọ đã từ chối lịch xem phòng của bạn.");
        }
        return Viewing.from(booking);
    }

    @Transactional(readOnly = true)
    public Inbox inbox(boolean unread, int page) {
        var id = currentId();
        var pageable = page(page, "notificationId");
        var result = unread ? notifications.findByRecipient_UserIdAndReadFalse(id, pageable)
                : notifications.findByRecipient_UserId(id, pageable);
        return new Inbox(result.map(Notification::from).getContent(), result.hasNext(),
                notifications.countByRecipient_UserIdAndReadFalse(id));
    }

    @Transactional
    public Notification markRead(Integer id) {
        var notification = notifications.findByNotificationIdAndRecipient_UserId(id, currentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo."));
        notification.setRead(true);
        return Notification.from(notification);
    }

    private void notify(Booking booking, User recipient, Event event, String content) {
        notifications.save(ViewingNotification.builder().booking(booking).recipient(recipient)
                .event(event).content(content + " Nhà trọ: " + booking.getRoomType().getProperty().getName())
                .createdAt(LocalDateTime.now(VIEWING_ZONE)).build());
    }

    private java.util.Optional<Booking> pendingFor(Integer renterId, Integer roomTypeId) {
        return bookings.findFirstByRenter_UserIdAndRoomType_RoomTypeIdAndStatusOrderByBookingIdDesc(
                renterId, roomTypeId, BookingStatus.PENDING);
    }

    private RoomType publicType(Integer propertyId, Integer roomTypeId) {
        return roomTypes.findOne(PublicAccommodationPolicy.visible().and((root, query, cb) -> cb.and(
                cb.equal(root.get("roomTypeId"), roomTypeId),
                cb.equal(root.get("property").get("propertyId"), propertyId))))
                .orElseThrow(() -> new ResourceNotFoundException("Nhà trọ hoặc loại phòng không còn được công khai."));
    }

    private static void validateDate(LocalDateTime date, LocalDateTime now) {
        if (!date.isAfter(now) || date.toLocalDate().isAfter(now.toLocalDate().plusDays(30))) {
            throw new BadRequestException("Chọn giờ trong tương lai, tối đa 30 ngày tới theo giờ Việt Nam.");
        }
    }

    private static String contactPhone(String value) {
        String phone = value.replaceAll("[\\s.()-]", "");
        if (!phone.matches("(?:0|\\+84)[35789]\\d{8}")) {
            throw new BadRequestException("Số điện thoại liên hệ không hợp lệ.");
        }
        return phone.startsWith("+84") ? "0" + phone.substring(3) : phone;
    }

    private Integer currentId() {
        return auth.getCurrentUser().getUserId();
    }

    private static PageRequest page(int page, String idColumn) {
        if (page < 0 || page > Integer.MAX_VALUE / 20) throw new BadRequestException("Trang không hợp lệ.");
        return PageRequest.of(page, 20, Sort.by(Sort.Direction.DESC, idColumn));
    }

    private static String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Không tìm thấy yêu cầu xem phòng.");
    }
}
