package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/property-location")
@PreAuthorize("hasAnyRole('USER','ROOM_HOST','ADMIN')")
public class PropertyLocationController {
    private final VietmapLocationService service;
    public record Search(@NotBlank @Size(max=200) String text,Double latitude,Double longitude) {}
    public record Place(@NotBlank @Size(max=4096) String refId) {}
    public record Pin(@NotNull Double latitude,@NotNull Double longitude) {}
    @GetMapping("/status") public ApiResponse<VietmapLocationService.Status> status(){return ApiResponse.success(service.status());}
    @PostMapping("/autocomplete") public ApiResponse<List<VietmapLocationService.Suggestion>> autocomplete(@Valid @RequestBody Search input){return ApiResponse.success(service.autocomplete(input.text(),input.latitude(),input.longitude()));}
    @PostMapping("/place") public ApiResponse<PropertyLocationService.Location> place(@Valid @RequestBody Place input){return ApiResponse.success(service.place(input.refId()));}
    @PostMapping("/reverse") public ApiResponse<PropertyLocationService.Location> reverse(@Valid @RequestBody Pin input){return ApiResponse.success(service.reverse(input.latitude(),input.longitude()));}
}
