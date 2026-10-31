package org.hlrcs.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/** The fields exposed by the existing community form; identity/status come from the server. */
public record CommunityPostRequest(
        @NotBlank(message = "Vui lòng chọn chuyên mục.")
        @Pattern(regexp = "ROOM_TRANSFER|ROOMMATE|SECOND_HAND", message = "Chuyên mục bài viết không hợp lệ.")
        String type,
        @NotBlank(message = "Vui lòng nhập tiêu đề.")
        @Size(min = 10, max = 100, message = "Tiêu đề cần từ 10 đến 100 ký tự.")
        String title,
        @NotBlank(message = "Vui lòng nhập nội dung.")
        @Size(min = 10, max = 2500, message = "Nội dung cần từ 10 đến 2500 ký tự.")
        String content,
        @DecimalMin(value = "0", message = "Giá không được âm.")
        @DecimalMax(value = "1000000000", message = "Giá không được vượt quá 1 tỷ đồng.")
        @Digits(integer = 10, fraction = 0, message = "Giá phải là số nguyên đồng.")
        BigDecimal price,
        @NotBlank(message = "Vui lòng nhập khu vực.")
        @Size(min = 5, max = 255, message = "Khu vực cần từ 5 đến 255 ký tự.")
        String location,
        @NotBlank(message = "Vui lòng nhập tên liên hệ.")
        @Size(min = 2, max = 50, message = "Tên liên hệ cần từ 2 đến 50 ký tự.")
        String authorName,
        @NotBlank(message = "Vui lòng nhập số điện thoại liên hệ.")
        @Pattern(regexp = "(?:0|\\+84)[35789]\\d{8}", message = "Số điện thoại Việt Nam không hợp lệ (ví dụ 0912345678 hoặc +84912345678).")
        String authorPhone,
        @Size(max = 500, message = "Link Facebook không được vượt quá 500 ký tự.")
        @Pattern(regexp = "(?:https://(?:(?:www\\.|m\\.)?facebook\\.com|(?:www\\.)?fb\\.com)/[^\\s\\\\]+)?", message = "Nhập link Facebook HTTPS hợp lệ, ví dụ https://www.facebook.com/tennguoidung.")
        String facebookUrl,
        @Size(max = 500, message = "Link Zalo không được vượt quá 500 ký tự.")
        @Pattern(regexp = "(?:https://(?:www\\.)?zalo\\.me/[^\\s\\\\]+)?", message = "Nhập link Zalo HTTPS hợp lệ, ví dụ https://zalo.me/0912345678.")
        String zaloUrl,
        @Size(max = 6, message = "Mỗi bài viết được tối đa 6 ảnh.")
        List<@NotNull @Positive Integer> retainedImageIds,
        @Size(max = 1, message = "Mỗi bài viết được tối đa 1 video.")
        List<@NotNull @Positive Integer> retainedVideoIds
) {
    public CommunityPostRequest {
        type = clean(type);
        title = clean(title);
        content = clean(content);
        location = clean(location);
        authorName = clean(authorName);
        authorPhone = authorPhone == null ? null : authorPhone.trim().replaceAll("[\\s.-]", "");
        facebookUrl = clean(facebookUrl);
        zaloUrl = clean(zaloUrl);
    }

    private static String clean(String value) { return value == null ? null : value.strip(); }
}
