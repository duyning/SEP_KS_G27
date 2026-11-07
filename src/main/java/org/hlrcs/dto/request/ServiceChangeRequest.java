package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record ServiceChangeRequest(@NotBlank @Pattern(regexp = "UPDATE|DELETE") String operation,
        @NotNull @PositiveOrZero Integer serviceRevision,
        @Valid ServiceRegistrationRequest details,
        @NotBlank @Size(min = 10, max = 2000) String note) {}
