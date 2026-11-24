package org.hlrcs.service;

import org.hlrcs.exception.FieldValidationException;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public record RegistrationContact(String identifier, boolean phone) {
    private static final String PHONE_EMAIL_SUFFIX = "@hlrcs.user";
    private static final Pattern PHONE = Pattern.compile("(?:0|\\+84)[35789][0-9]{8}");
    private static final String EMAIL_ATOM = "[a-z0-9!#$%&'*+/=?^_`{|}~-]+";
    private static final String DOMAIN_LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
    private static final Pattern EMAIL = Pattern.compile(
            EMAIL_ATOM + "(?:\\." + EMAIL_ATOM + ")*@" + DOMAIN_LABEL + "(?:\\." + DOMAIN_LABEL + ")+");

    public static RegistrationContact parse(String input) {
        String value = input == null ? "" : input.trim().toLowerCase(Locale.ROOT);
        String localPhone = localPhone(value);
        if (localPhone != null) {
            return new RegistrationContact(localPhone, true);
        }
        int at = value.indexOf('@');
        if (value.length() <= 254 && at <= 64 && EMAIL.matcher(value).matches() && !value.endsWith(PHONE_EMAIL_SUFFIX)) {
            return new RegistrationContact(value, false);
        }
        throw new FieldValidationException("identifier", "Email hoặc số điện thoại không hợp lệ.");
    }

    public String accountEmail() {
        return phone ? identifier + PHONE_EMAIL_SUFFIX : identifier;
    }

    public String internationalPhone() {
        return "84" + identifier.substring(1);
    }

    public List<String> phoneVariants() {
        return List.of(identifier, "+" + internationalPhone());
    }

    public static String localPhone(String value) {
        if (!PHONE.matcher(value).matches()) return null;
        return value.startsWith("+84") ? "0" + value.substring(3) : value;
    }
}
