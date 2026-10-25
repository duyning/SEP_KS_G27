package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.HostRoomTypesResponse;
import org.hlrcs.service.HostRoomTypeService;
import org.hlrcs.exception.BadRequestException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/host/room-types")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
public class HostRoomTypeController {
    private final HostRoomTypeService service;

    @PostMapping(consumes = "application/json")
    @PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
    public ApiResponse<HostRoomTypesResponse.RoomTypeSummary> create(@jakarta.validation.Valid @RequestBody org.hlrcs.dto.request.RoomTypeRequest request) {
        return ApiResponse.success(service.create(request));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ApiResponse<HostRoomTypesResponse.RoomTypeSummary> createWithImages(@jakarta.validation.Valid @RequestPart org.hlrcs.dto.request.RoomTypeRequest details,
            @RequestPart(required=false) java.util.List<org.springframework.web.multipart.MultipartFile> photos) {
        return ApiResponse.success(service.save(details,null,photos));
    }
    @PutMapping(value="/{id}",consumes="multipart/form-data")
    public ApiResponse<HostRoomTypesResponse.RoomTypeSummary> update(@PathVariable Integer id, @jakarta.validation.Valid @RequestPart org.hlrcs.dto.request.RoomTypeRequest details,
            @RequestPart(required=false) java.util.List<org.springframework.web.multipart.MultipartFile> photos) {
        return ApiResponse.success(service.save(details,id,photos));
    }
    @GetMapping("/{id}")
    public ApiResponse<HostRoomTypesResponse.RoomTypeSummary> detail(@PathVariable Integer id) { return ApiResponse.success(service.detail(id)); }
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Integer id) { service.delete(id);return ApiResponse.success(null); }
    @GetMapping("/{id}/images/{imageId}")
    public org.springframework.http.ResponseEntity<byte[]> image(@PathVariable Integer id,@PathVariable Integer imageId) {
        var file=service.image(id,imageId);
        return org.springframework.http.ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(file.contentType()))
                .header("Cache-Control","private, no-store").header("X-Content-Type-Options","nosniff").body(file.bytes());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
    public ApiResponse<HostRoomTypesResponse> getRoomTypes(@RequestParam(required = false) String propertyId) {
        Integer selectedId = null;
        if (propertyId != null) {
            try {
                selectedId = Integer.valueOf(propertyId);
                if (selectedId < 1) throw new NumberFormatException();
            } catch (NumberFormatException exception) {
                throw new BadRequestException("Mã nhà trọ không hợp lệ");
            }
        }
        return ApiResponse.success(service.getRoomTypes(selectedId));
    }
}
