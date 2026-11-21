package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"app.maps.vietmap.enabled=false"})
@ActiveProfiles("test")
@TestPropertySource("classpath:application-test.properties")
class RoomBillingTests {
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;
    @Autowired RoomTypeRepository types;
    @Autowired RoomRepository rooms;
    @Autowired RoomTenancyRepository tenancies;
    @Autowired RoomUtilityReadingRepository readings;
    @Autowired JwtTokenProvider tokens;
    @Autowired ObjectMapper json;
    @Autowired Environment env;
    final HttpClient http = HttpClient.newHttpClient();

    private User host() {
        return users.save(User.builder()
                .email("billing-" + UUID.randomUUID() + "@test.invalid")
                .fullName("Chủ trọ Billing")
                .passwordHash("unused-test-only")
                .role(UserRole.ROOM_HOST)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private HttpResponse<String> call(String token, String method, String path, Object body) throws Exception {
        var req = HttpRequest.newBuilder(URI.create("http://localhost:" + env.getProperty("local.server.port") + path));
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (body != null) req.header("Content-Type", "application/json");
        return http.send(
                req.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void fullBillingLifecycleIdempotentPaymentsAndMidMonthTenantChangeoverIsolation() throws Exception {
        var owner = host();
        var otherOwner = host();
        String token = tokens.generateTokenFromUser(owner);
        String otherToken = tokens.generateTokenFromUser(otherOwner);

        var prop = properties.save(Property.builder().owner(owner).name("Nhà trọ Billing").address("Hòa Lạc").status("ACTIVE").build());
        var rt = types.save(RoomType.builder().property(prop).roomType("Studio").price(new BigDecimal("2200000"))
                .internetPrice(new BigDecimal("100000")).servicePrice(new BigDecimal("50000")).build());
        var room = rooms.save(Room.builder().property(prop).roomType(rt).roomNumber("102").floor("Tầng 1").status("OCCUPIED")
                .leaseStartDate(LocalDate.of(2026, 11, 15)).leaseEndDate(LocalDate.of(2027, 11, 14)).build());

        // Tenancy 1 (ended mid-month 2026-11-14)
        var oldLease = new RoomTenancy();
        oldLease.setRoomId(room.getRoomId());
        oldLease.setOwnerId(owner.getUserId());
        oldLease.setStartDate(LocalDate.of(2026, 11, 1));
        oldLease.setEndDate(LocalDate.of(2027, 10, 31));
        oldLease.setClosedDate(LocalDate.of(2026, 11, 14));
        oldLease.setMonthlyRent(new BigDecimal("2200000"));
        oldLease.addOccupant("Khách Cũ", "0901111111", LocalDate.of(2026, 11, 1), true);
        oldLease = tenancies.save(oldLease);

        // Tenancy 2 (started 2026-11-15, active)
        var newLease = new RoomTenancy();
        newLease.setRoomId(room.getRoomId());
        newLease.setOwnerId(owner.getUserId());
        newLease.setActiveRoomId(room.getRoomId());
        newLease.setStartDate(LocalDate.of(2026, 11, 15));
        newLease.setEndDate(LocalDate.of(2027, 11, 14));
        newLease.setMonthlyRent(new BigDecimal("2200000"));
        newLease.addOccupant("Duy Ninh", "0902222222", LocalDate.of(2026, 11, 15), true);
        newLease = tenancies.save(newLease);

        // A reading saved before month-end is final for its tenancy's billing period.
        var savedReading = new RoomUtilityReading();
        savedReading.setTenancyId(newLease.getId());
        savedReading.setRoomId(room.getRoomId());
        savedReading.setOwnerId(owner.getUserId());
        savedReading.setBillingMonth(LocalDate.of(2026, 11, 1));
        savedReading.setPeriodStart(LocalDate.of(2026, 11, 15));
        savedReading.setReadOn(LocalDate.of(2026, 11, 20));
        savedReading.setElectricityStart(BigDecimal.valueOf(100));
        savedReading.setElectricityEnd(BigDecimal.valueOf(120));
        savedReading.setElectricityRate(BigDecimal.valueOf(3500));
        savedReading.setElectricityAmount(BigDecimal.valueOf(70000));
        savedReading.setWaterMode(RoomUtilityReading.WaterMode.METER);
        savedReading.setWaterStart(BigDecimal.valueOf(10));
        savedReading.setWaterEnd(BigDecimal.valueOf(12));
        savedReading.setWaterRate(BigDecimal.valueOf(15000));
        savedReading.setWaterAmount(BigDecimal.valueOf(30000));
        readings.save(savedReading);

        // The previous tenant must not inherit the new tenant's reading.
        var listRes = call(token, "GET", "/api/host/room-billing?propertyId=" + prop.getPropertyId() + "&month=2026-11", null);
        assertEquals(200, listRes.statusCode(), listRes.body());
        var candidates = json.readTree(listRes.body()).path("data").path("candidates");
        assertEquals(2, candidates.size());
        assertEquals("Khách Cũ", candidates.get(0).path("tenantName").asText());
        assertTrue(candidates.get(0).path("utilities").isNull());
        var newCand = candidates.get(1);
        assertEquals("Duy Ninh", newCand.path("tenantName").asText());
        assertEquals("2026-11-20", newCand.path("utilities").path("readOn").asText());

        // 2. Schedule setup for newLease (dueDay 31 tests month-end rule)
        var period = Map.of("propertyId", prop.getPropertyId(), "roomId", room.getRoomId(), "tenancyKey", "t-" + newLease.getId(), "month", "2026-11");
        var schedRes = call(token, "PUT", "/api/host/room-billing/schedule", Map.of("period", period, "cycleMonths", 1, "dueDay", 31, "firstDueDate", "2026-11-21"));
        assertEquals(200, schedRes.statusCode(), schedRes.body());

        // Save the draft with the reading and additional charges.
        var draftBody = Map.of(
                "period", period, "kind", "MAIN", "dueDate", "2026-11-21",
                "rentAmount", 2200000, "includeUtilities", true,
                "charges", List.of(Map.of("label", "Internet", "amount", 100000), Map.of("label", "Phí dịch vụ", "amount", 50000)));
        var draftRes = call(token, "PUT", "/api/host/room-billing/draft", draftBody);
        assertEquals(200, draftRes.statusCode(), draftRes.body());
        var billNode = json.readTree(draftRes.body()).path("data");
        long billId = billNode.path("id").asLong();
        long rev = billNode.path("revision").asLong();
        assertEquals("DRAFT", billNode.path("status").asText());
        assertEquals("70000", billNode.path("electricityAmount").asText());
        assertEquals("30000", billNode.path("waterAmount").asText());
        assertEquals("2450000", billNode.path("totalAmount").asText());

        // 5. Issue bill -> UNPAID; cannot re-draft issued bill (409)
        var issueRes = call(token, "POST", "/api/host/room-billing/" + billId + "/issue", Map.of("revision", rev));
        assertEquals(200, issueRes.statusCode(), issueRes.body());
        assertEquals("UNPAID", json.readTree(issueRes.body()).path("data").path("status").asText());
        assertEquals(409, call(token, "PUT", "/api/host/room-billing/draft", draftBody).statusCode());

        // 6. Partial payment (200.000) + idempotent duplicate requestKey retry -> still only 1 payment!
        String reqKey = UUID.randomUUID().toString();
        var pay1 = Map.of("requestKey", reqKey, "amount", 200000, "paidOn", "2026-11-21", "method", "TRANSFER", "note", "Chuyển khoản đợt 1");
        var payRes1 = call(token, "POST", "/api/host/room-billing/" + billId + "/payments", pay1);
        assertEquals(200, payRes1.statusCode(), payRes1.body());
        var payData1 = json.readTree(payRes1.body()).path("data");
        assertEquals("PARTIAL", payData1.path("bill").path("status").asText());
        assertEquals("200000", payData1.path("bill").path("paidAmount").asText());
        assertEquals("2250000", payData1.path("bill").path("outstanding").asText());
        assertEquals(1, payData1.path("payments").size());

        // Retry with same requestKey -> idempotent, NO duplicate payment!
        var payRetry = call(token, "POST", "/api/host/room-billing/" + billId + "/payments", pay1);
        assertEquals(200, payRetry.statusCode());
        assertEquals("200000", json.readTree(payRetry.body()).path("data").path("bill").path("paidAmount").asText());
        assertEquals(1, json.readTree(payRetry.body()).path("data").path("payments").size());

        // Overpayment rejected (2.300.000 > 2.250.000)
        var overPay = Map.of("requestKey", UUID.randomUUID().toString(), "amount", 2300000, "paidOn", "2026-11-21", "method", "CASH", "note", "");
        assertEquals(400, call(token, "POST", "/api/host/room-billing/" + billId + "/payments", overPay).statusCode());

        // Second payment completes balance -> PAID with 2 distinct payment rows
        var pay2 = Map.of("requestKey", UUID.randomUUID().toString(), "amount", 2250000, "paidOn", "2026-11-21", "method", "CASH", "note", "Thu đủ");
        var payRes2 = call(token, "POST", "/api/host/room-billing/" + billId + "/payments", pay2);
        assertEquals(200, payRes2.statusCode(), payRes2.body());
        var payData2 = json.readTree(payRes2.body()).path("data");
        assertEquals("PAID", payData2.path("bill").path("status").asText());
        assertEquals("0", payData2.path("bill").path("outstanding").asText());
        assertEquals(2, payData2.path("payments").size());

        // Cross-owner privacy check -> 404
        assertEquals(404, call(otherToken, "GET", "/api/host/room-billing/" + billId, null).statusCode());
    }
}
