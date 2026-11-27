package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.PasswordResetRequests.*;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.AuthService;
import org.hlrcs.service.PasswordResetService;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class PasswordResetController {
    private final PasswordResetService service;
    private final AuthService auth;
    @PostMapping("/password-reset/send-otp")
    public ApiResponse<PasswordResetService.Sent> send(@Valid @RequestBody Send body) {
        return ApiResponse.success(service.send(body.identifier(), null));
    }
    @PostMapping("/password-reset/verify-otp")
    public ApiResponse<PasswordResetService.Verified> verify(@Valid @RequestBody Verify body) {
        return ApiResponse.success(service.verify(body.identifier(), body.code(), null));
    }
    @PostMapping("/password-reset/confirm")
    public ApiResponse<Void> confirm(@Valid @RequestBody Confirm body) {
        service.confirm(body.identifier(), body.verificationToken(), body.newPassword(), null);
        return ApiResponse.success("Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.", null);
    }
    @PostMapping("/profile/password-reset/send-otp")
    public ApiResponse<PasswordResetService.Sent> sendMine(@Valid @RequestBody Send body) {
        return ApiResponse.success(service.send(body.identifier(), auth.getCurrentUser().getUserId()));
    }
    @PostMapping("/profile/password-reset/verify-otp")
    public ApiResponse<PasswordResetService.Verified> verifyMine(@Valid @RequestBody Verify body) {
        return ApiResponse.success(service.verify(body.identifier(), body.code(), auth.getCurrentUser().getUserId()));
    }
    @PostMapping("/profile/password-reset/confirm")
    public ApiResponse<Void> confirmMine(@Valid @RequestBody Confirm body) {
        service.confirm(body.identifier(), body.verificationToken(), body.newPassword(), auth.getCurrentUser().getUserId());
        return ApiResponse.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại.", null);
    }
}
