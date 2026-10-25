package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.HostDashboardResponse;
import org.hlrcs.service.HostDashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/host")
@RequiredArgsConstructor
public class HostDashboardController {
    private final HostDashboardService service;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
    public ApiResponse<HostDashboardResponse> dashboard() {
        return ApiResponse.success(service.getDashboard());
    }
}
