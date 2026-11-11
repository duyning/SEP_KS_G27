package org.hlrcs.service;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;

class AvailabilityFreshnessTests {
    @Test void individualRoomMappingIncludesExpiredAndMissingConfirmationStates() {
        var property=org.hlrcs.entity.Property.builder().propertyId(1).build();
        var type=org.hlrcs.entity.RoomType.builder().roomTypeId(2).property(property).roomType("Studio").build();
        var room=org.hlrcs.entity.Room.builder().roomId(3).property(property).roomType(type).status("VACANT").build();
        var mapping=new RoomMapping(org.mockito.Mockito.mock(tools.jackson.databind.ObjectMapper.class));
        assertEquals("UNCONFIRMED",mapping.summary(room).confirmationStatus());
        room.setConfirmedAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(8));
        assertEquals("STALE",mapping.summary(room).confirmationStatus());assertTrue(mapping.summary(room).confirmationStale());
        room.setConfirmedAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).minusMinutes(1));
        assertEquals("CURRENT",mapping.summary(room).confirmationStatus());assertFalse(mapping.summary(room).confirmationStale());
    }
    @Test void handlesLegacySevenDayBoundaryAndFutureData() {
        var now = Instant.parse("2026-11-11T13:00:00Z");
        assertEquals("UNCONFIRMED", AvailabilityFreshness.status(null, now));
        assertEquals("UNCONFIRMED", AvailabilityFreshness.status(now.plusSeconds(1), now));
        assertEquals("CURRENT", AvailabilityFreshness.status(now, now));
        assertEquals("CURRENT", AvailabilityFreshness.status(now.minus(Duration.ofDays(7)).plusNanos(1), now));
        assertEquals("CURRENT", AvailabilityFreshness.status(now.minus(Duration.ofDays(7)), now));
        assertEquals("STALE", AvailabilityFreshness.status(now.minus(Duration.ofDays(7)).minusNanos(1), now));
    }
}
