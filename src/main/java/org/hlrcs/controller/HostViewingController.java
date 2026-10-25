package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.HostViewingsResponse;
import org.hlrcs.service.HostViewingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/host/viewings")
@RequiredArgsConstructor
public class HostViewingController {
    private final HostViewingService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
    public ApiResponse<HostViewingsResponse> getViewings() {
        return ApiResponse.success(service.getViewings());
    }
}
