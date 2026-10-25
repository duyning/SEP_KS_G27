package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.HostPropertyResponse;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.service.HostPropertyService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/host/property")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
public class HostPropertyController {
    private final HostPropertyService service;
    @GetMapping
    public ApiResponse<HostPropertyResponse> getProperty(@RequestParam(required = false) String id) {
        Integer selected = null;
        if (id != null) try { selected = Integer.valueOf(id); if (selected < 1) throw new NumberFormatException(); }
        catch (NumberFormatException exception) { throw new BadRequestException("Mã nhà trọ không hợp lệ."); }
        return ApiResponse.success(service.getProperties(selected));
    }
    @GetMapping("/photos/{id}")
    public ResponseEntity<byte[]> photo(@PathVariable Integer id) {
        var photo = service.getPhoto(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.contentType()))
                .header("X-Content-Type-Options", "nosniff").header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(photo.content());
    }
}
