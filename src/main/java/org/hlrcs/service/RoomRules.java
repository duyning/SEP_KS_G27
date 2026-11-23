package org.hlrcs.service;

import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.AppException;
import org.springframework.http.HttpStatus;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class RoomRules {
    private static final Pattern NUMBER_PREFIX = Pattern.compile("^(?:PHÒNG|P)[. _-]*(?=[0-9])");
    private static final Pattern LEADING_ZEROS = Pattern.compile("^0+(?=[0-9]+$)");

    private RoomRules() {}
    public static String number(String value) {
        String number=value==null?"":value.trim().toUpperCase(java.util.Locale.ROOT);
        if(!number.matches("[\\p{L}\\p{N}][\\p{L}\\p{N} ._-]{0,29}"))throw new BadRequestException("Số phòng cần từ 1 đến 30 ký tự, chỉ gồm chữ, số, dấu cách, chấm, gạch ngang hoặc gạch dưới.");
        return number;
    }
    public static String floor(String value) {
        String floor=value==null?"":value.trim();
        if(floor.isEmpty()||floor.length()>50)throw new BadRequestException("Tầng / khu vực cần từ 1 đến 50 ký tự.");
        return floor;
    }

    static String numberKey(String value) {
        String label = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        String key = NUMBER_PREFIX.matcher(label).replaceFirst("");
        return LEADING_ZEROS.matcher(key).replaceFirst("");
    }

    static Set<String> numberKeys(List<String> numbers) {
        var keys = new HashSet<String>();
        for (var number : numbers) keys.add(numberKey(number));
        return keys;
    }

    static void reserveNumber(Set<String> usedKeys, String number) {
        if (!usedKeys.add(numberKey(number))) {
            throw new AppException("Số phòng " + number + " đã tồn tại trong nhà trọ hoặc bị trùng trong danh sách.", HttpStatus.CONFLICT);
        }
    }
}
