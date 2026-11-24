package org.hlrcs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record RentalContractSignatureRequest(
        @NotBlank @Pattern(regexp="[a-f0-9]{64}") String documentHash,
        @NotBlank @Pattern(regexp="TYPED|DRAWN") String method,
        @AssertTrue(message="Vui lòng xác nhận đồng ý ký hợp đồng.") boolean confirmed,
        @Size(max=24) List<@NotNull @Size(min=2, max=180) List<@NotNull @Valid SignaturePoint>> strokes
) {
    public record SignaturePoint(@NotNull @Min(0) @Max(600) Integer x,
                                 @NotNull @Min(0) @Max(200) Integer y) {}
}
