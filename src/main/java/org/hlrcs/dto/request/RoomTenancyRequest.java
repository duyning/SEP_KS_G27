package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record RoomTenancyRequest(
        @NotBlank @Size(min = 2, max = 150) String name,
        @NotBlank @Pattern(regexp = "[+0-9 ().-]{8,20}") String phone,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate
) {
    public record Occupant(
            @NotBlank @Size(min = 2, max = 150) String name,
            @Pattern(regexp = "[+0-9 ().-]{8,20}") String phone,
            @NotNull LocalDate joinedOn
    ) {}

    public record Dated(@NotNull LocalDate date) {}
}
