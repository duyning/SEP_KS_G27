package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.ServiceComplaintService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController @RequiredArgsConstructor @PreAuthorize("isAuthenticated()")
public class ServiceComplaintController {
    private final ServiceComplaintService service;
    public record Input(@NotNull @Min(1) Integer serviceId, @NotBlank @Size(min = 10, max = 3000) String content) {}
    public record Explanation(@NotNull @Min(0) Integer revision, @NotBlank @Size(min = 10, max = 3000) String content) {}
    public record Decision(@NotNull @Min(0) Integer revision, @NotNull @Pattern(regexp = "REQUEST_EXPLANATION|DISMISS|REMOVE") String action,
                           @NotBlank @Size(min = 10, max = 3000) String content) {}
    @GetMapping("/api/service-complaints/mine") public ApiResponse<?> mine() { return ApiResponse.success(service.list("mine")); }
    @GetMapping("/api/service-complaints/incoming") public ApiResponse<?> incoming() { return ApiResponse.success(service.list("incoming")); }
    @GetMapping("/api/staff/service-complaints") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<?> list() { return ApiResponse.success(service.list("staff")); }
    @GetMapping("/api/service-complaints/{id}") public ApiResponse<?> detail(@PathVariable Integer id) { return ApiResponse.success(service.detail(id)); }
    @PostMapping(value = "/api/service-complaints", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submit(@Valid @RequestPart("details") Input input, @RequestPart(value = "image", required = false) List<MultipartFile> images) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.submit(input.serviceId(), input.content(), images)));
    }
    @PostMapping(value = "/api/service-complaints/{id}/explanation", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> explain(@PathVariable Integer id, @Valid @RequestPart("details") Explanation input,
            @RequestPart(value = "image", required = false) List<MultipartFile> images) throws IOException {
        return ApiResponse.success(service.explain(id, input.revision(), input.content(), images));
    }
    @PostMapping("/api/staff/service-complaints/{id}/review") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<?> review(@PathVariable Integer id, @Valid @RequestBody Decision input) {
        return ApiResponse.success(service.review(id, input.revision(), input.action(), input.content()));
    }
    @GetMapping("/api/service-complaints/{id}/images/{index}") public ResponseEntity<byte[]> image(@PathVariable Integer id, @PathVariable int index) {
        return ServiceRatingController.imageResponse(service.image(id, null, index));
    }
    @GetMapping("/api/service-complaints/{id}/events/{eventId}/images/{index}")
    public ResponseEntity<byte[]> eventImage(@PathVariable Integer id, @PathVariable Integer eventId, @PathVariable int index) {
        return ServiceRatingController.imageResponse(service.image(id, eventId, index));
    }
}
