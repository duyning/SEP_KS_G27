package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RoomUtilityRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.RoomUtilityService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/host/room-utilities")
@PreAuthorize("hasAnyRole('ROOM_HOST','ADMIN')")
@RequiredArgsConstructor
public class RoomUtilityController {
    private final RoomUtilityService utilities;

    @GetMapping
    public ApiResponse<RoomUtilityService.Ledger> list(@RequestParam Integer propertyId, @RequestParam String month) {
        return ApiResponse.success(utilities.list(propertyId, month));
    }

    @PostMapping
    public ApiResponse<RoomUtilityService.Ledger> save(@Valid @RequestBody RoomUtilityRequest request) {
        return ApiResponse.success(utilities.save(request));
    }
}
