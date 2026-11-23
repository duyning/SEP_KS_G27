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
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"app.maps.vietmap.enabled=false","rental.contract.scan.key="})
@ActiveProfiles("test") @TestPropertySource("classpath:application-test.properties")
class RentalContractTests {
    @Autowired UserRepository users;@Autowired PropertyRepository properties;@Autowired RoomTypeRepository types;
    @Autowired RoomRepository rooms;@Autowired RentalContractRepository contracts;@Autowired JwtTokenProvider tokens;
    @Autowired ObjectMapper json;@Autowired Environment env;
    final HttpClient http=HttpClient.newHttpClient();
    User user(UserRole role){return users.save(User.builder().email("contract-"+UUID.randomUUID()+"@test.invalid").fullName("Contract fixture").passwordHash("unused-test-only").role(role).status(UserStatus.ACTIVE).build());}
    record Fixture(User owner,Property property,List<Room> rooms,String token){}
    Fixture fixture(){var u=user(UserRole.ROOM_HOST);var p=properties.save(Property.builder().owner(u).name("Nhà trọ kiểm thử").address("Hòa Lạc").status("ACTIVE").build());var t=types.save(RoomType.builder().property(p).roomType("Studio").price(new BigDecimal("2200000")).build());var rows=List.of("101","102").stream().map(n->rooms.save(Room.builder().property(p).roomType(t).roomNumber(n).floor("Tầng 1").status("VACANT").build())).toList();return new Fixture(u,p,rows,tokens.generateTokenFromUser(u));}
    HttpResponse<String> call(String token,String method,String path,Object body)throws Exception{
        var req=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+path));if(token!=null)req.header("Authorization","Bearer "+token);
        if(body!=null)req.header("Content-Type","application/json");
        return http.send(req.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
    }
    Map<String,Object> draft(Room r,String name){var d=new HashMap<String,Object>();d.putAll(Map.of("roomId",r.getRoomId(),"template","BASIC","landlordName","Chủ nhà","landlordPhone","0901234567","tenantName",name,"tenantPhone","0912345678","tenantIdentity","012345678901","tenantAddress","Hà Nội","rent",2200000,"deposit",2200000));d.putAll(Map.of("paymentDay",5,"terms","Nội dung thỏa thuận đã được hai bên kiểm tra.","reviewed",true));return d;}
    Map<String,Object> payload(Fixture f){var p=new HashMap<String,Object>();p.putAll(Map.of("propertyId",f.property.getPropertyId(),"roomIds",f.rooms.stream().map(Room::getRoomId).toList(),"status","OCCUPIED","leaseStartDate","2026-11-18","leaseEndDate","2027-11-18"));return p;}

    @Test void issuesRentOnItsCycleAndRetainsPartialPaymentsAfterReturn() throws Exception {
        var f = fixture();
        var room = f.rooms().get(0);
        int propertyId = f.property().getPropertyId();
        var month = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(4);
        var today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        var draft = draft(room, "Người thuê ba tháng");
        draft.put("paymentCycle", "3 tháng/lần");
        draft.put("firstPaymentDate", month.atDay(5));
        var status = call(f.token(), "PATCH", "/api/host/rooms/status", Map.of("propertyId", propertyId,
                "roomIds", List.of(room.getRoomId()), "status", "OCCUPIED", "leaseStartDate", month.atDay(1),
                "leaseEndDate", month.plusMonths(5).atEndOfMonth(), "contracts", List.of(draft)));
        assertEquals(200, status.statusCode(), status.body());

        String api = "/api/host/room-billing";
        String query = "?propertyId=" + propertyId + "&month=";
        var ledger = call(f.token(), "GET", api + query + month, null);
        assertEquals(200, ledger.statusCode(), ledger.body());
        var current = json.readTree(ledger.body()).path("data").path("candidates").path(0);
        assertEquals(3, current.path("schedule").path("cycleMonths").asInt());
        assertEquals("6600000", current.path("rent").path("amount").asText());
        assertEquals(month.plusMonths(2).atEndOfMonth().toString(), current.path("rent").path("through").asText());
        var between = json.readTree(call(f.token(), "GET", api + query + month.plusMonths(1), null).body()).path("data").path("candidates").path(0);
        assertTrue(between.path("rent").isNull());
        var key = current.path("tenancyKey").asText();
        var period = Map.of("propertyId", propertyId, "roomId", room.getRoomId(), "tenancyKey", key, "month", month.toString());
        var body = Map.of("period", period, "kind", "MAIN", "dueDate", month.atDay(5), "rentAmount", "6600000",
                "includeUtilities", false, "charges", List.of(Map.of("label", "Phí vệ sinh", "amount", "30000")));
        var saved = call(f.token(), "PUT", api + "/draft", body);
        assertEquals(200, saved.statusCode(), saved.body());
        var bill = json.readTree(saved.body()).path("data");
        assertEquals("DRAFT", bill.path("status").asText());
        assertEquals("6630000", bill.path("totalAmount").asText());
        long id = bill.path("id").asLong();
        String billPath = api + "/" + id;
        var entry = Map.of("requestKey", UUID.randomUUID().toString(), "amount", "2000000", "paidOn", today, "method", "TRANSFER");
        assertEquals(409, call(f.token(), "POST", billPath + "/payments", entry).statusCode());
        var issued = call(f.token(), "POST", billPath + "/issue", Map.of("revision", bill.path("revision").asLong()));
        assertEquals(200, issued.statusCode(), issued.body());
        assertEquals(409, call(f.token(), "PUT", api + "/draft", body).statusCode());
        assertEquals(409, call(f.token(), "PUT", api + "/schedule", Map.of("period", period,
                "cycleMonths", 1, "dueDay", 5, "firstDueDate", month.atDay(5))).statusCode());
        assertEquals(200, call(f.token(), "POST", billPath + "/payments", entry).statusCode());
        var repeated = call(f.token(), "POST", billPath + "/payments", entry);
        assertEquals(200, repeated.statusCode(), repeated.body());
        var result = json.readTree(repeated.body()).path("data");
        assertEquals("PARTIAL", result.path("bill").path("status").asText());
        assertEquals("4630000", result.path("bill").path("outstanding").asText());
        assertTrue(result.path("bill").path("overdue").asBoolean());
        assertEquals(1, result.path("payments").size());
        assertEquals(400, call(f.token(), "POST", billPath + "/payments", Map.of("requestKey", UUID.randomUUID().toString(),
                "amount", 4630001, "paidOn", today, "method", "CASH")).statusCode());
        var otherOwner = tokens.generateTokenFromUser(user(UserRole.ROOM_HOST));
        assertEquals(404, call(otherOwner, "GET", billPath, null).statusCode());
        assertEquals(404, call(otherOwner, "POST", billPath + "/payments", entry).statusCode());

        String close = "/api/host/rooms/" + room.getRoomId() + "/tenancies/" + key + "/close";
        assertEquals(200, call(f.token(), "POST", close, Map.of("date", today)).statusCode());
        var older = json.readTree(call(f.token(), "GET", api + query + month.plusMonths(1), null).body()).path("data").path("earlierDebt");
        assertEquals("Người thuê ba tháng", older.path(0).path("tenantName").asText());
        assertEquals("4630000", older.path(0).path("outstanding").asText());
        var settled = call(f.token(), "POST", billPath + "/payments", Map.of("requestKey", UUID.randomUUID().toString(),
                "amount", 4630000, "paidOn", today, "method", "CASH"));
        assertEquals(200, settled.statusCode(), settled.body());
        var paid = json.readTree(settled.body()).path("data");
        assertEquals("PAID", paid.path("bill").path("status").asText());
        assertFalse(paid.path("bill").path("overdue").asBoolean());
        assertEquals(2, paid.path("payments").size());
    }

    @Test void addsOnlyFinalReadingsAndRequiresRefreshingChangedUtilityDraft() throws Exception {
        var f = fixture();
        var room = f.rooms().get(0);
        var month = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(1);
        int propertyId = f.property().getPropertyId();
        var started = call(f.token(), "POST", "/api/host/rooms/" + room.getRoomId() + "/tenancies",
                Map.of("name", "Người thuê bổ sung", "phone", "0912345678", "startDate", month.atDay(1), "endDate", month.atEndOfMonth()));
        assertEquals(200, started.statusCode(), started.body());
        var key = json.readTree(started.body()).path("data").path("profile").path("current").path("key").asText();
        var period = Map.of("propertyId", propertyId, "roomId", room.getRoomId(), "tenancyKey", key, "month", month.toString());
        String api = "/api/host/room-billing";
        var plan = call(f.token(), "PUT", api + "/schedule", Map.of("period", period, "cycleMonths", 1,
                "dueDay", 5, "firstDueDate", month.atDay(5)));
        assertEquals(200, plan.statusCode(), plan.body());
        var base = new HashMap<String,Object>(Map.of("period", period, "kind", "MAIN", "dueDate", month.atDay(5),
                "rentAmount", 2200000, "includeUtilities", true, "charges", List.of()));
        assertEquals(400, call(f.token(), "PUT", api + "/draft", base).statusCode());
        base.put("includeUtilities", false);
        var main = call(f.token(), "PUT", api + "/draft", base);
        assertEquals(200, main.statusCode(), main.body());
        var primary = json.readTree(main.body()).path("data");
        assertEquals(200, call(f.token(), "POST", api + "/" + primary.path("id").asLong() + "/issue",
                Map.of("revision", primary.path("revision").asLong())).statusCode());

        String utilityApi = "/api/host/room-utilities";
        var reading = utilityEntry(room.getRoomId(), key, month.atDay(21), 120, 195, "FIXED");
        var usage = Map.of("propertyId", propertyId, "month", month.toString(), "entries", List.of(reading));
        var recorded = call(f.token(), "POST", utilityApi, usage);
        assertEquals(200, recorded.statusCode(), recorded.body());
        base.put("kind", "UTILITIES");
        base.put("rentAmount", 0);
        base.put("includeUtilities", true);
        var extra = call(f.token(), "PUT", api + "/draft", base);
        assertEquals(200, extra.statusCode(), extra.body());
        var supplemental = json.readTree(extra.body()).path("data");
        assertEquals("272500", supplemental.path("totalAmount").asText());
        var readingVersion = json.readTree(recorded.body()).path("data").path("rows").path(0).path("saved").path("revision").asLong();
        reading.put("revision", readingVersion);
        reading.put("electricityEnd", 196);
        assertEquals(200, call(f.token(), "POST", utilityApi, usage).statusCode());
        String issue = api + "/" + supplemental.path("id").asLong() + "/issue";
        assertEquals(409, call(f.token(), "POST", issue, Map.of("revision", supplemental.path("revision").asLong())).statusCode());
        base.put("revision", supplemental.path("revision").asLong());
        var updated = call(f.token(), "PUT", api + "/draft", base);
        assertEquals(200, updated.statusCode(), updated.body());
        var newDraft = json.readTree(updated.body()).path("data");
        assertEquals("276000", newDraft.path("totalAmount").asText());
        assertEquals(200, call(f.token(), "POST", issue, Map.of("revision", newDraft.path("revision").asLong())).statusCode());
        assertEquals(409, call(f.token(), "PUT", api + "/draft", base).statusCode());
    }

    @Test void previewsLatestMeterReadingsInFutureWithoutWritingThem() throws Exception {
        var f = fixture();
        int roomId = f.rooms().get(0).getRoomId();
        int propertyId = f.property().getPropertyId();
        var current = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        var past = current.minusMonths(1);
        var future = current.plusMonths(1);
        var started = call(f.token(), "POST", "/api/host/rooms/" + roomId + "/tenancies",
                Map.of("name", "Người thuê kiểm tra chỉ số", "phone", "0912345678",
                        "startDate", past.atDay(1), "endDate", future.atEndOfMonth()));
        assertEquals(200, started.statusCode(), started.body());
        var key = json.readTree(started.body()).path("data").path("profile").path("current").path("key").asText();
        String endpoint = "/api/host/room-utilities";
        var reading = utilityEntry(roomId, key, past.atDay(21), 0, 150, "METER");
        reading.put("waterStart", 0);
        reading.put("waterEnd", 4);
        var saved = call(f.token(), "POST", endpoint, Map.of("propertyId", propertyId, "month", past.toString(), "entries", List.of(reading)));
        assertEquals(200, saved.statusCode(), saved.body());
        String preview = endpoint + "?propertyId=" + propertyId + "&month=" + future;
        var listed = call(f.token(), "GET", preview, null);
        assertEquals(200, listed.statusCode(), listed.body());
        var data = json.readTree(listed.body()).path("data");
        assertFalse(data.path("editable").asBoolean());
        var row = data.path("rows").path(0);
        assertTrue(row.path("issue").isNull());
        assertTrue(row.path("saved").isNull());
        assertEquals(150, row.path("suggestedElectricityStart").asInt());
        assertEquals(4, row.path("suggestedWaterStart").asInt());
        assertEquals(past.atDay(21).toString(), row.path("previousReadOn").asText());
        reading.put("readOn", future.atDay(15));
        assertEquals(400, call(f.token(), "POST", endpoint,
                Map.of("propertyId", propertyId, "month", future.toString(), "entries", List.of(reading))).statusCode());
        assertEquals(404, call(tokens.generateTokenFromUser(user(UserRole.ROOM_HOST)), "GET", preview, null).statusCode());
    }

    @Test void carriesMeterReadingsAcrossMonthsAndHandoverAndProtectsSavedHistory() throws Exception {
        var fixture = fixture();
        int roomId = fixture.rooms().get(0).getRoomId();
        var month = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(1);
        var previous = month.minusMonths(2);
        var handover = month.atDay(15);
        String roomPath = "/api/host/rooms/" + roomId + "/tenancies";
        String utilityPath = "/api/host/room-utilities";
        int propertyId = fixture.property().getPropertyId();
        String listPath = utilityPath + "?propertyId=" + propertyId + "&month=" + month;
        String owner = fixture.token();
        var opened = call(owner, "POST", roomPath, Map.of("name", "Người thuê cũ", "phone", "0901234567",
                "startDate", previous.atDay(1), "endDate", month.atEndOfMonth()));
        assertEquals(200, opened.statusCode(), opened.body());
        String oldKey = json.readTree(opened.body()).path("data").path("profile").path("current").path("key").asText();
        var first = utilityEntry(roomId, oldKey, previous.atDay(21), 100, 120, "METER");
        first.put("electricityEnd", "120.000");
        first.put("waterEnd", "8.000");
        var firstSaved = call(owner, "POST", utilityPath, Map.of("propertyId", propertyId, "month", previous, "entries", List.of(first)));
        assertEquals(200, firstSaved.statusCode(), firstSaved.body());
        var ledger = json.readTree(call(owner, "GET", listPath, null).body()).path("data").path("rows");
        assertEquals(120, ledger.path(0).path("suggestedElectricityStart").asInt());
        assertEquals(8, ledger.path(0).path("suggestedWaterStart").asInt());
        assertEquals(previous.atDay(21).toString(), ledger.path(0).path("previousReadOn").asText());
        var closed = call(owner, "POST", roomPath + "/" + oldKey + "/close", Map.of("date", handover));
        assertEquals(200, closed.statusCode(), closed.body());
        var finalReading = utilityEntry(roomId, oldKey, handover, 120, 195, "METER");
        var stored = call(owner, "POST", utilityPath, Map.of("propertyId", propertyId, "month", month, "entries", List.of(finalReading)));
        assertEquals(200, stored.statusCode(), stored.body());
        var old = json.readTree(stored.body()).path("data").path("rows").path(0);
        assertEquals("262500", old.path("saved").path("electricityAmount").asText());
        assertEquals("40000", old.path("saved").path("waterAmount").asText());

        var next = call(owner, "POST", roomPath, Map.of("name", "Người thuê mới", "phone", "0912345678",
                "startDate", handover, "endDate", month.plusMonths(3).atEndOfMonth()));
        assertEquals(200, next.statusCode(), next.body());
        String nextKey = json.readTree(next.body()).path("data").path("profile").path("current").path("key").asText();
        assertEquals(200, call(owner, "POST", roomPath + "/" + nextKey + "/occupants",
                Map.of("name", "Người ở cùng", "joinedOn", handover.plusDays(1))).statusCode());
        var twoRows = json.readTree(call(owner, "GET", listPath, null).body()).path("data").path("rows");
        assertEquals(2, twoRows.size());
        assertEquals(nextKey, twoRows.path(1).path("tenancyKey").asText());
        assertEquals(195, twoRows.path(1).path("suggestedElectricityStart").asInt());
        var nextReading = utilityEntry(roomId, nextKey, month.atEndOfMonth(), 195, 215, "PER_PERSON");
        var newer = call(owner, "POST", utilityPath, Map.of("propertyId", propertyId, "month", month, "entries", List.of(nextReading)));
        assertEquals(200, newer.statusCode(), newer.body());
        var perPerson = json.readTree(newer.body()).path("data").path("rows").path(1).path("saved");
        assertEquals(2, perPerson.path("occupantCount").asInt());
        assertEquals("20000", perPerson.path("waterAmount").asText());

        finalReading.put("revision", old.path("saved").path("revision").asLong());
        finalReading.put("readOn", handover.minusDays(1));
        assertEquals(400, call(owner, "POST", utilityPath, Map.of("propertyId", propertyId, "month", month, "entries", List.of(finalReading))).statusCode());
        finalReading.put("readOn", handover);
        finalReading.put("electricityEnd", 190);
        assertEquals(400, call(owner, "POST", utilityPath, Map.of("propertyId", propertyId, "month", month, "entries", List.of(finalReading))).statusCode());
        finalReading.put("electricityEnd", 195);
        assertEquals(409, call(owner, "POST", utilityPath, Map.of("propertyId", propertyId, "month", month, "entries", List.of(nextReading))).statusCode());
        String otherOwner = tokens.generateTokenFromUser(user(UserRole.ROOM_HOST));
        assertEquals(404, call(otherOwner, "GET", listPath, null).statusCode());
        assertEquals(404, call(otherOwner, "POST", utilityPath, Map.of("propertyId", propertyId, "month", month, "entries", List.of(finalReading))).statusCode());
    }

    @Test void rejectsInvalidBatchWithoutSavingAnyRowsAndRecordsFixedWaterFee() throws Exception {
        var f = fixture();
        var month = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(1);
        String utilityPath = "/api/host/room-utilities";
        var entries = new ArrayList<Map<String, Object>>();
        for (var room : f.rooms()) {
            var started = call(f.token(), "POST", "/api/host/rooms/" + room.getRoomId() + "/tenancies",
                    Map.of("name", "Người thuê thử", "phone", "0912345678", "startDate", month.atDay(1), "endDate", month.atEndOfMonth()));
            assertEquals(200, started.statusCode(), started.body());
            String key = json.readTree(started.body()).path("data").path("profile").path("current").path("key").asText();
            entries.add(utilityEntry(room.getRoomId(), key, month.atEndOfMonth(), 120, 130, "FIXED"));
        }
        int propertyId = f.property().getPropertyId();
        var request = Map.of("propertyId", propertyId, "month", month, "entries", entries);
        entries.get(1).put("electricityEnd", 119);
        var rejected = call(f.token(), "POST", utilityPath, request);
        assertEquals(400, rejected.statusCode(), rejected.body());
        var list = call(f.token(), "GET", utilityPath + "?propertyId=" + propertyId + "&month=" + month, null);
        var rows = json.readTree(list.body()).path("data").path("rows");
        assertEquals(2, rows.size());
        assertTrue(rows.path(0).path("saved").isNull());
        assertTrue(rows.path(1).path("saved").isNull());
        entries.get(1).put("electricityEnd", 140);
        var valid = call(f.token(), "POST", utilityPath, request);
        assertEquals(200, valid.statusCode(), valid.body());
        var saved = json.readTree(valid.body()).path("data").path("rows");
        assertEquals("10000", saved.path(0).path("saved").path("waterAmount").asText());
        assertEquals("70000", saved.path(1).path("saved").path("electricityAmount").asText());
    }

    private Map<String, Object> utilityEntry(int roomId, String key, LocalDate on, int start, int end, String waterMode) {
        var row = new HashMap<String, Object>(Map.of("roomId", roomId, "tenancyKey", key, "readOn", on,
                "electricityStart", start, "electricityEnd", end, "electricityRate", 3500,
                "waterMode", waterMode, "waterRate", 10000));
        if ("METER".equals(waterMode)) row.putAll(Map.of("waterStart", on.getDayOfMonth() == 15 ? 8 : 4,
                "waterEnd", on.getDayOfMonth() == 15 ? 12 : 8));
        return row;
    }

    @Test void managesOccupantsAndRetainsSeparateTenancyHistory() throws Exception {
        var f = fixture();
        var room = f.rooms().get(0);
        var today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        String base = "/api/host/rooms/" + room.getRoomId() + "/tenancies";
        var person = Map.of("name", "Người thuê chính kiểm thử", "phone", "0912345678",
                "startDate", today.minusDays(20), "endDate", today.plusDays(30));
        var forbidden = tokens.generateTokenFromUser(user(UserRole.USER));
        var otherOwner = tokens.generateTokenFromUser(user(UserRole.ROOM_HOST));
        assertEquals(401, call(null, "GET", base, null).statusCode());
        assertEquals(403, call(forbidden, "GET", base, null).statusCode());
        assertEquals(404, call(otherOwner, "POST", base, person).statusCode());
        var start = call(f.token(), "POST", base, person);
        assertEquals(200, start.statusCode(), start.body());
        var started = json.readTree(start.body()).path("data");
        assertEquals("OCCUPIED", started.path("room").path("status").asText());
        var current = started.path("profile").path("current");
        var key = current.path("key").asText();
        assertTrue(current.path("occupants").path(0).path("primaryTenant").asBoolean());
        assertEquals(409, call(f.token(), "POST", base, person).statusCode());

        String peoplePath = base + "/" + key + "/occupants";
        assertEquals(400, call(f.token(), "POST", peoplePath, Map.of("name", "Ngoài kỳ thuê", "joinedOn", today.minusDays(21))).statusCode());
        var companion = Map.of("name", "Người ở cùng kiểm thử", "joinedOn", today.minusDays(5));
        var added = call(f.token(), "POST", peoplePath, companion);
        assertEquals(200, added.statusCode(), added.body());
        var occupants = json.readTree(added.body()).path("data").path("current").path("occupants");
        assertEquals(2, occupants.size());
        assertEquals(409, call(f.token(), "POST", peoplePath, companion).statusCode());
        assertEquals(404, call(f.token(), "POST", peoplePath + "/" + occupants.path(0).path("id").asLong() + "/leave", Map.of("date", today)).statusCode());
        var left = call(f.token(), "POST", peoplePath + "/" + occupants.path(1).path("id").asLong() + "/leave", Map.of("date", today.minusDays(1)));
        assertEquals(200, left.statusCode(), left.body());
        assertEquals(today.minusDays(1).toString(), json.readTree(left.body()).path("data").path("current").path("occupants").path(1).path("leftOn").asText());

        var contractPath = "/api/host/rental-contracts/rooms/" + room.getRoomId();
        assertEquals(409, call(f.token(), "POST", contractPath, draft(room, "Sai người thuê")).statusCode());
        var signedDraft = draft(room, "Người thuê chính kiểm thử");
        signedDraft.put("tenantPhone", "+84912345678");
        var saved = call(f.token(), "POST", contractPath, signedDraft);
        assertEquals(200, saved.statusCode(), saved.body());
        long contractId = json.readTree(saved.body()).path("data").path("id").asLong();
        var withContract = json.readTree(call(f.token(), "GET", base, null).body()).path("data").path("current");
        assertEquals(key, withContract.path("key").asText());
        assertEquals(contractId, withContract.path("contractId").asLong());

        var closed = call(f.token(), "POST", base + "/" + key + "/close", Map.of("date", today));
        assertEquals(200, closed.statusCode(), closed.body());
        var result = json.readTree(closed.body()).path("data");
        assertEquals("VACANT", result.path("room").path("status").asText());
        var history = result.path("profile").path("history");
        assertEquals(1, history.size());
        assertEquals(2, history.path(0).path("occupants").size());
        assertEquals(contractId, history.path(0).path("contractId").asLong());
        assertEquals("CLOSED", contracts.findById(contractId).orElseThrow().getStatus());
        assertEquals(409, call(f.token(), "POST", peoplePath, companion).statusCode());
        var next = call(f.token(), "POST", base, person);
        assertEquals(200, next.statusCode(), next.body());
        assertNotEquals(key, json.readTree(next.body()).path("data").path("profile").path("current").path("key").asText());
    }

    @Test void readsLegacyContractAndImportsItOnFirstTenancyChange() throws Exception {
        var f = fixture();
        var room = f.rooms().get(0);
        var period = payload(f);
        period.put("roomIds", List.of(room.getRoomId()));
        assertEquals(200, call(f.token(), "PATCH", "/api/host/rooms/status", period).statusCode());
        String base = "/api/host/rooms/" + room.getRoomId() + "/tenancies";
        var before = json.readTree(call(f.token(), "GET", base, null).body()).path("data");
        assertTrue(before.path("current").isNull());
        var contract = new RentalContract();
        contract.setRoomId(room.getRoomId());
        contract.setOwnerId(f.owner().getUserId());
        contract.setStatus("ACTIVE");
        contract.setStartDate(LocalDate.parse("2026-11-18"));
        contract.setEndDate(LocalDate.parse("2027-11-18"));
        contract.setPropertyName(f.property().getName());
        contract.setRoomNumber(room.getRoomNumber());
        contract.setDetailsJson(json.writeValueAsString(draft(room, "Người thuê hồ sơ cũ")));
        var saved = contracts.saveAndFlush(contract);
        String legacyKey = "c-" + saved.getId();
        var profile = json.readTree(call(f.token(), "GET", base, null).body()).path("data");
        assertEquals(legacyKey, profile.path("current").path("key").asText());
        assertEquals("Người thuê hồ sơ cũ", profile.path("current").path("occupants").path(0).path("name").asText());
        var patched = call(f.token(), "POST", base + "/" + legacyKey + "/occupants",
                Map.of("name", "Người ở cùng", "joinedOn", "2026-11-19"));
        assertEquals(200, patched.statusCode(), patched.body());
        assertEquals(2, json.readTree(patched.body()).path("data").path("current").path("occupants").size());
        period.put("status", "VACANT");
        assertEquals(200, call(f.token(), "PATCH", "/api/host/rooms/status", period).statusCode());
        var history = json.readTree(call(f.token(), "GET", base, null).body()).path("data").path("history");
        assertEquals(1, history.size());
        assertEquals(2, history.path(0).path("occupants").size());
    }
    @Test void signedContractRequiresItsOwnerAndVerifiedTenantAndRetainsBothSignatures() throws Exception {
        var f = fixture();
        var room = f.rooms().get(0);
        var payload = payload(f);
        payload.put("roomIds", List.of(room.getRoomId()));
        var draft = draft(room, "Người thuê ký");
        draft.put("sourceName", "scan-private.pdf");
        draft.put("fullScannedTranscript", "Original scan only");
        payload.put("contracts", List.of(draft));
        assertEquals(200, call(f.token(), "PATCH", "/api/host/rooms/status", payload).statusCode());

        String hostPath = "/api/host/rental-contracts";
        String tenantPath = "/api/rental-contract-signing";
        var list = call(f.token(), "GET", hostPath + "/rooms/" + room.getRoomId(), null);
        var contract = json.readTree(list.body()).path("data").path(0);
        String contractPath = hostPath + "/" + contract.path("id").asLong();
        String hash = contract.path("documentHash").asText();
        assertEquals(64, hash.length());
        String anotherHost = tokens.generateTokenFromUser(user(UserRole.ROOM_HOST));
        assertEquals(404, call(anotherHost, "POST", contractPath + "/signing-link", null).statusCode());
        assertEquals(404, call(anotherHost, "POST", contractPath + "/signature",
                Map.of("documentHash", hash, "method", "TYPED", "confirmed", true)).statusCode());

        String firstLink = json.readTree(call(f.token(), "POST", contractPath + "/signing-link", null).body()).path("data").path("token").asText();
        String token = json.readTree(call(f.token(), "POST", contractPath + "/signing-link", null).body()).path("data").path("token").asText();
        assertEquals(43, token.length());
        assertNotEquals(firstLink, token);
        var link = Map.of("token", token);
        var tenant = user(UserRole.USER);
        String tenantBearer = tokens.generateTokenFromUser(tenant);
        assertEquals(401, call(null, "POST", tenantPath + "/open", link).statusCode());
        assertEquals(404, call(tenantBearer, "POST", tenantPath + "/open", Map.of("token", firstLink)).statusCode());
        assertEquals(404, call(f.token(), "POST", tenantPath + "/open", link).statusCode());
        assertEquals(403, call(tenantBearer, "POST", tenantPath + "/open", link).statusCode());
        tenant.setPhoneNumber("0933333333");
        tenant.setPhoneVerifiedAt(Instant.now());
        users.save(tenant);
        assertEquals(404, call(tenantBearer, "POST", tenantPath + "/open", link).statusCode());
        tenant.setPhoneNumber("+84912345678");
        users.save(tenant);
        var opened = call(tenantBearer, "POST", tenantPath + "/open", link);
        assertEquals(200, opened.statusCode(), opened.body());
        assertFalse(opened.body().contains("scan-private.pdf"), opened.body());
        assertFalse(opened.body().contains("Original scan only"), opened.body());

        var signedOwner = call(f.token(), "POST", contractPath + "/signature",
                Map.of("documentHash", hash, "method", "TYPED", "confirmed", true));
        assertEquals(200, signedOwner.statusCode(), signedOwner.body());
        assertEquals("Chủ nhà", json.readTree(signedOwner.body()).path("data").path("ownerSignature").path("name").asText());
        var drawing = List.of(List.of(Map.of("x", 20, "y", 100), Map.of("x", 150, "y", 35)));
        assertEquals(409, call(tenantBearer, "POST", tenantPath + "/signature", Map.of("token", token, "signature",
                Map.of("documentHash", "0".repeat(64), "method", "DRAWN", "confirmed", true, "strokes", drawing))).statusCode());
        var body = Map.of("token", token, "signature", Map.of("documentHash", hash, "method", "DRAWN", "confirmed", true, "strokes", drawing));
        var signedTenant = call(tenantBearer, "POST", tenantPath + "/signature", body);
        assertEquals(200, signedTenant.statusCode(), signedTenant.body());
        var signed = json.readTree(signedTenant.body()).path("data");
        assertEquals("Người thuê ký", signed.path("tenantSignature").path("name").asText());
        assertEquals(2, signed.path("tenantSignature").path("strokes").path(0).size());
        String signedAt = signed.path("tenantSignature").path("signedAt").asText();
        assertFalse(signedAt.isBlank());
        assertFalse(signedTenant.body().contains("signerUserId"));
        assertEquals(409, call(f.token(), "POST", contractPath + "/signing-link", null).statusCode());

        payload.remove("contracts");
        payload.put("status", "VACANT");
        assertEquals(200, call(f.token(), "PATCH", "/api/host/rooms/status", payload).statusCode());
        var archived = json.readTree(call(tenantBearer, "POST", tenantPath + "/signature", body).body()).path("data");
        assertEquals("CLOSED", archived.path("status").asText());
        assertEquals(hash, archived.path("documentHash").asText());
        assertEquals(signedAt, archived.path("tenantSignature").path("signedAt").asText());
        assertEquals("Chủ nhà", archived.path("ownerSignature").path("name").asText());
    }
    @Test void savesSeparateContractsWithStatusAndKeepsHistoryAfterVacancy()throws Exception{
        var f=fixture();var p=payload(f);p.put("contracts",List.of(draft(f.rooms.get(0),"Người thuê A"),draft(f.rooms.get(1),"Người thuê B")));
        var saved=call(f.token,"PATCH","/api/host/rooms/status",p);assertEquals(200,saved.statusCode(),saved.body());
        var id=f.rooms.get(0).getRoomId();var list=call(f.token,"GET","/api/host/rental-contracts/rooms/"+id,null);
        var first=json.readTree(list.body()).path("data").path(0);assertEquals("Người thuê A",first.path("details").path("tenantName").asText());assertEquals("2026-11-18",first.path("startDate").asText());assertEquals("ACTIVE",first.path("status").asText());
        var changed=new HashMap<>(p);changed.remove("contracts");changed.put("leaseEndDate","2028-11-18");assertEquals(409,call(f.token,"PATCH","/api/host/rooms/status",changed).statusCode());
        assertEquals(409,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());assertEquals(1,contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(id,f.owner.getUserId()).size());
        changed.put("status","VACANT");assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",changed).statusCode());
        var archived=contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(id,f.owner.getUserId()).get(0);assertEquals("CLOSED",archived.getStatus());assertNotNull(archived.getClosedAt());assertNull(rooms.findById(id).orElseThrow().getLeaseStartDate());
        p.put("leaseStartDate","2028-01-01");p.put("leaseEndDate","2029-01-01");assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        var history=json.readTree(call(f.token,"GET","/api/host/rental-contracts/rooms/"+id,null).body()).path("data");assertEquals(2,history.size());assertEquals("2028-01-01",history.path(0).path("startDate").asText());assertEquals("CLOSED",history.path(1).path("status").asText());
    }
    @Test void invalidMissingDuplicateOrMismatchedContractRollsBackEveryRoom()throws Exception{
        var f=fixture();var p=payload(f);var a=draft(f.rooms.get(0),"A");var b=draft(f.rooms.get(1),"B");
        for(var invalid:List.of(List.of(a),List.of(a,a))){p.put("contracts",invalid);assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());}
        b.put("reviewed",false);p.put("contracts",List.of(a,b));assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        b.put("reviewed",true);b.put("roomId",Integer.MAX_VALUE);assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        b.put("roomId",f.rooms.get(1).getRoomId());b.put("rent",-1);assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        for(var r:f.rooms){assertEquals("VACANT",rooms.findById(r.getRoomId()).orElseThrow().getStatus());assertTrue(contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(r.getRoomId(),f.owner.getUserId()).isEmpty());}
    }
    @Test void privacyUsesAuthenticatedOwnerAndContractCanBeAddedToExistingOccupiedRoom()throws Exception{
        var f=fixture();int id=f.rooms.get(0).getRoomId();String path="/api/host/rental-contracts/rooms/"+id;
        assertEquals(401,call(null,"GET",path,null).statusCode());
        for(var role:List.of(UserRole.USER,UserRole.STAFF))assertEquals(403,call(tokens.generateTokenFromUser(user(role)),"GET",path,null).statusCode());
        assertEquals(404,call(tokens.generateTokenFromUser(user(UserRole.ROOM_HOST)),"GET",path,null).statusCode());
        assertEquals(404,call(tokens.generateTokenFromUser(user(UserRole.ADMIN)),"GET",path,null).statusCode());
        assertEquals(400,call(f.token,"POST",path,draft(f.rooms.get(0),"Người thuê A")).statusCode());
        assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",payload(f)).statusCode());
        assertEquals(200,call(f.token,"POST",path,draft(f.rooms.get(0),"Người thuê A")).statusCode());
        assertEquals(409,call(f.token,"POST",path,draft(f.rooms.get(0),"Duplicate")).statusCode());
        String publicRooms=call(null,"GET","/api/public/properties",null).body();assertFalse(publicRooms.contains("Người thuê A"));assertFalse(publicRooms.contains("012345678901"));
        var templates=call(f.token,"GET","/api/host/rental-contracts/templates",null);assertEquals(3,json.readTree(templates.body()).path("data").path("templates").size());assertFalse(json.readTree(templates.body()).path("data").path("scanAvailable").asBoolean());
    }

    @Test void houseRentalTemplateCanBeSelectedAndSavedWithItsOwnFields() throws Exception {
        var f=fixture();
        var room=f.rooms().get(0);
        var response=call(f.token(),"GET","/api/host/rental-contracts/templates",null);
        assertEquals(200,response.statusCode());
        var template=json.readTree(response.body()).path("data").path("templates").path(1);
        assertEquals("HOUSE_RENTAL",template.path("id").asText());
        var terms=template.path("terms").asText();
        for(int article=1;article<=4;article++)assertTrue(terms.contains("ĐIỀU "+article+":"));
        assertTrue(terms.contains("1.2 Mục đích thuê nhà\nBên thuê nhà thuê nhà để ở."));
        assertTrue(terms.contains("1.4 Thời hạn cho thuê\nTrong trường hợp gia hạn"));
        assertFalse(terms.contains("Hai bên thống nhất bên chịu các khoản điện"));
        var draft=draft(room,"Người thuê mẫu 2");
        draft.put("template","HOUSE_RENTAL");
        draft.put("terms",terms);
        draft.put("rentalScope","Phòng 25 m²");
        draft.put("occupantCount",2);
        draft.put("firstPaymentDate","2026-11-20");
        draft.put("contractDate","2000-01-01");
        var payload=payload(f);
        payload.put("roomIds",List.of(room.getRoomId()));
        payload.put("contracts",List.of(draft));
        var saved=call(f.token(),"PATCH","/api/host/rooms/status",payload);
        assertEquals(200,saved.statusCode(),saved.body());
        var history=call(f.token(),"GET","/api/host/rental-contracts/rooms/"+room.getRoomId(),null);
        var stored=json.readTree(history.body()).path("data").path(0).path("details");
        assertEquals("HOUSE_RENTAL",stored.path("template").asText());
        assertEquals("Phòng 25 m²",stored.path("rentalScope").asText());
        assertEquals(2,stored.path("occupantCount").asInt());
        assertEquals("2026-11-20",stored.path("firstPaymentDate").asText());
        assertEquals(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString(),stored.path("contractDate").asText());
    }
    @Test void lateConflictRollsBackContractAlreadyFlushedForEarlierRoom()throws Exception{
        var f=fixture();var a=f.rooms.get(0);var b=f.rooms.get(1);var second=payload(f);
        second.put("roomIds",List.of(b.getRoomId()));second.put("contracts",List.of(draft(b,"Existing tenant")));
        assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",second).statusCode());
        var both=payload(f);both.put("contracts",List.of(draft(a,"Should roll back"),draft(b,"Conflict")));
        assertEquals(409,call(f.token,"PATCH","/api/host/rooms/status",both).statusCode());
        assertEquals("VACANT",rooms.findById(a.getRoomId()).orElseThrow().getStatus());
        assertTrue(contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(a.getRoomId(),f.owner.getUserId()).isEmpty());
        assertEquals(1,contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(b.getRoomId(),f.owner.getUserId()).size());
    }
    @Test void scanEndpointVerifiesOwnershipWithoutLazyInitializationError()throws Exception{
        var f=fixture();int id=f.rooms.get(0).getRoomId();
        var img=new java.awt.image.BufferedImage(16,16,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var pngOut=new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img,"png",pngOut);
        String boundary="----NestHubBoundary7MA4YWxkTrZu0gW";
        var bodyOut=new java.io.ByteArrayOutputStream();
        bodyOut.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"roomId\"\r\n\r\n"+id+"\r\n"
            +"--"+boundary+"\r\nContent-Disposition: form-data; name=\"consent\"\r\n\r\ntrue\r\n"
            +"--"+boundary+"\r\nContent-Disposition: form-data; name=\"files\"; filename=\"trang-1.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        bodyOut.write(pngOut.toByteArray());
        bodyOut.write(("\r\n--"+boundary+"--\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        byte[] bodyBytes=bodyOut.toByteArray();

        var ownerReq=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+"/api/host/rental-contracts/scan"))
            .header("Authorization","Bearer "+f.token)
            .header("Content-Type","multipart/form-data; boundary="+boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes)).build();
        var ownerRes=http.send(ownerReq,HttpResponse.BodyHandlers.ofString());
        assertEquals(503,ownerRes.statusCode(),ownerRes.body());
        assertFalse(ownerRes.body().contains("Could not initialize proxy"),ownerRes.body());

        String otherToken=tokens.generateTokenFromUser(user(UserRole.ROOM_HOST));
        var otherReq=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+"/api/host/rental-contracts/scan"))
            .header("Authorization","Bearer "+otherToken)
            .header("Content-Type","multipart/form-data; boundary="+boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes)).build();
        var otherRes=http.send(otherReq,HttpResponse.BodyHandlers.ofString());
        assertEquals(404,otherRes.statusCode(),otherRes.body());
    }
    @Test void savedScannedTranscriptPreservesExactCharactersAfterSaveAndReload()throws Exception{
        var f=fixture();var room=f.rooms.get(0);
        String exactTranscript=String.join("\n",
            "ĐIỀU KHOẢN THUÊ PHÒNG P.102 — Mã hồ sơ 0008.",
            "Ngày hiệu lực: 01/12/2026.",
            "Giá thuê: 2.200.000 đ/tháng | Tiền cọc: 2,200,000 đ.",
            "Bảng dịch vụ: Điện | 3.800 đ/kWh | Nước | 100.000 đ/người.",
            "Bên B giữ gìn vệ sinh và bàn giao đúng hiện trạng.");
        var d=draft(room,"Lê Minh C");
        d.put("template","OWNER_SCAN");
        d.put("sourceName","hop-dong-goc.pdf");
        d.put("terms",exactTranscript);
        d.put("fullScannedTranscript",exactTranscript+"\n\nTrang 2 — Phụ lục giữ nguyên.");
        var p=payload(f);p.put("roomIds",List.of(room.getRoomId()));p.put("contracts",List.of(d));
        var saved=call(f.token,"PATCH","/api/host/rooms/status",p);
        assertEquals(200,saved.statusCode(),saved.body());
        var list=call(f.token,"GET","/api/host/rental-contracts/rooms/"+room.getRoomId(),null);
        var details=json.readTree(list.body()).path("data").path(0).path("details");
        assertEquals(exactTranscript,details.path("terms").asText());
        assertEquals(exactTranscript+"\n\nTrang 2 — Phụ lục giữ nguyên.",details.path("fullScannedTranscript").asText());
    }
    @Test void savesOfficialVietnameseTemplateFieldsAndReturnsStandardTemplates()throws Exception{
        var f=fixture();var room=f.rooms.get(0);
        var d=draft(room,"Trần Thị B");
        d.put("contractDate","2026-11-18");
        d.put("landlordBirthDate","1980-05-12");
        d.put("landlordAddress","Thôn 3, Thạch Hòa, Thạch Thất, Hà Nội");
        d.put("landlordIdentity","001080012345");
        d.put("landlordIdentityDate","2021-06-15");
        d.put("landlordIdentityPlace","Cục CSQLHC về TTXH");
        d.put("tenantBirthDate","2004-08-20");
        d.put("tenantIdentityDate","2022-09-10");
        d.put("tenantIdentityPlace","Cục CSQLHC về TTXH");
        d.put("paymentMethod","Chuyển khoản hoặc tiền mặt trước ngày 05 hằng tháng");
        d.put("electricityPrice",3800);
        d.put("waterPrice",100000);
        d.put("waterUnit","người");
        d.put("internetPrice",100000);
        d.put("servicePrice",50000);
        var p=payload(f);p.put("roomIds",List.of(room.getRoomId()));p.put("contracts",List.of(d));
        var saved=call(f.token,"PATCH","/api/host/rooms/status",p);
        assertEquals(200,saved.statusCode(),saved.body());
        var list=call(f.token,"GET","/api/host/rental-contracts/rooms/"+room.getRoomId(),null);
        var details=json.readTree(list.body()).path("data").path(0).path("details");
        assertEquals("2026-11-18",details.path("contractDate").asText());
        assertEquals("001080012345",details.path("landlordIdentity").asText());
        assertEquals("2004-08-20",details.path("tenantBirthDate").asText());
        assertEquals("Chuyển khoản hoặc tiền mặt trước ngày 05 hằng tháng",details.path("paymentMethod").asText());
        assertEquals(3800,details.path("electricityPrice").asInt());
        assertEquals(100000,details.path("waterPrice").asInt());
        assertEquals("người",details.path("waterUnit").asText());

        var templates=call(f.token,"GET","/api/host/rental-contracts/templates",null);
        var basicTerms=json.readTree(templates.body()).path("data").path("templates").path(0).path("terms").asText();
        assertTrue(basicTerms.contains("1. Trách nhiệm của bên A"));
        assertTrue(basicTerms.contains("2. Trách nhiệm của bên B"));
        assertTrue(basicTerms.contains("3. Trách nhiệm chung"));
    }
}
