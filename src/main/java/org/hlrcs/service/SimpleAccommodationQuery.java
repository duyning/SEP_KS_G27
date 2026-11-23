package org.hlrcs.service;

import org.hlrcs.service.AccommodationRecommendationService.Criteria;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

final class SimpleAccommodationQuery {
    private static final Pattern INTRO = Pattern.compile(
            "^(?:(?:toi|minh|em) (?:muon|can) )?(?:tim )?phong(?: tro)?(?: |$)");
    private static final Pattern SEPARATOR = Pattern.compile("(?:(?<!\\d),|,(?!\\d)|;)\\s*|\\s+va\\s+|\\s+(?=co )");
    private static final Pattern PRICE_CAP = Pattern.compile(
            "(?:(?:gia(?: thue)?|ngan sach) )?(?:duoi|nho hon|toi da|khong (?:qua|vuot qua)) "
                    + "([0-9]{1,10}(?:[.,][0-9]{1,3}){0,3})\\s*(trieu|tr|nghin|ngan|k|vnd|dong|d)?"
                    + "(?:\\s*(?:/\\s*thang|moi thang))?");
    private static final Pattern WHOLE_VND = Pattern.compile("[0-9]+|[0-9]{1,3}(?:\\.[0-9]{3})+");
    private static final Pattern SCALED_AMOUNT = Pattern.compile("[0-9]+(?:[.,][0-9]{1,3})?");
    private static final BigDecimal MAX_BUDGET = BigDecimal.valueOf(1_000_000_000);
    private static final Map<String, String> AMENITY_NAMES = Map.ofEntries(
            Map.entry("dieu hoa", "airConditioner"), Map.entry("may lanh", "airConditioner"),
            Map.entry("binh nong lanh", "waterHeater"), Map.entry("may nuoc nong", "waterHeater"),
            Map.entry("tu lanh", "refrigerator"), Map.entry("thu lanh", "refrigerator"),
            Map.entry("ban ghe", "desk"), Map.entry("ban ghe lam viec", "desk"), Map.entry("ban lam viec", "desk"),
            Map.entry("ban an", "diningTable"), Map.entry("may giat", "washingMachine"),
            Map.entry("ban cong", "balcony"), Map.entry("ban cong rieng", "balcony"),
            Map.entry("wifi", "wifi"), Map.entry("wi-fi", "wifi"),
            Map.entry("giuong", "bed"), Map.entry("tu quan ao", "wardrobe"),
            Map.entry("nha ve sinh rieng", "privateBathroom"), Map.entry("cua so", "window"),
            Map.entry("thang may", "elevator"));

    private SimpleAccommodationQuery() {}

    static Optional<Criteria> parse(String description) {
        var normalized = AccommodationService.normalized(description).replaceAll("[\\s\\p{Zs}]+", " ").strip();
        var text = INTRO.matcher(normalized).replaceFirst("").strip().replaceFirst("[.!]+$", "");
        BigDecimal maxBudget = null;
        var amenities = new LinkedHashSet<String>();

        // Use the local interpretation only if every clause is understood.
        for (var clause : SEPARATOR.split(text, -1)) {
            var criterion = clause.strip();
            var cap = PRICE_CAP.matcher(criterion);
            if (cap.matches()) {
                if (maxBudget != null) return Optional.empty();
                maxBudget = amountInVnd(cap.group(1), cap.group(2));
                if (maxBudget == null || maxBudget.signum() <= 0 || maxBudget.compareTo(MAX_BUDGET) > 0) {
                    return Optional.empty();
                }
            } else {
                var name = criterion.startsWith("co ") ? criterion.substring(3) : criterion;
                var amenity = AMENITY_NAMES.get(name);
                if (amenity == null) return Optional.empty();
                amenities.add(amenity);
            }
        }
        return Optional.of(new Criteria(null, maxBudget, "all", "all", null, null, List.copyOf(amenities)));
    }

    private static BigDecimal amountInVnd(String amount, String unit) {
        int places = unit == null ? 0 : switch (unit) {
            case "trieu", "tr" -> 6;
            case "nghin", "ngan", "k" -> 3;
            default -> 0;
        };
        if (places == 0) {
            return WHOLE_VND.matcher(amount).matches() ? new BigDecimal(amount.replace(".", "")) : null;
        }
        return SCALED_AMOUNT.matcher(amount).matches()
                ? new BigDecimal(amount.replace(',', '.')).movePointRight(places) : null;
    }
}
