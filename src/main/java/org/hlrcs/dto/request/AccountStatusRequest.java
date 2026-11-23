package org.hlrcs.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record AccountStatusRequest(
        @NotNull(message = "Vui lòng chọn trạng thái tài khoản.")
        @Pattern(regexp = "ACTIVE|INACTIVE", message = "Trạng thái tài khoản không hợp lệ.")
        String status
) {}
