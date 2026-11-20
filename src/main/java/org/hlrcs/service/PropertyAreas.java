package org.hlrcs.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

/** Registration areas shared by validation and reverse-geocoding suggestions. */
final class PropertyAreas {
    static final List<String> VALUES = List.of("Tân Xã", "Thạch Hòa", "Bình Yên",
            "Khu Công nghệ cao Hòa Lạc", "Hòa Lạc", "Hạ Bằng");

    private PropertyAreas() {}

    static String fromAdministrativeNames(List<String> names) {
        // Older locality names can coexist with a broader, current administrative name.
        // Prefer an unambiguous specific area; never infer from a nearby business's name.
        var matches = VALUES.stream().filter(area -> !area.equals("Hòa Lạc"))
                .filter(area -> names.stream().anyMatch(name -> contains(name, area))).toList();
        if (matches.size() == 1) return matches.get(0);
        if (!matches.isEmpty()) return null;
        return names.stream().anyMatch(name -> contains(name, "Hòa Lạc")) ? "Hòa Lạc" : null;
    }

    private static boolean contains(String name, String area) {
        return (" " + normalize(name) + " ").contains(" " + normalize(area) + " ");
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ").trim();
    }
}
