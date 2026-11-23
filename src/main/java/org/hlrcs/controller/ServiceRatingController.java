package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.ServiceRatingService;
import org.hlrcs.service.StaffService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController @RequiredArgsConstructor
public class ServiceRatingController {
    private final ServiceRatingService service;
    public record Input(@NotNull @DecimalMin("0") @DecimalMax("5") @Digits(integer = 1, fraction = 0) java.math.BigDecimal stars,
                        @NotBlank @Size(max = 3000) String content) {}
    public record Reply(@NotBlank @Size(max = 3000) String content) {}
    @GetMapping("/api/services/{id}/ratings")
    public ApiResponse<ServiceRatingService.Results> list(@PathVariable Integer id, @RequestParam(required = false) Integer stars, @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(service.list(id, stars, page));
    }
    @PostMapping(value = "/api/services/{id}/ratings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ServiceRatingService.Rating>> submit(@PathVariable Integer id, @Valid @RequestPart("details") Input input,
            @RequestPart(value = "image", required = false) List<MultipartFile> images) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.submit(id, input.stars().intValueExact(), input.content(), images)));
    }
    @PostMapping("/api/service-ratings/{id}/reply")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ServiceRatingService.Rating> reply(@PathVariable Integer id, @Valid @RequestBody Reply input) {
        return ApiResponse.success(service.reply(id, input.content()));
    }
    @GetMapping("/api/services/{id}/ratings/{ratingId}/images/{index}")
    public ResponseEntity<byte[]> image(@PathVariable Integer id, @PathVariable Integer ratingId, @PathVariable int index) {
        return imageResponse(service.image(id, ratingId, index));
    }
    static ResponseEntity<byte[]> imageResponse(StaffService.FileContent file) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType())).cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff").body(file.bytes());
    }
}
