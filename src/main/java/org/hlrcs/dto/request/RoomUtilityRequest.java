package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.hlrcs.entity.RoomUtilityReading.WaterMode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record RoomUtilityRequest(
        @NotNull @Positive Integer propertyId,
        @NotBlank @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])") String month,
        @NotNull @Size(min = 1, max = 500) List<@NotNull @Valid Entry> entries
) {
    public record Entry(
            @NotNull @Positive Integer roomId,
            @NotBlank @Pattern(regexp = "[tc]-[0-9]{1,18}") String tenancyKey,
            @PositiveOrZero Long revision,
            @NotNull LocalDate readOn,
            @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal electricityStart,
            @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal electricityEnd,
            @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 0) BigDecimal electricityRate,
            @NotNull WaterMode waterMode,
            @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal waterStart,
            @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal waterEnd,
            @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 0) BigDecimal waterRate,
            @Min(0) @Max(200) Integer occupantCount
    ) {}
}
