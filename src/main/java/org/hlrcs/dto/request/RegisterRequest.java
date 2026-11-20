package org.hlrcs.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @Size(max = 254, message = "Email quá dài")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(max = 72, message = "Mật khẩu quá dài")
    @Pattern(regexp = "(?s)(?=.*\\p{Lu})(?=.*\\p{Ll})(?=.*\\p{Nd}).{8,}",
            message = "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 100, message = "Họ và tên tối đa 100 ký tự")
    private String fullName;

    @Size(max = 12, message = "Số điện thoại không hợp lệ")
    private String phoneNumber;

    @NotBlank(message = "Vui lòng xác minh email hoặc số điện thoại")
    @Size(max = 36, message = "Phiên xác minh không hợp lệ")
    private String verificationToken;
}
