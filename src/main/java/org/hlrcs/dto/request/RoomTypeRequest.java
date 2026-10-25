package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record RoomTypeRequest(
        @NotNull @Positive Integer propertyId,
        @NotBlank @Size(min=3,max=100) String roomType,
        @NotNull @DecimalMin("1") @DecimalMax("10000") @Digits(integer=5,fraction=2) BigDecimal areaSqm,
        @NotNull @Min(1) @Max(20) Integer capacity,
        @NotNull @DecimalMin("1") @DecimalMax("999999999") @Digits(integer=9,fraction=0) BigDecimal price,
        @DecimalMin("0") @DecimalMax("999999999") @Digits(integer=9,fraction=0) BigDecimal deposit,
        @Size(max=1000) String imageUrl,
        @Size(max=2000) String description,
        @NotNull @Size(max=12) List<@NotBlank String> amenities,
        @DecimalMin("0") @DecimalMax("999999999") @Digits(integer=9,fraction=0) BigDecimal electricityPrice,
        @DecimalMin("0") @DecimalMax("999999999") @Digits(integer=9,fraction=0) BigDecimal waterPrice,
        @DecimalMin("0") @DecimalMax("999999999") @Digits(integer=9,fraction=0) BigDecimal internetPrice,
        @DecimalMin("0") @DecimalMax("999999999") @Digits(integer=9,fraction=0) BigDecimal servicePrice,
        @Size(max=10) List<@NotNull @Positive Integer> retainedImageIds
) {}
