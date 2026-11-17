package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/profile/phone")
public class PhoneVerificationController {
    private final AuthService auth;
    private final PhoneVerificationService verification;
    public PhoneVerificationController(AuthService auth,PhoneVerificationService verification){this.auth=auth;this.verification=verification;}
    public record SendRequest(@NotBlank @Pattern(regexp="^(0|\\+84)[35789][0-9]{8}$",message="Số điện thoại Việt Nam không hợp lệ.") String phoneNumber) { }
    public record CheckRequest(@NotBlank @Pattern(regexp="^(0|\\+84)[35789][0-9]{8}$") String phoneNumber,
        @NotBlank @Pattern(regexp="[0-9]{6}",message="Mã OTP gồm 6 chữ số.") String code) { }
    @PostMapping("/send-otp")
    public ResponseEntity<?> send(@Valid @RequestBody SendRequest request){return ResponseEntity.ok(ApiResponse.success(verification.send(auth.getProfile().getUserId(),request.phoneNumber())));}
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verify(@Valid @RequestBody CheckRequest request){
        var result=verification.verify(auth.getProfile().getUserId(),request.phoneNumber(),request.code());
        if(!Boolean.TRUE.equals(result.get("verified")))return ResponseEntity.badRequest().body(ApiResponse.error((String)result.get("message")));
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@Valid @RequestBody SendRequest request){
        verification.saveVerifiedPhone(auth.getProfile().getUserId(),request.phoneNumber());
        return ResponseEntity.ok(ApiResponse.success(auth.getProfile()));
    }
}
