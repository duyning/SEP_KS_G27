package org.hlrcs.controller;

import org.hlrcs.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestAccessController {

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<String>> publicAccess() {
        return ResponseEntity.ok(ApiResponse.success("Nội dung công khai: Bất kỳ ai cũng có thể truy cập.", null));
    }

    @GetMapping("/user")
    @PreAuthorize("hasAnyRole('USER', 'ROOM_HOST', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<String>> userAccess() {
        return ResponseEntity.ok(ApiResponse.success("Nội dung người dùng: Dành cho tất cả các tài khoản đã đăng nhập.", null));
    }

    @GetMapping("/host")
    @PreAuthorize("hasAnyRole('ROOM_HOST', 'ADMIN')")
    public ResponseEntity<ApiResponse<String>> hostAccess() {
        return ResponseEntity.ok(ApiResponse.success("Nội dung chủ trọ: Dành riêng cho ROOM_HOST hoặc ADMIN.", null));
    }

    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<String>> staffAccess() {
        return ResponseEntity.ok(ApiResponse.success("Nội dung kiểm duyệt: Dành riêng cho STAFF hoặc ADMIN.", null));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> adminAccess() {
        return ResponseEntity.ok(ApiResponse.success("Nội dung quản trị viên: Dành riêng cho ADMIN.", null));
    }
}
