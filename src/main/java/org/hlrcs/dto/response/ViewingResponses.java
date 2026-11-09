package org.hlrcs.dto.response;

import org.hlrcs.entity.Booking;
import org.hlrcs.entity.enums.BookingStatus;
import org.hlrcs.entity.ViewingNotification;

import java.time.LocalDateTime;
import java.util.List;

public final class ViewingResponses {
    private ViewingResponses() {}

    public record Viewing(Integer bookingId, Integer propertyId, String propertyName, Integer roomTypeId,
                          String roomType, String renterName, String renterPhone, LocalDateTime scheduledDate,
                          BookingStatus status, String note, LocalDateTime createdAt, String decisionReason,
                          LocalDateTime processedAt) {
        public static Viewing from(Booking booking) {
            var type = booking.getRoomType();
            var property = type.getProperty();
            return new Viewing(booking.getBookingId(), property.getPropertyId(), property.getName(),
                    type.getRoomTypeId(), type.getRoomType(),
                    booking.getContactName() == null ? booking.getRenter().getFullName() : booking.getContactName(),
                    booking.getContactPhone() == null ? booking.getRenter().getPhoneNumber() : booking.getContactPhone(),
                    booking.getScheduledDate(), booking.getStatus(), booking.getNote(), booking.getCreatedAt(),
                    booking.getDecisionReason(), booking.getProcessedAt());
        }
    }

    public record ViewingPage(List<Viewing> items, boolean hasNext) {}

    public record Notification(Integer notificationId, Integer bookingId, ViewingNotification.Event event,
                               String content, boolean read, LocalDateTime createdAt) {
        public static Notification from(ViewingNotification notification) {
            return new Notification(notification.getNotificationId(), notification.getBooking().getBookingId(),
                    notification.getEvent(), notification.getContent(), notification.isRead(), notification.getCreatedAt());
        }
    }

    public record Inbox(List<Notification> items, boolean hasNext, long unreadCount) {}
}
