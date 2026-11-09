package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ViewingRequests.Create;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.ViewingResponses.*;
import org.hlrcs.entity.enums.BookingStatus;
import org.hlrcs.service.ViewingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/viewings")
@RequiredArgsConstructor
public class ViewingController {
    private final ViewingService service;

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ROOM_HOST')")
    public ApiResponse<Viewing> create(@Valid @RequestBody Create request) {
        return ApiResponse.success(service.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ROOM_HOST')")
    public ApiResponse<ViewingPage> list(@RequestParam(required = false) BookingStatus status,
                                         @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(service.list(status, page));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('USER', 'ROOM_HOST')")
    public ApiResponse<Viewing> pending(@RequestParam Integer propertyId, @RequestParam Integer roomTypeId) {
        return ApiResponse.success(service.pending(propertyId, roomTypeId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ROOM_HOST')")
    public ApiResponse<Viewing> update(@PathVariable Integer id, @Valid @RequestBody Create request) {
        return ApiResponse.success(service.update(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ROOM_HOST')")
    public ApiResponse<Viewing> detail(@PathVariable Integer id) {
        return ApiResponse.success(service.detail(id));
    }

    @GetMapping("/notifications")
    public ApiResponse<Inbox> inbox(@RequestParam(defaultValue = "false") boolean unread,
                                    @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(service.inbox(unread, page));
    }

    @PutMapping("/notifications/{id}/read")
    public ApiResponse<Notification> markRead(@PathVariable Integer id) {
        return ApiResponse.success(service.markRead(id));
    }
}
