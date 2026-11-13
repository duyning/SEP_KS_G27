package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ServiceRegistrationRequest(
        @NotBlank @Size(max = 100) String applicantName,
        @NotNull @Positive Integer categoryId,
        @NotBlank @Size(max = 255) String serviceName,
        @NotBlank @Size(max = 5000) String description,
        @NotBlank @Pattern(regexp = "FIXED|FROM|NEGOTIABLE") String pricingType,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @Size(max = 500) String serviceArea,
        @NotBlank @Size(max = 30) String contactPhone,
        @Email @Size(max = 255) String contactEmail,
        @Size(max = 2000) String customServiceAreas,
        Boolean otherAreasEnabled,
        @Size(max = 20) String priceUnit) {}
