package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record ServiceResubmissionRequest(
        @NotNull @Valid ServiceRegistrationRequest details,
        @NotNull @PositiveOrZero Integer revision,
        @NotNull @Size(max = 5) List<@NotNull @Positive Integer> retainedDocumentIds,
        @NotBlank @Size(min = 10, max = 2000) String note) {}
