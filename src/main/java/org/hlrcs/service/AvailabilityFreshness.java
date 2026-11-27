package org.hlrcs.service;

import java.time.Duration;
import java.time.Instant;

/** One server-side rule for host and public readers. Exactly 30 days is still current. */
public final class AvailabilityFreshness {
    private static final Duration CONFIRMATION_WINDOW = Duration.ofDays(30);

    private AvailabilityFreshness() { }
    public static String status(Instant confirmedAt, Instant now) {
        if (confirmedAt == null || confirmedAt.isAfter(now)) return "UNCONFIRMED";
        return confirmedAt.plus(CONFIRMATION_WINDOW).isBefore(now) ? "STALE" : "CURRENT";
    }
    public static String status(Instant confirmedAt) { return status(confirmedAt, Instant.now()); }
    public static boolean stale(Instant confirmedAt) { return "STALE".equals(status(confirmedAt)); }
}
