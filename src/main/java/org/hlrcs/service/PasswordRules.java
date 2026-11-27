package org.hlrcs.service;

import org.hlrcs.exception.FieldValidationException;
import java.nio.charset.StandardCharsets;

public final class PasswordRules {
    private PasswordRules() {}
    public static void validate(String value) {
        if (value == null || value.isBlank() || value.length() < 6
                || value.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new FieldValidationException("newPassword", "Mật khẩu cần ít nhất 6 ký tự và không quá 72 byte UTF-8.");
    }
}
