package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;

public final class PasswordResetRequests {
    private PasswordResetRequests() {}
    public record Send(@NotBlank(message = "Nhập email hoặc SĐT.") @Size(max = 254) String identifier) {}
    public record Verify(@NotBlank(message = "Nhập email hoặc SĐT.") @Size(max = 254) String identifier,
                         @NotBlank @Pattern(regexp = "[0-9]{6}", message = "Mã OTP gồm 6 chữ số.") String code) {}
    public record Confirm(@NotBlank(message = "Nhập email hoặc SĐT.") @Size(max = 254) String identifier,
                          @NotBlank @Pattern(regexp = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
                                  message = "Phiên xác minh không hợp lệ. Vui lòng yêu cầu mã mới.") String verificationToken,
                          @NotBlank(message = "Nhập mật khẩu mới.")
                          @Size(min = 6, max = 72, message = "Mật khẩu cần từ 6 đến 72 ký tự.") String newPassword) {}
}
