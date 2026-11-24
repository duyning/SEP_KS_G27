package org.hlrcs.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.hlrcs.entity.enums.BookingStatus;

import java.time.LocalDateTime;
import java.util.List;

public final class ViewingRequests {
    private ViewingRequests() {}

    public record Create(@NotNull @Positive Integer propertyId, @NotNull @Positive Integer roomTypeId,
                         @NotNull LocalDateTime scheduledDate, @NotBlank @Size(max = 120) String contactName,
                         @NotBlank @Size(max = 40) String contactPhone, @Size(max = 1000) String note) {}

    public record Cancel(@Size(max = 500) String reason) {}

    public record Decision(@NotNull BookingStatus status, @Size(max = 500) String reason, LocalDateTime expectedScheduledDate) {}

    public record ApprovalItem(@NotNull @Positive Integer bookingId, @NotNull LocalDateTime expectedScheduledDate) {}

    public record BatchApproval(@NotNull LocalDateTime from, @NotNull LocalDateTime to,
                                @NotEmpty @Size(max = 50) List<@NotNull @Valid ApprovalItem> items) {}
}
