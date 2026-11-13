package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;

public record ServiceRequestInput(
        @NotNull @Positive Integer serviceId,
        @NotBlank @Size(max = 100) String contactName,
        @NotBlank @Pattern(regexp = "(?:0|\\+84)[35789]\\d{8}") String contactPhone,
        @NotBlank @Size(min = 10, max = 2000) String description,
        @Size(max = 500) String address,
        @NotNull OffsetDateTime scheduledAt) {}
