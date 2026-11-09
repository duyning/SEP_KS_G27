package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityPostRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.CommunityPostResponse;
import org.hlrcs.service.CommunityService;
import org.hlrcs.service.CommunityFeedService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/community/posts")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService service;
    private final org.hlrcs.service.CommunityImageService images;
    private final CommunityFeedService feed;

    @GetMapping("/feed")
    public ApiResponse<CommunityFeedService.Page> feed(
            @RequestParam(defaultValue = "ALL") String category, @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "all") String location, @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(required = false) String cursor) {
        return ApiResponse.success(feed.page(false, category, q, location, sort, cursor));
    }

    @GetMapping("/mine/feed")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityFeedService.Page> myFeed(
            @RequestParam(defaultValue = "ALL") String category, @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "all") String location, @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(required = false) String cursor) {
        return ApiResponse.success(feed.page(true, category, q, location, sort, cursor));
    }

    @GetMapping("/mine/count")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Long> myCount() { return ApiResponse.success(feed.mineCount()); }

    @GetMapping("/feed/{id}")
    public ApiResponse<CommunityPostResponse> feedPost(@PathVariable Integer id) {
        return ApiResponse.success(feed.one(id, false));
    }

    @GetMapping("/mine/feed/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityPostResponse> myFeedPost(@PathVariable Integer id) {
        return ApiResponse.success(feed.one(id, true));
    }

    @GetMapping
    public ApiResponse<List<CommunityPostResponse>> published() { return ApiResponse.success(service.published()); }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<CommunityPostResponse>> mine() { return ApiResponse.success(service.mine()); }

    @PostMapping(consumes = "application/json")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityPostResponse> submit(@Valid @RequestBody CommunityPostRequest request) {
        return ApiResponse.success("Bài viết đã gửi và đang chờ kiểm duyệt.", service.submit(request));
    }

    @PutMapping(value = "/{id}", consumes = "application/json")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityPostResponse> resubmit(@PathVariable Integer id, @Valid @RequestBody CommunityPostRequest request) {
        return ApiResponse.success("Đã gửi lại bài viết để kiểm duyệt.", service.resubmit(id, request));
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityPostResponse> submitWithImages(@Valid @RequestPart CommunityPostRequest details,
            @RequestPart(required = false) List<org.springframework.web.multipart.MultipartFile> photos,
            @RequestPart(required = false) List<org.springframework.web.multipart.MultipartFile> videos) {
        return ApiResponse.success("Bài viết đã gửi và đang chờ kiểm duyệt.", service.submit(details, photos, videos));
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CommunityPostResponse> resubmitWithImages(@PathVariable Integer id, @Valid @RequestPart CommunityPostRequest details,
            @RequestPart(required = false) List<org.springframework.web.multipart.MultipartFile> photos,
            @RequestPart(required = false) List<org.springframework.web.multipart.MultipartFile> videos) {
        return ApiResponse.success("Đã gửi lại bài viết để kiểm duyệt.", service.resubmit(id, details, photos, videos));
    }

    @GetMapping("/{id}/images/{imageId}")
    public org.springframework.http.ResponseEntity<byte[]> image(@PathVariable Integer id, @PathVariable Integer imageId) {
        var file = images.image(id, imageId);
        return org.springframework.http.ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(file.contentType()))
                .header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff").body(file.bytes());
    }

    @GetMapping("/{id}/videos/{videoId}")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> video(@PathVariable Integer id, @PathVariable Integer videoId) {
        var file = images.content(id, videoId, org.hlrcs.entity.enums.MediaType.VIDEO);
        return org.springframework.http.ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(file.contentType()))
                .header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff")
                .body(new org.springframework.core.io.ByteArrayResource(file.bytes()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ApiResponse.success("Đã xóa bài viết.", null);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public org.springframework.http.ResponseEntity<ApiResponse<java.util.Map<String, String>>> oversizedImages() {
        String message = "Tối đa 6 ảnh (5 MB/ảnh) và 1 video MP4 (50 MB), tổng tệp không quá 80 MB/bài.";
        return org.springframework.http.ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.<java.util.Map<String, String>>builder().success(false).message(message)
                        .data(java.util.Map.of("images", message, "videos", message)).build());
    }
}
