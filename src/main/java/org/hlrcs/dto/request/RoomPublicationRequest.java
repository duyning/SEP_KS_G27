package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record RoomPublicationRequest(@NotNull @Positive Integer propertyId,
        @NotNull @Size(max=5000) List<@NotNull @Positive Integer> roomIds) {}
