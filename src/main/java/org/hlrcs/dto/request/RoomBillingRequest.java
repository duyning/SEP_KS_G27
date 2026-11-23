package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.hlrcs.entity.RoomBill.Kind;
import org.hlrcs.entity.RoomBillPayment.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class RoomBillingRequest {
    private RoomBillingRequest() {}

    public record Period(@NotNull @Positive Integer propertyId, @NotNull @Positive Integer roomId,
                         @NotBlank @Pattern(regexp = "[tc]-[0-9]{1,18}") String tenancyKey,
                         @NotBlank @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])") String month) {}

    public record Schedule(@NotNull @Valid Period period, @NotNull @Min(1) @Max(12) Integer cycleMonths,
                           @NotNull @Min(1) @Max(31) Integer dueDay, @NotNull LocalDate firstDueDate) {}

    public record Charge(@NotBlank @Size(max = 100) String label,
                         @NotNull @Positive @Digits(integer = 12, fraction = 0) BigDecimal amount) {}

    public record Draft(@NotNull @Valid Period period, @NotNull Kind kind, @PositiveOrZero Long revision,
                        @NotNull LocalDate dueDate, @NotNull @PositiveOrZero @Digits(integer = 12, fraction = 0) BigDecimal rentAmount,
                        boolean includeUtilities,
                        @NotNull @Size(max = 20) List<@NotNull @Valid Charge> charges) {}

    public record Issue(@NotNull @PositiveOrZero Long revision) {}

    public record Payment(@NotBlank @Pattern(regexp = "[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}") String requestKey,
                          @NotNull @Positive @Digits(integer = 20, fraction = 0) BigDecimal amount,
                          @NotNull LocalDate paidOn, @NotNull Method method, @Size(max = 400) String note) {}
}
