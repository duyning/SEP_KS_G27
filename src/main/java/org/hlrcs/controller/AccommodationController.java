package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.*;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.service.AccommodationService;
import org.hlrcs.service.AccommodationRecommendationService;
import org.hlrcs.service.SearchOrigin;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class AccommodationController {
    private final AccommodationService service;
    private final AccommodationRecommendationService recommendations;
    private final org.hlrcs.service.PropertyLocationService locations;

    public record RecommendationRequest(@NotBlank @Size(max = 1200) String description,
                                        @Size(max = 1200) String clarification) {}

    @PostMapping("/recommendations")
    public ApiResponse<AccommodationRecommendationService.Result> recommend(@Valid @RequestBody RecommendationRequest request) {
        return ApiResponse.success(recommendations.recommend(request.description(), request.clarification()));
    }

    @GetMapping("/location/nearby")
    public ApiResponse<org.hlrcs.service.PropertyLocationService.Nearby> nearby(@RequestParam double latitude, @RequestParam double longitude) {
        return ApiResponse.success(locations.nearby(latitude, longitude));
    }

    @GetMapping("/search")
    public ApiResponse<AccommodationPage> list(
            @RequestParam(defaultValue = "0") String page, @RequestParam(defaultValue = "6") String size,
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "all") String location,
            @RequestParam(defaultValue = "all") String price, @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "all") String type,
            @RequestParam(defaultValue = "") String amenities,
            @RequestParam(defaultValue = "false") String availableOnly,
            @RequestParam(required = false) String originLat, @RequestParam(required = false) String originLng,
            @RequestParam(required = false) String radiusKm) {
        try {
            if (!"true".equals(availableOnly) && !"false".equals(availableOnly))
                throw new BadRequestException("Trạng thái phòng trống phải là true hoặc false.");
            var origin = SearchOrigin.parse(originLat, originLng);
            return ApiResponse.success(service.list(Integer.parseInt(page), Integer.parseInt(size), q, location, price,
                    sort, type, amenities, Boolean.parseBoolean(availableOnly), origin, SearchOrigin.radius(radiusKm, origin)));
        } catch (NumberFormatException exception) {
            throw new BadRequestException("Trang và kích thước trang phải là số nguyên hợp lệ.");
        }
    }

    @GetMapping("/{propertyId}/room-types/{roomTypeId}")
    public ApiResponse<AccommodationSummary> detail(@PathVariable Integer propertyId, @PathVariable Integer roomTypeId,
            @RequestParam(required = false) String originLat, @RequestParam(required = false) String originLng) {
        return ApiResponse.success(service.detail(propertyId, roomTypeId, SearchOrigin.parse(originLat, originLng)));
    }

    @GetMapping("/{propertyId}/room-types/{roomTypeId}/images/{imageId}")
    public ResponseEntity<byte[]> image(@PathVariable Integer propertyId, @PathVariable Integer roomTypeId, @PathVariable Integer imageId) {
        var image = service.image(propertyId, roomTypeId, imageId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType()))
                .header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").body(image.bytes());
    }

    @GetMapping("/{propertyId}/room-types/{roomTypeId}/details")
    public ApiResponse<AccommodationDetail> fullDetail(@PathVariable Integer propertyId, @PathVariable Integer roomTypeId,
            @RequestParam(required = false) String originLat, @RequestParam(required = false) String originLng) {
        return ApiResponse.success(service.fullDetail(propertyId, roomTypeId, SearchOrigin.parse(originLat, originLng)));
    }
}
