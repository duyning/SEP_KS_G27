package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RentalContractSignatureRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.RentalContractService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rental-contract-signing")
@RequiredArgsConstructor
public class RentalContractSigningController {
    private final RentalContractService contracts;

    public record LinkRequest(@NotNull @Pattern(regexp="[A-Za-z0-9_-]{43}") String token) {}
    public record SignRequest(@NotNull @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,
                              @NotNull @Valid RentalContractSignatureRequest signature) {}

    @PostMapping("/open")
    public ApiResponse<?> open(@Valid @RequestBody LinkRequest request) {
        return ApiResponse.success(contracts.openAsTenant(request.token()));
    }

    @PostMapping("/signature")
    public ApiResponse<?> sign(@Valid @RequestBody SignRequest request) {
        return ApiResponse.success(contracts.signAsTenant(request.token(), request.signature()));
    }
}
