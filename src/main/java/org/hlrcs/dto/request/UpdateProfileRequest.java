package org.hlrcs.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 100, message = "Họ và tên tối đa 100 ký tự")
    private String fullName;

    @Pattern(regexp = "^(?:|0[35789][0-9]{8}|\\+84[35789][0-9]{8})$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;

    @Size(max = 255, message = "Trường học / nơi làm việc tối đa 255 ký tự")
    private String organization;

    @Size(max = 255, message = "Khu vực ưu tiên tối đa 255 ký tự")
    private String preferredArea;

    @Size(max = 3500000, message = "Ảnh đại diện tối đa 2.5 MB")
    private String avatar;
}
