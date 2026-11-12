package org.hlrcs;

import org.hlrcs.repository.ModerationLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:community-report-test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunityReportTests {
    private static final String PUBLIC = "/api/community/posts";
    private static final String ADMIN = "/api/admin/community/reports";
    private static final String MINE = "/api/community/reports/mine";
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH3sAAAAASUVORK5CYII=");
    private static final Map<String, String> DISMISS = Map.of("action", "DISMISS", "reason", "Không tìm thấy dấu hiệu vi phạm.");
    private static final Map<String, String> HIDE = Map.of("action", "HIDE_POST", "reason", "Đã xác nhận nội dung lừa đảo.");
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired ModerationLogRepository logs;
    private String author, reporter, other, staff, admin;

    @BeforeEach
    void actors() throws Exception {
        author = register();
        reporter = register();
        other = register();
        staff = login("staff@hlrcs.com", "123456");
        admin = login("admin@hlrcs.com", "admin123");
    }

    @Test
    void acceptsOneReportPerMemberAndKeepsEvidenceAndDecisionsPrivate() throws Exception {
        int post = post(true);
        var evidence = new MockMultipartFile("evidence", "proof.png", "image/png", PNG);
        int id = submit(post, reporter, "FRAUD", "Yêu cầu chuyển cọc.", 201, evidence).path("id").asInt();
        submit(post, reporter, "SPAM", "", 409);
        assertEquals(0, api("GET", MINE, other, null, 200).path("totalElements").asInt());
        api("GET", ADMIN, staff, null, 403);
        api("GET", ADMIN + "/" + id, reporter, null, 403);
        api("GET", ADMIN + "/" + id + "/evidence", null, null, 401);
        for (String token : List.of(author, reporter, other, staff)) {
            api("GET", ADMIN + "/" + id + "/evidence", token, null, 403);
        }
        var image = mvc.perform(MockMvcRequestBuilders.get(ADMIN + "/" + id + "/evidence")
                .header("Authorization", "Bearer " + admin)).andExpect(status().isOk()).andReturn().getResponse();
        assertArrayEquals(PNG, image.getContentAsByteArray());
        assertEquals("image/png", image.getContentType());
        assertEquals("no-store", image.getHeader("Cache-Control"));
        assertEquals("OPEN", api("GET", ADMIN + "/" + id, admin, null, 200).path("report").path("status").asString());
        api("POST", ADMIN + "/" + id + "/decision", admin, Map.of("action", 0, "reason", "Không dùng mã số."), 400);
        api("POST", ADMIN + "/" + id + "/decision", staff, DISMISS, 403);
        api("POST", ADMIN + "/" + id + "/decision", admin, DISMISS, 200);
        api("POST", ADMIN + "/" + id + "/decision", admin, HIDE, 409);
        submit(post, reporter, "FRAUD", "", 409);
        api("GET", PUBLIC + "/feed/" + post, null, null, 200);
        var receipt = api("GET", MINE, reporter, null, 200).path("content").get(0);
        assertEquals(id, receipt.path("id").asInt());
        for (String key : List.of("status", "details", "handler", "resolutionNote", "resolvedAt", "hasEvidence")) {
            assertFalse(receipt.has(key), key);
        }
    }

    @Test
    void rejectsInvalidReportsWithoutConsumingTheMembersOneSubmission() throws Exception {
        int pending = post(false);
        int approved = post(true);
        submit(approved, null, "FRAUD", "", 401);
        submit(pending, reporter, "FRAUD", "", 404);
        submit(approved, reporter, "INVALID", "", 400);
        var numericReason = new MockMultipartFile("report", "report.json", "application/json",
                "{\"reason\":0}".getBytes(StandardCharsets.UTF_8));
        mvc.perform(MockMvcRequestBuilders.multipart(PUBLIC + "/" + approved + "/reports").file(numericReason)
                .header("Authorization", "Bearer " + reporter)).andExpect(status().isBadRequest());
        submit(approved, reporter, "OTHER", "  ", 400);
        submit(approved, reporter, "FRAUD", "x".repeat(1001), 400);
        var bogus = new MockMultipartFile("evidence", "bad.png", "image/png", new byte[]{1, 2, 3});
        submit(approved, reporter, "FRAUD", "", 400, bogus);
        var large = new MockMultipartFile("evidence", "large.png", "image/png", new byte[5 * 1024 * 1024 + 1]);
        submit(approved, reporter, "FRAUD", "", 400, large);
        var image = new MockMultipartFile("evidence", "proof.png", "image/png", PNG);
        submit(approved, reporter, "FRAUD", "", 400, image, image);
        int otherId = api("GET", "/api/auth/me", other, null, 200).path("userId").asInt();
        jdbc.update("update users set status = 'INACTIVE' where user_id = ?", otherId);
        submit(approved, other, "FRAUD", "", 401);
        submit(approved, reporter, "FRAUD", "", 201);
    }

    @Test
    void hidingClosesEveryOpenReportAndCompetingDecisionCannotOverwriteIt() throws Exception {
        int post = post(true);
        int first = submit(post, reporter, "FRAUD", "", 201).path("id").asInt();
        int second = submit(post, other, "SPAM", "", 201).path("id").asInt();
        String secondAdmin = register();
        int secondAdminId = api("GET", "/api/auth/me", secondAdmin, null, 200).path("userId").asInt();
        jdbc.update("update users set role = 'ADMIN' where user_id = ?", secondAdminId);
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> { start.await(); return decisionStatus(first, admin); });
            var b = pool.submit(() -> { start.await(); return decisionStatus(second, secondAdmin); });
            start.countDown();
            assertEquals(List.of(200, 409), java.util.stream.Stream.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS)).sorted().toList());
        } finally {
            pool.shutdownNow();
        }
        var firstDetail = api("GET", ADMIN + "/" + first, admin, null, 200);
        var secondDetail = api("GET", ADMIN + "/" + second, admin, null, 200);
        for (var detail : List.of(firstDetail, secondDetail)) {
            assertEquals("RESOLVED", detail.path("report").path("status").asString());
            assertEquals("HIDDEN", detail.path("post").path("status").asString());
            assertEquals(HIDE.get("reason"), detail.path("resolutionNote").asString());
        }
        assertEquals(firstDetail.path("handler").asString(), secondDetail.path("handler").asString());
        assertEquals(firstDetail.path("resolvedAt").asString(), secondDetail.path("resolvedAt").asString());
        for (int id : List.of(first, second)) {
            assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("COMMUNITY_POST_REPORT", id).size());
        }
        assertTrue(logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("COMMUNITY_POST", post)
                .stream().anyMatch(entry -> entry.getAction().equals("HIDDEN")));
        api("GET", PUBLIC + "/feed/" + post, null, null, 404);
        api("GET", PUBLIC + "/" + post + "/comments", null, null, 404);
        assertEquals("HIDDEN", api("GET", PUBLIC + "/mine/feed/" + post, author, null, 200).path("status").asString());
        assertFalse(containsPost(api("GET", PUBLIC, null, null, 200), post));
        assertFalse(containsPost(api("GET", PUBLIC + "/feed", null, null, 200).path("items"), post));
        assertTrue(api("GET", ADMIN + "?status=RESOLVED", admin, null, 200).path("totalElements").asInt() >= 2);
        api("GET", ADMIN + "?status=OPEN&page=1", admin, null, 200);
    }

    @Test
    void concurrentSubmissionsFromSameMemberCreateOneReport() throws Exception {
        int post = post(true);
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> { start.await(); return reportStatus(post); });
            var b = pool.submit(() -> { start.await(); return reportStatus(post); });
            start.countDown();
            assertEquals(List.of(201, 409), java.util.stream.Stream.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS)).sorted().toList());
        } finally {
            pool.shutdownNow();
        }
        assertEquals(1, api("GET", MINE, reporter, null, 200).path("totalElements").asInt());
    }

    private int reportStatus(int post) throws Exception {
        return mvc.perform(reportRequest(post, reporter, "FRAUD", "")).andReturn().getResponse().getStatus();
    }

    private int decisionStatus(int id, String token) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post(ADMIN + "/" + id + "/decision")
                .header("Authorization", "Bearer " + token).contentType("application/json")
                .content(json.writeValueAsString(HIDE))).andReturn().getResponse().getStatus();
    }

    private int post(boolean approve) throws Exception {
        int id = api("POST", PUBLIC, author, Map.of("type", "SECOND_HAND", "title", "Bàn học dùng để thử luồng báo cáo",
                "content", "Bài đăng dùng trong bộ kiểm thử báo cáo bài viết cộng đồng.", "location", "Tân Xã, Hòa Lạc",
                "authorName", "Người đăng", "authorPhone", "0912345678"), 201).path("id").asInt();
        if (approve) api("POST", "/api/staff/community/posts/" + id + "/review", staff, Map.of("decision", "APPROVE"), 200);
        return id;
    }

    private JsonNode submit(int id, String token, String reason, String details, int expected, MockMultipartFile... attachments) throws Exception {
        var req = reportRequest(id, token, reason, details);
        for (var file : attachments) req.file(file);
        return result(mvc.perform(req).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder reportRequest(
            int id, String token, String reason, String details) {
        var req = MockMvcRequestBuilders.multipart(PUBLIC + "/" + id + "/reports")
                .file(new MockMultipartFile("report", "report.json", "application/json", json.writeValueAsBytes(Map.of("reason", reason, "details", details))));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return req;
    }

    private boolean containsPost(JsonNode rows, int id) {
        for (var row : rows) if (row.path("id").asInt() == id) return true;
        return false;
    }

    private String register() throws Exception {
        return api("POST", "/api/auth/register", null, Map.of("email", "report-" + UUID.randomUUID() + "@hlrcs.test",
                "password", "Password@123", "fullName", "Community Member"), 201).path("accessToken").asString();
    }

    private String login(String email, String password) throws Exception {
        return api("POST", "/api/auth/login", null, Map.of("email", email, "password", password), 200).path("accessToken").asString();
    }

    private JsonNode api(String method, String path, String token, Object body, int expected) throws Exception {
        var req = MockMvcRequestBuilders.request(method, java.net.URI.create(path));
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (body != null) req.contentType("application/json").content(json.writeValueAsString(body));
        return result(mvc.perform(req).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private JsonNode result(String raw) {
        return json.readTree(raw).path("data");
    }
}
