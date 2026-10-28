package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.*;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.service.AccommodationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class AccommodationController {
    private final AccommodationService service;

    @GetMapping("/search")
    public ApiResponse<AccommodationPage> list(
            @RequestParam(defaultValue = "0") String page, @RequestParam(defaultValue = "6") String size,
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "all") String location,
            @RequestParam(defaultValue = "all") String price, @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "all") String type) {
        try {
            return ApiResponse.success(service.list(Integer.parseInt(page), Integer.parseInt(size), q, location, price, sort, type));
        } catch (NumberFormatException exception) {
            throw new BadRequestException("Trang và kích thước trang phải là số nguyên hợp lệ.");
        }
    }

    @GetMapping("/{propertyId}/room-types/{roomTypeId}")
    public ApiResponse<AccommodationSummary> detail(@PathVariable Integer propertyId, @PathVariable Integer roomTypeId) {
        return ApiResponse.success(service.detail(propertyId, roomTypeId));
    }

    @GetMapping("/{propertyId}/room-types/{roomTypeId}/images/{imageId}")
    public ResponseEntity<byte[]> image(@PathVariable Integer propertyId, @PathVariable Integer roomTypeId, @PathVariable Integer imageId) {
        var image = service.image(propertyId, roomTypeId, imageId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType()))
                .header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").body(image.bytes());
    }

    @GetMapping("/{propertyId}/room-types/{roomTypeId}/details")
    public ApiResponse<AccommodationDetail> fullDetail(@PathVariable Integer propertyId, @PathVariable Integer roomTypeId) {
        return ApiResponse.success(service.fullDetail(propertyId, roomTypeId));
    }
}
