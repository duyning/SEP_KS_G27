package org.hlrcs.service;

import org.hlrcs.exception.BadRequestException;

public final class RoomRules {
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
}
