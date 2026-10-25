package org.hlrcs.dto.request;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record PropertyResubmissionRequest(@Valid @NotNull PropertyRegistrationRequest details,
    @NotBlank String versionToken,@NotNull @Size(max=10) List<@NotNull Integer> retainedPhotoIds) {}
