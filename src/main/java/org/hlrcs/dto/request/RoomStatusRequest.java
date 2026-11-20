package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record RoomStatusRequest(
        @NotNull @Positive Integer propertyId,
        @NotNull @Size(min=1,max=200) List<@NotNull @Positive Integer> roomIds,
        @NotBlank @Pattern(regexp="VACANT|OCCUPIED") String status,
        LocalDate leaseStartDate,
        LocalDate leaseEndDate) {}
