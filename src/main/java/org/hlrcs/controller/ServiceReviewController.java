package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.ServiceReviewService;
import org.hlrcs.service.ServiceRegistrationService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/staff/service-applications")
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class ServiceReviewController {
    private final ServiceReviewService service;
    public record Review(@NotBlank String capabilityDecision, @NotBlank String listingDecision, @NotBlank @Size(max = 2000) String reason) {}
    @GetMapping public ApiResponse<List<ServiceRegistrationService.RegistrationInfo>> list() { return ApiResponse.success(service.list()); }
    @GetMapping("/{id}") public ApiResponse<ServiceReviewService.Detail> detail(@PathVariable Integer id) { return ApiResponse.success(service.detail(id)); }
    @PostMapping("/{id}/review")
    public ApiResponse<ServiceReviewService.Detail> review(@PathVariable Integer id, @Valid @RequestBody Review value) {
        return ApiResponse.success(service.review(id, value.capabilityDecision(), value.listingDecision(), value.reason()));
    }
    @GetMapping("/{id}/files/{fileId}")
    public ResponseEntity<byte[]> file(@PathVariable Integer id, @PathVariable Integer fileId) {
        var file = service.file(id, fileId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store").header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment").body(file.bytes());
    }
}
