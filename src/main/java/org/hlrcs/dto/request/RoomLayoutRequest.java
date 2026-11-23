package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record RoomLayoutRequest(@NotNull @Positive Integer propertyId,
        @NotNull @Size(min=1,max=5000) List<@NotNull @Valid Draft> rooms) {
    public record Draft(@NotNull @Positive Integer roomTypeId,
            @NotBlank @Size(max=30) String roomNumber, @NotBlank @Size(max=50) String floor) {}
}
