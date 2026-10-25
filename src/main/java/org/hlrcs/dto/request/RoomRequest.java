package org.hlrcs.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record RoomRequest(
        @NotNull @Positive Integer roomTypeId,
        @NotBlank @Size(max=30) String roomNumber,
        @NotBlank @Size(max=50) String floor,
        @NotBlank @Pattern(regexp="VACANT|OCCUPIED") String status,
        @DecimalMin("1") @DecimalMax("999999999") @Digits(integer=9,fraction=0) BigDecimal customPrice
) {}
