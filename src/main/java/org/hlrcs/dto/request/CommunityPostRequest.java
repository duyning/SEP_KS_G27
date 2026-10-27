package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** The fields exposed by the existing community form; identity/status come from the server. */
public record CommunityPostRequest(
        @NotBlank(message = "Vui lòng chọn chuyên mục.")
        @Pattern(regexp = "ROOM_TRANSFER|ROOMMATE|SECOND_HAND", message = "Chuyên mục bài viết không hợp lệ.")
        String type,
        @NotBlank(message = "Vui lòng nhập tiêu đề.")
        @Size(min = 10, max = 200, message = "Tiêu đề cần từ 10 đến 200 ký tự.")
        String title,
        @NotBlank(message = "Vui lòng nhập nội dung.")
        @Size(min = 30, max = 5000, message = "Nội dung cần từ 30 đến 5000 ký tự.")
        String content,
        @DecimalMin(value = "0", message = "Giá không được âm.")
        @DecimalMax(value = "1000000000", message = "Giá không được vượt quá 1 tỷ đồng.")
        @Digits(integer = 10, fraction = 0, message = "Giá phải là số nguyên đồng.")
        BigDecimal price,
        @NotBlank(message = "Vui lòng nhập khu vực.")
        @Size(min = 5, max = 255, message = "Khu vực cần từ 5 đến 255 ký tự.")
        String location,
        @NotBlank(message = "Vui lòng nhập tên liên hệ.")
        @Size(min = 2, max = 100, message = "Tên liên hệ cần từ 2 đến 100 ký tự.")
        String authorName,
        @NotBlank(message = "Vui lòng nhập số điện thoại liên hệ.")
        @Pattern(regexp = "(?:0|\\+84)[35789]\\d{8}", message = "Số điện thoại Việt Nam không hợp lệ (ví dụ 0912345678 hoặc +84912345678).")
        String authorPhone
) {
    public CommunityPostRequest {
        type = clean(type);
        title = clean(title);
        content = clean(content);
        location = clean(location);
        authorName = clean(authorName);
        authorPhone = authorPhone == null ? null : authorPhone.trim().replaceAll("[\\s.-]", "");
    }

    private static String clean(String value) { return value == null ? null : value.strip(); }
}
