package org.hlrcs.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class RegistrationOtpRequest {
    private RegistrationOtpRequest() {}

    public record Send(
            @NotBlank(message = "Vui lòng nhập email hoặc số điện thoại")
            @Size(max = 254, message = "Email hoặc số điện thoại quá dài") String identifier) {}

    public record Verify(
            @NotBlank(message = "Vui lòng nhập email hoặc số điện thoại")
            @Size(max = 254, message = "Email hoặc số điện thoại quá dài") String identifier,
            @NotBlank(message = "Vui lòng nhập mã OTP")
            @Pattern(regexp = "[0-9]{6}", message = "Mã OTP gồm 6 chữ số") String code) {}
}
