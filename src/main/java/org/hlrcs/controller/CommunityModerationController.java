package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityReviewRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.CommunityPostResponse;
import org.hlrcs.dto.response.CommunityPostResponse.Detail;
import org.hlrcs.service.CommunityService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/staff/community/posts")
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
@RequiredArgsConstructor
public class CommunityModerationController {
    private final CommunityService service;

    @GetMapping
    public ApiResponse<List<CommunityPostResponse>> list() { return ApiResponse.success(service.moderationList()); }

    @GetMapping("/{id}")
    public ApiResponse<Detail> detail(@PathVariable Integer id) { return ApiResponse.success(service.detail(id)); }

    @PostMapping("/{id}/review")
    public ApiResponse<Detail> review(@PathVariable Integer id, @Valid @RequestBody CommunityReviewRequest request) {
        return ApiResponse.success(service.review(id, request));
    }
}
