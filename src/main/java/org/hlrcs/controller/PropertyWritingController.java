package org.hlrcs.controller;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.PropertyDescriptionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor @RequestMapping("/api/property-writing")
@PreAuthorize("hasAnyRole('USER','ROOM_HOST','ADMIN')")
public class PropertyWritingController {
    private final PropertyDescriptionService service;
    @PostMapping("/description") public ApiResponse<PropertyDescriptionService.Suggestion> description(@Valid @RequestBody PropertyDescriptionService.Facts facts){return ApiResponse.success(service.generate(facts));}
}
