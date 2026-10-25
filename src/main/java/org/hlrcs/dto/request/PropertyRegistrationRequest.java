package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record PropertyRegistrationRequest(
        @NotBlank @Size(min = 3, max = 100) String name,
        @NotBlank String propertyType,
        @NotBlank @Size(min = 30, max = 2000) String description,
        @NotBlank @Size(min = 2, max = 100) String managerName,
        @NotBlank @Size(max = 20) String contactPhone,
        @Size(max = 20) String zaloPhone,
        @NotBlank String commune,
        @NotBlank @Size(min = 10, max = 255) String addressDetail,
        @Size(max = 255) String nearby,
        @NotBlank String latitude,
        @NotBlank String longitude,
        @NotNull @Size(max = 12) List<String> amenities,
        @NotNull @Size(max = 6) List<String> selectedRules,
        @Size(max = 2000) String rules,
        @NotNull @AssertTrue Boolean termsAccepted) {}
