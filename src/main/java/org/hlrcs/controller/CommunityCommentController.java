package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityCommentRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.CommunityCommentResponse;
import org.hlrcs.dto.response.CommunityCommentResponse.CommentPage;
import org.hlrcs.service.CommunityCommentService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/community/posts/{postId}/comments")
public class CommunityCommentController {
    private final CommunityCommentService service;

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public org.springframework.http.ResponseEntity<ApiResponse<Void>> invalidParameter() {
        return org.springframework.http.ResponseEntity.badRequest().body(ApiResponse.error("Mã bài viết, mã bình luận và tham số phân trang phải là số nguyên hợp lệ."));
    }

    @GetMapping
    public ApiResponse<CommentPage> list(@PathVariable Integer postId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.list(postId, page, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityCommentResponse> create(@PathVariable Integer postId,
            @Valid @RequestBody CommunityCommentRequest request) {
        return ApiResponse.success("Đã đăng bình luận.", service.create(postId, request));
    }

    @GetMapping("/{commentId}/replies")
    public ApiResponse<CommentPage> replies(@PathVariable Integer postId, @PathVariable Integer commentId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.replies(postId, commentId, page, size));
    }

    @PostMapping("/{commentId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityCommentResponse> reply(@PathVariable Integer postId, @PathVariable Integer commentId,
            @Valid @RequestBody CommunityCommentRequest request) {
        return ApiResponse.success("Đã gửi phản hồi.", service.reply(postId, commentId, request));
    }

    @PutMapping("/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityCommentResponse> update(@PathVariable Integer postId, @PathVariable Integer commentId,
            @Valid @RequestBody CommunityCommentRequest request) {
        return ApiResponse.success("Đã cập nhật bình luận.", service.update(postId, commentId, request));
    }

    @DeleteMapping("/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> delete(@PathVariable Integer postId, @PathVariable Integer commentId) {
        service.delete(postId, commentId);
        return ApiResponse.success("Đã xóa bình luận.", null);
    }
}
