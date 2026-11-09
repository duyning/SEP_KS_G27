package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityReviewRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.CommunityPostResponse;
import org.hlrcs.dto.response.CommunityPostResponse.Detail;
import org.hlrcs.service.CommunityService;
import org.hlrcs.service.CommunityAutoModeration;
import org.hlrcs.service.CommunityAutoModeration.Mode;
import org.hlrcs.service.CommunityAutoModeration.Settings;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/staff/community/posts")
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@RequiredArgsConstructor
public class CommunityModerationController {
    private final CommunityService service;
    private final CommunityAutoModeration autoModeration;

    @GetMapping("/auto-moderation")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Settings> autoModerationSettings() {
        return ApiResponse.success(autoModeration.settings());
    }

    @PutMapping("/auto-moderation")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Settings> changeAutoModeration(@Valid @RequestBody ModeRequest request) {
        return ApiResponse.success(autoModeration.changeMode(request.mode()));
    }

    public record ModeRequest(@NotNull Mode mode) {}

    @GetMapping
    public ApiResponse<List<CommunityPostResponse>> list() { return ApiResponse.success(service.moderationList()); }

    @GetMapping("/{id}")
    public ApiResponse<Detail> detail(@PathVariable Integer id) { return ApiResponse.success(service.detail(id)); }

    @PostMapping("/{id}/review")
    public ApiResponse<Detail> review(@PathVariable Integer id, @Valid @RequestBody CommunityReviewRequest request) {
        return ApiResponse.success(service.review(id, request));
    }
}
