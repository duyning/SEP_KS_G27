package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityPostRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.CommunityPostResponse;
import org.hlrcs.service.CommunityService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/community/posts")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService service;

    @GetMapping
    public ApiResponse<List<CommunityPostResponse>> published() { return ApiResponse.success(service.published()); }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<CommunityPostResponse>> mine() { return ApiResponse.success(service.mine()); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityPostResponse> submit(@Valid @RequestBody CommunityPostRequest request) {
        return ApiResponse.success("Bài viết đã gửi và đang chờ kiểm duyệt.", service.submit(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityPostResponse> resubmit(@PathVariable Integer id, @Valid @RequestBody CommunityPostRequest request) {
        return ApiResponse.success("Đã gửi lại bài viết để kiểm duyệt.", service.resubmit(id, request));
    }
}
