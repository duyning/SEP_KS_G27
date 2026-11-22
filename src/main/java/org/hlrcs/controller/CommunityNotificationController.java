package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.CommunityNotificationService;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/community/notifications")
public class CommunityNotificationController {
    private final CommunityNotificationService notifications;
    @GetMapping
    public ApiResponse<CommunityNotificationService.Inbox> inbox(@RequestParam(defaultValue="0") int page,
                                                               @RequestParam(defaultValue="false") boolean unread) {
        return ApiResponse.success(notifications.inbox(page, unread));
    }
    @GetMapping("/unread-count")
    public ApiResponse<Long> unread() { return ApiResponse.success(notifications.unread()); }
    @PutMapping("/{id}/read")
    public ApiResponse<String> read(@PathVariable Integer id) { notifications.read(id); return ApiResponse.success("Đã đọc."); }
    @PutMapping("/read-all")
    public ApiResponse<String> readAll() { notifications.readAll(); return ApiResponse.success("Đã đọc tất cả."); }
    @DeleteMapping("/read")
    public ApiResponse<Integer> deleteRead() { return ApiResponse.success(notifications.deleteRead()); }
    @GetMapping("/{id}/destination")
    public ApiResponse<String> destination(@PathVariable Integer id) { return ApiResponse.success(notifications.destination(id)); }
}
