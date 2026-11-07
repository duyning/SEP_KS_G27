package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.StaffResponse.*;
import org.hlrcs.service.StaffService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class StaffController {
    private final StaffService service;
    @GetMapping("/dashboard") public ApiResponse<Dashboard> dashboard() { return ApiResponse.success(service.dashboard()); }
    @GetMapping("/verifications") public ApiResponse<List<Verification>> verifications() { return ApiResponse.success(service.verifications()); }
    @GetMapping("/verifications/{id}") public ApiResponse<Detail> detail(@PathVariable Integer id) { return ApiResponse.success(service.detail(id)); }
    @GetMapping("/verifications/{id}/files/{fileId}")
    public ResponseEntity<byte[]> file(@PathVariable Integer id, @PathVariable Integer fileId) {
        var file = service.file(id, fileId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store").header("X-Content-Type-Options", "nosniff").body(file.bytes());
    }
    public record Review(@NotBlank String decision, @Size(max = 2000) String note, @Size(max=18) List<String> requestedFields, @Size(max=18) Map<String, @Size(max = 500) String> fieldNotes, @NotNull @PositiveOrZero Long assignmentVersion) {}
    @PostMapping("/verifications/{id}/review")
    @PreAuthorize("hasRole('STAFF') and !hasRole('ADMIN')")
    public ApiResponse<Detail> review(@PathVariable Integer id, @Valid @RequestBody Review review) { return ApiResponse.success(service.review(id, review.decision(), review.note(),review.requestedFields(),review.fieldNotes(),review.assignmentVersion())); }
}
