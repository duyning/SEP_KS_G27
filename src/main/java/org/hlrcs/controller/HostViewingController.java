package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ViewingRequests.Decision;
import org.hlrcs.dto.request.ViewingRequests.BatchApproval;
import org.hlrcs.dto.response.ViewingResponses.Viewing;
import org.hlrcs.service.ViewingService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.HostViewingsResponse;
import org.hlrcs.service.HostViewingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/host/viewings")
@RequiredArgsConstructor
public class HostViewingController {
    private final HostViewingService service;
    private final ViewingService viewingService;

    @PostMapping("/batch-approval")
    @PreAuthorize("hasRole('ROOM_HOST')")
    public ApiResponse<List<Viewing>> approveBatch(@Valid @RequestBody BatchApproval request) {
        return ApiResponse.success(viewingService.approveBatch(request));
    }

    @GetMapping("/{id}/availability")
    @PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
    public ApiResponse<Long> availability(@PathVariable Integer id) {
        return ApiResponse.success(service.availableRooms(id));
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("hasRole('ROOM_HOST')")
    public ApiResponse<Viewing> decide(@PathVariable Integer id, @Valid @RequestBody Decision request) {
        return ApiResponse.success(viewingService.decide(id, request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
    public ApiResponse<HostViewingsResponse> getViewings() {
        return ApiResponse.success(service.getViewings());
    }
}
