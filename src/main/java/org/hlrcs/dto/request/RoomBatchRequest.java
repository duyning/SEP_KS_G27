package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record RoomBatchRequest(@NotNull @Size(min=1,max=200) List<@NotNull @Valid Draft> rooms) {
    public record Draft(@NotBlank @Size(max=30) String roomNumber,@NotBlank @Size(max=50) String floor) {}
}
