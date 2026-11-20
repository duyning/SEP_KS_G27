package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.CollectedPostDtos.*;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.CollectedPostService;
import org.hlrcs.service.FacebookScraperClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

@RestController @RequiredArgsConstructor
public class CollectedPostController {
    private final CollectedPostService posts;
    private final FacebookScraperClient scraper;

    @GetMapping("/api/public/collected-posts")
    public ApiResponse<Feed> publicFeed(@RequestParam(required = false) Long before) {
        return ApiResponse.success(posts.feed(true, before));
    }
    @GetMapping("/api/staff/collected-posts") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<Feed> drafts(@RequestParam(defaultValue = "false") boolean published,
                                   @RequestParam(required = false) Long before) {
        return ApiResponse.success(posts.feed(published, before));
    }
    @PostMapping("/api/staff/collected-posts/scrape") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<ImportResult> scrape(@Valid @RequestBody ScrapeInput input) {
        String url = input.groupUrl().split("\\?", 2)[0].replaceAll("/+$", "")
                .replace("https://facebook.com/", "https://www.facebook.com/")
                .replace("https://m.facebook.com/", "https://www.facebook.com/");
        return ApiResponse.success(posts.store(url, scraper.scrape(url)));
    }
    @PostMapping("/api/staff/collected-posts/publish") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<Integer> publish(@Valid @RequestBody Selection input) { return ApiResponse.success(posts.publish(input, true)); }
    @PostMapping("/api/staff/collected-posts/unpublish") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<Integer> unpublish(@Valid @RequestBody Selection input) { return ApiResponse.success(posts.publish(input, false)); }
    @DeleteMapping("/api/staff/collected-posts/{id}") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<Void> delete(@PathVariable long id) { posts.delete(id); return ApiResponse.success(null); }
    @GetMapping("/api/staff/collected-posts/auth/status") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<AuthStatus> authStatus() { return ApiResponse.success(scraper.auth("status")); }
    @PostMapping("/api/staff/collected-posts/auth/login") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<AuthStatus> login() { return ApiResponse.success(scraper.auth("login")); }
    @PostMapping("/api/staff/collected-posts/auth/cancel") @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<AuthStatus> cancel() { return ApiResponse.success(scraper.auth("cancel")); }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> concurrentImport() {
        return ApiResponse.error("Bài viết vừa được nhập bởi lượt thu thập khác. Hãy tải lại hoặc thu thập lại.");
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> invalidCursor() {
        return ApiResponse.error("Bộ lọc hoặc con trỏ tải bài không hợp lệ.");
    }
}
