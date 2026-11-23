package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RoomBillingRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.RoomBillingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/host/room-billing")
@PreAuthorize("hasAnyRole('ROOM_HOST','ADMIN')")
@RequiredArgsConstructor
public class RoomBillingController {
    private final RoomBillingService billing;

    @GetMapping
    public ApiResponse<RoomBillingService.Ledger> list(@RequestParam Integer propertyId, @RequestParam String month) {
        return ApiResponse.success(billing.list(propertyId, month));
    }

    @PutMapping("/schedule")
    public ApiResponse<RoomBillingService.Ledger> schedule(@Valid @RequestBody RoomBillingRequest.Schedule request) {
        return ApiResponse.success(billing.setSchedule(request));
    }

    @PutMapping("/draft")
    public ApiResponse<RoomBillingService.Bill> draft(@Valid @RequestBody RoomBillingRequest.Draft request) {
        return ApiResponse.success(billing.draft(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<RoomBillingService.Detail> detail(@PathVariable Long id) {
        return ApiResponse.success(billing.detail(id));
    }

    @PostMapping("/{id}/issue")
    public ApiResponse<RoomBillingService.Bill> issue(@PathVariable Long id, @Valid @RequestBody RoomBillingRequest.Issue request) {
        return ApiResponse.success(billing.issue(id, request));
    }

    @PostMapping("/{id}/payments")
    public ApiResponse<RoomBillingService.Detail> payment(@PathVariable Long id, @Valid @RequestBody RoomBillingRequest.Payment request) {
        return ApiResponse.success(billing.pay(id, request));
    }
}
