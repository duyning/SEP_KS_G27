package org.hlrcs.service;

import org.hlrcs.exception.BadRequestException;
import java.util.*;

/** Shared normalization for create, resubmit and change proposals. */
public final class ServiceAreaPolicy {
    public static final String ALL = "Tất cả các khu vực";
    public static final List<String> STANDARD = List.of("Tân Xã", "Thạch Hòa", "Bình Yên", "Khu Công nghệ cao Hòa Lạc");
    public record Areas(String standard, String custom) {}
    private ServiceAreaPolicy() {}

    private static String clean(String value) {
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFC).replaceAll("(?U)\\s+", " ").trim();
    }
    private static String displayName(String value) {
        var locale = Locale.forLanguageTag("vi-VN");
        var matcher = java.util.regex.Pattern.compile("(?U)(^|[\\s-])(\\p{L})").matcher(value.toLowerCase(locale));
        return matcher.replaceAll(match -> java.util.regex.Matcher.quoteReplacement(match.group(1) + match.group(2).toUpperCase(locale)));
    }
    private static List<String> split(String value, String separator) {
        if (value == null) return List.of();
        return Arrays.stream(value.split(separator)).map(ServiceAreaPolicy::clean).filter(s -> !s.isEmpty()).toList();
    }
    public static Areas normalize(String standardValue, String customValue, boolean otherEnabled) {
        var original = split(standardValue, "[,;|/\\n]+");
        var customInput = split(customValue, ",");
        if (customInput.stream().map(s -> s.toLowerCase(Locale.ROOT)).distinct().count() > 5)
            throw new BadRequestException("Chỉ được nhập tối đa 5 khu vực khác.");
        if (otherEnabled && customInput.isEmpty()) throw new BadRequestException("Khu vực khác: vui lòng nhập ít nhất một khu vực.");
        if (original.stream().anyMatch(ALL::equalsIgnoreCase)) {
            if (original.stream().anyMatch(s -> !ALL.equalsIgnoreCase(s)) || !customInput.isEmpty() || otherEnabled)
                throw new BadRequestException("Tất cả các khu vực không được chọn cùng khu vực khác.");
            return new Areas(ALL, "");
        }
        var standard = new LinkedHashMap<String, String>();
        var custom = new LinkedHashMap<String, String>();
        // Accept legacy clients that submitted free text in serviceArea; store it separately.
        for (var item : original) {
            var canonical = STANDARD.stream().filter(s -> s.equalsIgnoreCase(item)).findFirst();
            if (canonical.isPresent()) standard.put(canonical.get().toLowerCase(Locale.ROOT), canonical.get());
            else custom.putIfAbsent(item.toLowerCase(Locale.ROOT), item);
        }
        for (var item : customInput) {
            if (item.length() < 2 || item.length() > 100) throw new BadRequestException("Mỗi khu vực khác phải có từ 2 đến 100 ký tự.");
            if (ALL.equalsIgnoreCase(item)) throw new BadRequestException("Hãy dùng ô Tất cả các khu vực thay vì nhập vào Khu vực khác.");
            var canonical = STANDARD.stream().filter(s -> s.equalsIgnoreCase(item)).findFirst();
            if (canonical.isPresent()) standard.put(canonical.get().toLowerCase(Locale.ROOT), canonical.get());
            else custom.putIfAbsent(item.toLowerCase(Locale.ROOT), item);
        }
        if (custom.size() > 5) throw new BadRequestException("Chỉ được nhập tối đa 5 khu vực khác.");
        if (custom.values().stream().anyMatch(s -> s.length() < 2 || s.length() > 100))
            throw new BadRequestException("Mỗi khu vực khác phải có từ 2 đến 100 ký tự.");
        if (standard.isEmpty() && custom.isEmpty()) throw new BadRequestException("Vui lòng chọn ít nhất một khu vực phục vụ.");
        return new Areas(String.join(", ", standard.values()), String.join(", ", custom.values().stream().map(ServiceAreaPolicy::displayName).toList()));
    }
}
