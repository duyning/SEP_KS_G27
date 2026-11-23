package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record RoomSetupRequest(
        @NotNull @Positive Integer propertyId,
        @NotNull @Size(min = 1, max = 20) List<@NotNull @Valid NewType> types,
        @NotNull @Size(max = 5000) List<@NotNull @Valid DraftRoom> rooms) {
    public record NewType(
            @NotNull @Negative Integer localId,
            @NotNull @Valid RoomTypeRequest details,
            @NotNull @Min(0) @Max(10) Integer photoCount) { }

    public record DraftRoom(
            @NotNull Integer roomTypeId,
            @NotBlank @Size(max = 30) String roomNumber,
            @NotBlank @Size(max = 50) String floor) { }
}
