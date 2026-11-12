package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ViewingFlowTests {
    private static final String VIEWINGS = "/api/viewings";
    private static final String INBOX = VIEWINGS + "/notifications";
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtTokenProvider jwt;
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired RoomTypeRepository types;
    @Autowired RoomRepository rooms;
    @Autowired BookingRepository bookings;

    private User host;
    private User renter;
    private RoomType type;
    private LocalDateTime appointment;

    @BeforeEach
    void setup() {
        host = account(UserRole.ROOM_HOST);
        renter = account(UserRole.USER);
        var registration = registrations.save(PropertyRegistration.builder()
                .user(host).name("Nhà trọ test").address("Hòa Lạc").status(RegistrationStatus.APPROVED).build());
        var property = properties.save(Property.builder().owner(host).registration(registration)
                .name("Nhà trọ test").status("ACTIVE").build());
        type = types.save(RoomType.builder().property(property).roomType("Studio")
                .price(BigDecimal.valueOf(2000000)).areaSqm(20F).build());
        appointment = LocalDateTime.now(ZONE).plusDays(1).withSecond(0).withNano(0);
    }

    @Test
    void viewingAndNotificationsPersistAcrossBothRolesAndDoNotReserveRooms() throws Exception {
        var room = rooms.save(Room.builder().property(type.getProperty()).roomType(type)
                .roomNumber("101").floor("1").status("VACANT").build());
        var request = data(create(renter, payload(appointment)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.renterPhone").value("0912345678")));
        int id = request.path("bookingId").asInt();
        assertEquals(id, data(create(renter, payload(appointment)).andExpect(status().isOk())).path("bookingId").asInt());
        assertEquals(409, create(renter, payload(appointment, "Nội dung khác")).andReturn().getResponse().getStatus());

        getAs(VIEWINGS + "?status=PENDING", renter).andExpect(jsonPath("$.data.items.length()").value(1));
        getAs(VIEWINGS + "/" + id, account(UserRole.USER)).andExpect(status().isNotFound());
        getAs("/api/host/viewings", host).andExpect(jsonPath("$.data.viewings[0].renterName").value("Tên liên hệ"));

        var event = data(getAs(INBOX + "?unread=true", host).andExpect(jsonPath("$.data.unreadCount").value(1)))
                .path("items").get(0);
        assertEquals("REQUESTED", event.path("event").asString());
        assertEquals(id, event.path("bookingId").asInt());
        String markRead = INBOX + "/" + event.path("notificationId").asInt() + "/read";
        mvc.perform(put(markRead).header("Authorization", token(renter))).andExpect(status().isNotFound());
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(put(markRead).header("Authorization", token(host)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data.read").value(true));
        }
        getAs(INBOX + "?unread=true", host).andExpect(jsonPath("$.data.unreadCount").value(0))
                .andExpect(jsonPath("$.data.items.length()").value(0));
        getAs(INBOX, host).andExpect(jsonPath("$.data.items[0].read").value(true));

        decide(account(UserRole.ROOM_HOST), id, "APPROVED", "").andExpect(status().isNotFound());
        decide(renter, id, "APPROVED", "").andExpect(status().isForbidden());
        decide(account(UserRole.ADMIN), id, "APPROVED", "").andExpect(status().isForbidden());
        decide(host, id, "REJECTED", "  ").andExpect(status().isBadRequest());
        decide(host, id, "CANCELLED", "Không hợp lệ").andExpect(status().isBadRequest());
        decide(host, id, "REJECTED", "Vui lòng chọn giờ khác.").andExpect(status().isOk());
        decide(host, id, "APPROVED", "").andExpect(status().isConflict());
        create(renter, payload(appointment)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingId").value(id))
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
        getAs(VIEWINGS + "/" + id, renter).andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.decisionReason").value("Vui lòng chọn giờ khác."))
                .andExpect(jsonPath("$.data.processedAt").isNotEmpty());
        getAs(INBOX, renter).andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].event").value("REJECTED"));

        int nextId = data(create(renter, payload(appointment.plusHours(1)))).path("bookingId").asInt();
        decide(host, nextId, "APPROVED", "").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
        assertEquals("VACANT", rooms.findById(room.getRoomId()).orElseThrow().getStatus());
        getAs(INBOX, renter).andExpect(jsonPath("$.data.items[0].event").value("APPROVED"));
    }

    @Test
    void rejectsInvalidTimesAndListingsAndSupportsHostsAsRequesters() throws Exception {
        create(null, payload(appointment)).andExpect(status().isUnauthorized());
        create(account(UserRole.STAFF), payload(appointment)).andExpect(status().isForbidden());
        create(host, payload(appointment)).andExpect(status().isBadRequest());
        create(renter, payload(appointment.minusDays(2))).andExpect(status().isBadRequest());
        var invalid = new java.util.HashMap<>(payload(appointment));
        invalid.put("contactPhone", "javascript:alert(1)");
        create(renter, invalid).andExpect(status().isBadRequest());
        invalid.put("contactPhone", "0912345678");
        invalid.put("propertyId", type.getProperty().getPropertyId() + 10000);
        create(renter, invalid).andExpect(status().isNotFound());
        var property = type.getProperty();
        property.setStatus("HIDDEN");
        properties.save(property);
        create(renter, payload(appointment)).andExpect(status().isNotFound());
        property.setStatus("ACTIVE");
        properties.save(property);
        create(account(UserRole.ROOM_HOST), payload(appointment)).andExpect(status().isOk());

        int expiredId = bookings.save(Booking.builder().roomType(type).renter(renter).status(BookingStatus.PENDING)
                .scheduledDate(appointment.minusDays(2)).build()).getBookingId();
        decide(host, expiredId, "APPROVED", "").andExpect(status().isConflict());
        decide(host, expiredId, "REJECTED", "Giờ hẹn đã qua.").andExpect(status().isOk());
    }

    @Test
    void concurrentRetriesAndConflictingDecisionsCreateExactlyOneEventEach() throws Exception {
        rooms.save(Room.builder().property(type.getProperty()).roomType(type)
                .roomNumber("101").floor("1").status("VACANT").build());
        var sent = race(() -> create(renter, payload(appointment)), () -> create(renter, payload(appointment)));
        int id = data(sent[0].andExpect(status().isOk())).path("bookingId").asInt();
        assertEquals(id, data(sent[1].andExpect(status().isOk())).path("bookingId").asInt());
        getAs(INBOX, host).andExpect(jsonPath("$.data.items.length()").value(1));

        var decided = race(() -> decide(host, id, "APPROVED", ""), () -> decide(host, id, "REJECTED", "Đổi giờ"));
        var statuses = new int[]{decided[0].andReturn().getResponse().getStatus(), decided[1].andReturn().getResponse().getStatus()};
        java.util.Arrays.sort(statuses);
        assertArrayEquals(new int[]{200, 409}, statuses);
        getAs(INBOX, renter).andExpect(jsonPath("$.data.items.length()").value(1));
    }

    @Test
    void limitsDatesUpdatesOnlyOwnPendingRequestAndChecksCurrentVacancy() throws Exception {
        var lastDay = LocalDateTime.now(ZONE).toLocalDate().plusDays(30).atTime(23, 59);
        create(renter, payload(lastDay.plusMinutes(1))).andExpect(status().isBadRequest());
        int id = data(create(renter, payload(lastDay)).andExpect(status().isOk())).path("bookingId").asInt();
        create(renter, payload(appointment)).andExpect(status().isConflict());
        String pending = VIEWINGS + "/pending?propertyId=" + type.getProperty().getPropertyId()
                + "&roomTypeId=" + type.getRoomTypeId();
        getAs(pending, renter).andExpect(jsonPath("$.data.bookingId").value(id));
        update(account(UserRole.USER), id, payload(appointment)).andExpect(status().isNotFound());
        update(renter, id, payload(lastDay.plusMinutes(1))).andExpect(status().isBadRequest());
        update(renter, id, payload(appointment, "Đổi giờ")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingId").value(id)).andExpect(jsonPath("$.data.note").value("Đổi giờ"));
        getAs(INBOX, host).andExpect(jsonPath("$.data.items.length()").value(1));

        String availability = "/api/host/viewings/" + id + "/availability";
        getAs(availability, account(UserRole.ROOM_HOST)).andExpect(status().isNotFound());
        getAs(availability, host).andExpect(jsonPath("$.data").value(0));
        decide(host, id, "APPROVED", "").andExpect(status().isConflict());
        var room = rooms.save(Room.builder().property(type.getProperty()).roomType(type)
                .roomNumber("101").floor("1").status("VACANT").build());
        getAs(availability, host).andExpect(jsonPath("$.data").value(1));
        mvc.perform(post("/api/host/viewings/" + id + "/decision").header("Authorization", token(host))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(
                        Map.of("status", "APPROVED", "expectedScheduledDate", lastDay.toString()))))
                .andExpect(status().isConflict());
        decide(host, id, "APPROVED", "").andExpect(status().isOk());
        update(renter, id, payload(appointment)).andExpect(status().isConflict());
        assertEquals("VACANT", rooms.findById(room.getRoomId()).orElseThrow().getStatus());
    }

    private ResultActions update(User user, int id, Map<String, Object> payload) throws Exception {
        return mvc.perform(put(VIEWINGS + "/" + id).header("Authorization", token(user))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload)));
    }

    @Test
    void onlyRequesterCancelsPendingAndNotifiesThePropertyOwnerOnce() throws Exception {
        int id = data(create(renter, payload(appointment)).andExpect(status().isOk())).path("bookingId").asInt();
        cancel(host, id).andExpect(status().isNotFound());
        cancel(account(UserRole.USER), id).andExpect(status().isNotFound());

        cancel(renter, id).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.processedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.decisionReason").value("Đã đổi kế hoạch"));
        cancel(renter, id).andExpect(status().isConflict());
        decide(host, id, "REJECTED", "Không còn phòng").andExpect(status().isConflict());
        getAs("/api/host/viewings", host).andExpect(jsonPath("$.data.viewings[0].status").value("CANCELLED"));
        getAs(INBOX, host).andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].event").value("CANCELLED"))
                .andExpect(jsonPath("$.data.items[0].bookingId").value(id))
                .andExpect(jsonPath("$.data.items[0].read").value(false));
        getAs(INBOX, renter).andExpect(jsonPath("$.data.items.length()").value(0));
    }

    @Test
    void cancellationAndHostDecisionShareOneFinalTransition() throws Exception {
        int id = data(create(renter, payload(appointment)).andExpect(status().isOk())).path("bookingId").asInt();
        var results = race(() -> cancel(renter, id), () -> decide(host, id, "REJECTED", "Không còn phòng"));
        var statuses = new int[]{results[0].andReturn().getResponse().getStatus(), results[1].andReturn().getResponse().getStatus()};
        java.util.Arrays.sort(statuses);
        assertArrayEquals(new int[]{200, 409}, statuses);
        int hostCount = data(getAs(INBOX, host)).path("items").size();
        int renterCount = data(getAs(INBOX, renter)).path("items").size();
        assertEquals(2, hostCount + renterCount);
        cancel(renter, id).andExpect(status().isConflict());
    }

    private ResultActions cancel(User user, int id) throws Exception {
        return mvc.perform(post(VIEWINGS + "/" + id + "/cancel").header("Authorization", token(user))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("reason", "Đã đổi kế hoạch"))));
    }

    private ResultActions[] race(Callable<ResultActions> first, Callable<ResultActions> second) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        try {
            var a = executor.submit(() -> { ready.countDown(); ready.await(); return first.call(); });
            var b = executor.submit(() -> { ready.countDown(); ready.await(); return second.call(); });
            return new ResultActions[]{a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS)};
        } finally {
            executor.shutdownNow();
        }
    }

    private Map<String, Object> payload(LocalDateTime date) {
        return payload(date, "Xem phòng vào buổi sáng");
    }

    private Map<String, Object> payload(LocalDateTime date, String note) {
        return Map.of("propertyId", type.getProperty().getPropertyId(), "roomTypeId", type.getRoomTypeId(),
                "scheduledDate", date.toString(), "contactName", "Tên liên hệ",
                "contactPhone", "+84 912 345 678", "note", note);
    }

    private User account(UserRole role) {
        return users.save(User.builder().email(UUID.randomUUID() + "@test.local").fullName("Tên tài khoản")
                .passwordHash("unused").role(role).status(UserStatus.ACTIVE).build());
    }

    private String token(User user) {
        return "Bearer " + jwt.generateTokenFromUser(user);
    }

    private ResultActions getAs(String path, User user) throws Exception {
        return mvc.perform(get(path).header("Authorization", token(user)));
    }

    private ResultActions create(User user, Map<String, Object> payload) throws Exception {
        var request = post(VIEWINGS).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload));
        if (user != null) request.header("Authorization", token(user));
        return mvc.perform(request);
    }

    private ResultActions decide(User user, int id, String status, String reason) throws Exception {
        return mvc.perform(post("/api/host/viewings/" + id + "/decision").header("Authorization", token(user))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("status", status, "reason", reason))));
    }

    private JsonNode data(ResultActions response) throws Exception {
        return json.readTree(response.andReturn().getResponse().getContentAsString()).path("data");
    }
}
