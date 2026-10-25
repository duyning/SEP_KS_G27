package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.PropertyRegistrationResponse;
import org.hlrcs.service.PropertyRegistrationService;
import org.hlrcs.service.PropertyEditService;
import org.hlrcs.dto.request.PropertyResubmissionRequest;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/host/property-registrations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
public class PropertyRegistrationController {
    private final PropertyRegistrationService service;
    private final PropertyEditService edits;

    @GetMapping("/{id}/edit")
    public ApiResponse<PropertyEditService.Edit> edit(@PathVariable Integer id) { return ApiResponse.success(edits.edit(id)); }

    @PostMapping(value="/{id}/resubmit",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<PropertyRegistrationResponse> resubmit(@PathVariable Integer id,@Valid @RequestPart PropertyResubmissionRequest edit,
        @RequestPart(required=false) List<MultipartFile> photos,@RequestPart(required=false) MultipartFile ownership,
        @RequestPart(required=false) MultipartFile idCard,@RequestPart(required=false) MultipartFile fireSafety) throws IOException {
        return ApiResponse.success(edits.submit(id,edit,photos,ownership,idCard,fireSafety));
    }

    @GetMapping("/eligibility")
    public ApiResponse<PropertyRegistrationService.Eligibility> eligibility() { return ApiResponse.success(service.eligibility()); }

    @GetMapping("/current")
    public ApiResponse<PropertyRegistrationResponse> current() { return ApiResponse.success(service.current()); }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<PropertyRegistrationResponse> submit(@Valid @RequestPart PropertyRegistrationRequest details,
            @RequestPart List<MultipartFile> photos, @RequestPart MultipartFile ownership,
            @RequestPart MultipartFile idCard, @RequestPart(required = false) MultipartFile fireSafety) throws IOException {
        return ApiResponse.success(service.submit(details, photos, ownership, idCard, fireSafety));
    }
}
