package org.hlrcs.service;

import org.hlrcs.exception.BadRequestException;

public record SearchOrigin(double latitude, double longitude) {
    public static final double MAX_RADIUS_KM = 50;

    public static SearchOrigin parse(String latitude, String longitude) {
        if (latitude == null && longitude == null) return null;
        try {
            return new SearchOrigin(number(latitude), number(longitude));
        } catch (IllegalArgumentException error) {
            throw new BadRequestException("Cần nhập đủ vĩ độ từ -90 đến 90 và kinh độ từ -180 đến 180.");
        }
    }

    public SearchOrigin {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new IllegalArgumentException();
    }

    public static Double radius(String value, SearchOrigin origin) {
        if (value == null) return null;
        if (origin == null) throw new BadRequestException("Cần chọn điểm gốc để lọc theo bán kính.");
        try {
            double radius = number(value);
            if (radius <= 0 || radius > MAX_RADIUS_KM) throw new IllegalArgumentException();
            return radius;
        } catch (IllegalArgumentException error) {
            throw new BadRequestException("Bán kính phải lớn hơn 0 và tối đa 50 km.");
        }
    }

    private static double number(String value) {
        if (value == null) throw new IllegalArgumentException();
        double number = new java.math.BigDecimal(value.strip()).doubleValue();
        if (!Double.isFinite(number)) throw new IllegalArgumentException();
        return number;
    }

    public double distanceKm(double targetLat, double targetLng) {
        double lat = Math.toRadians(targetLat - latitude);
        double lng = Math.toRadians(targetLng - longitude);
        double a = Math.pow(Math.sin(lat / 2), 2)
                + Math.cos(Math.toRadians(latitude)) * Math.cos(Math.toRadians(targetLat))
                * Math.pow(Math.sin(lng / 2), 2);
        return 12_742 * Math.asin(Math.sqrt(Math.min(1, a)));
    }
}
