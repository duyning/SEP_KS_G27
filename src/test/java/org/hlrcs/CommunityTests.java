package org.hlrcs;

import org.hlrcs.repository.ModerationLogRepository;
import org.hlrcs.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:community-test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class CommunityTests {
    @Autowired Environment environment;
    @Autowired ObjectMapper json;
    @Autowired PostRepository posts;
    @Autowired ModerationLogRepository logs;
    private final HttpClient client = HttpClient.newHttpClient();
    private String author;
    private String staff;

    @BeforeEach
    void actors() throws Exception {
        author = register();
        staff = login("staff@hlrcs.com", "123456");
    }

    private HttpRequest build(String method, String path, Object body, String token) {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + environment.getProperty("local.server.port") + path));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (body == null) builder.method(method, HttpRequest.BodyPublishers.noBody());
        else builder.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return builder.build();
    }

    private HttpResponse<String> request(String method, String path, Object body, String token) throws Exception {
        return client.send(build(method, path, body, token), HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode data(HttpResponse<String> response, int expected) {
        assertEquals(expected, response.statusCode(), response.body());
        return json.readTree(response.body()).path("data");
    }

    private String register() throws Exception {
        return data(request("POST", "/api/auth/register", Map.of("email", "community-" + UUID.randomUUID() + "@hlrcs.test",
                "password", "Password@123", "fullName", "Community Author"), null), 201).path("accessToken").asString();
    }

    private String login(String email, String password) throws Exception {
        return data(request("POST", "/api/auth/login", Map.of("email", email, "password", password), null), 200).path("accessToken").asString();
    }

    private Map<String, Object> valid(String type) {
        var body = new HashMap<String, Object>();
        body.put("type", type);
        body.put("title", "Nhượng phòng gần trường Đại học FPT");
        body.put("content", "Phòng khép kín sạch sẽ, có ban công và chỗ để xe. Liên hệ để trao đổi thông tin cụ thể.");
        body.put("price", 2200000);
        body.put("location", "Thôn 2, Tân Xã, Hòa Lạc");
        body.put("authorName", "Nguyễn Văn An");
        body.put("authorPhone", "0912345678");
        return body;
    }

    private int create(String type) throws Exception {
        return data(request("POST", "/api/community/posts", valid(type), author), 201).path("id").asInt();
    }

    private boolean contains(JsonNode list, int id) {
        for (var item : list) if (item.path("id").asInt() == id) return true;
        return false;
    }

    @Test
    void allCategoriesPersistPendingAndCannotSpoofIdentityOrApproval() throws Exception {
        for (String type : List.of("ROOM_TRANSFER", "ROOMMATE", "SECOND_HAND")) {
            var body = valid(type);
            body.put("title", "  " + body.get("title") + "  ");
            body.put("authorPhone", "+84 912-345.678");
            body.put("status", "APPROVED");
            body.put("authorId", 1);
            body.put("reviewedBy", 1);
            var saved = data(request("POST", "/api/community/posts", body, author), 201);
            int id = saved.path("id").asInt();
            assertEquals(type, saved.path("type").asString());
            assertEquals("PENDING", saved.path("status").asString());
            assertEquals("+84912345678", saved.path("authorPhone").asString());
            assertFalse(saved.path("title").asString().startsWith(" "));
            assertTrue(saved.path("reviewedAt").isNull());
            var mine = data(request("GET", "/api/community/posts/mine", null, author), 200);
            assertTrue(contains(mine, id));
            assertFalse(contains(data(request("GET", "/api/community/posts?status=PENDING", null, null), 200), id));
            assertTrue(contains(data(request("GET", "/api/staff/community/posts", null, staff), 200), id));
            assertEquals("Community Author", data(request("GET", "/api/staff/community/posts/" + id, null, staff), 200).path("accountName").asString());
        }
    }

    @Test
    void invalidFieldsReturnSpecificErrorsAndNeverInsertPosts() throws Exception {
        long before = posts.count();
        Map<String, Object> invalid = Map.of("type", "INVALID", "title", "   ", "content", "short", "price", -1,
                "location", " ", "authorName", " ", "authorPhone", "12345");
        var errors = data(request("POST", "/api/community/posts", invalid, author), 400);
        for (String field : invalid.keySet()) assertTrue(errors.has(field), field + ": " + errors);
        for (var entry : Map.<String, Object>of("title", "x".repeat(101), "content", "x".repeat(2501),
                "location", "x".repeat(256), "authorName", "x".repeat(51), "price", 1_000_000_001L).entrySet()) {
            var body = valid("ROOMMATE");
            body.put(entry.getKey(), entry.getValue());
            assertTrue(data(request("POST", "/api/community/posts", body, author), 400).has(entry.getKey()));
        }
        var fractional = valid("SECOND_HAND");
        fractional.put("price", 12.5);
        assertTrue(data(request("POST", "/api/community/posts", fractional, author), 400).has("price"));
        for (String type : List.of("ROOM_TRANSFER", "ROOMMATE")) {
            var body = valid(type);
            body.put("price", 0);
            assertTrue(data(request("POST", "/api/community/posts", body, author), 400).has("price"));
        }
        assertEquals(before, posts.count());
        assertEquals(400, request("POST", "/api/community/posts", Map.of(), author).statusCode());
    }

    @Test
    void negotiablePriceAndFreeSecondHandPostsAreSupported() throws Exception {
        var negotiable = valid("ROOM_TRANSFER");
        negotiable.remove("price");
        assertTrue(data(request("POST", "/api/community/posts", negotiable, author), 201).path("price").isNull());
        var free = valid("SECOND_HAND");
        free.put("price", 0);
        assertEquals(0, data(request("POST", "/api/community/posts", free, author), 201).path("price").asInt());
    }

    @Test
    void onlyStaffApprovalPublishesAndReviewHistoryPersists() throws Exception {
        int id = create("ROOM_TRANSFER");
        var detail = data(request("POST", "/api/staff/community/posts/" + id + "/review",
                Map.of("decision", "APPROVE", "note", "Đã xác minh thông tin liên hệ"), staff), 200);
        assertEquals("APPROVED", detail.path("post").path("status").asString());
        assertEquals(1, detail.path("history").size());
        assertFalse(detail.path("post").path("reviewedAt").isNull());
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("COMMUNITY_POST", id).size());
        var feed = data(request("GET", "/api/community/posts", null, null), 200);
        assertTrue(contains(feed, id));
        for (var item : feed) {
            assertEquals("APPROVED", item.path("status").asString());
            assertTrue(item.path("decisionNote").isNull());
            assertTrue(item.path("reviewedBy").isNull());
        }
        assertEquals(409, request("PUT", "/api/community/posts/" + id, valid("ROOM_TRANSFER"), author).statusCode());
        assertEquals(409, request("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "REJECT", "note", "Không được xử lý lặp lại"), staff).statusCode());
    }

    @Test
    void socialContactsPersistAcrossReviewAndCanBeChangedOrRemovedOnResubmission() throws Exception {
        var body = valid("ROOMMATE");
        body.put("facebookUrl", "https://www.facebook.com/nguyenvanan");
        body.put("zaloUrl", "https://zalo.me/0912345678");
        var saved = data(request("POST", "/api/community/posts", body, author), 201);
        int id = saved.path("id").asInt();
        assertEquals(body.get("facebookUrl"), saved.path("facebookUrl").asString());
        assertEquals(body.get("zaloUrl"), saved.path("zaloUrl").asString());
        data(request("POST", "/api/staff/community/posts/" + id + "/review",
                Map.of("decision", "REQUEST_CHANGES", "note", "Vui lòng cập nhật lại link liên hệ."), staff), 200);
        body.put("facebookUrl", "https://facebook.com/contactnew");
        body.remove("zaloUrl");
        var revised = data(request("PUT", "/api/community/posts/" + id, body, author), 200);
        assertEquals("PENDING", revised.path("status").asString());
        assertEquals(body.get("facebookUrl"), revised.path("facebookUrl").asString());
        assertTrue(revised.path("zaloUrl").isNull());
        var reviewed = data(request("POST", "/api/staff/community/posts/" + id + "/review",
                Map.of("decision", "APPROVE"), staff), 200);
        assertEquals(body.get("facebookUrl"), reviewed.path("post").path("facebookUrl").asString());
        var feed = data(request("GET", "/api/community/posts", null, null), 200);
        for (var post : feed) if (post.path("id").asInt() == id) {
            assertEquals(body.get("facebookUrl"), post.path("facebookUrl").asString());
            assertTrue(post.path("zaloUrl").isNull());
        }
    }

    @Test
    void rejectionAndChangeRequestsRequireReasonAndRemainPrivate() throws Exception {
        for (String decision : List.of("REJECT", "REQUEST_CHANGES")) {
            int id = create("SECOND_HAND");
            assertTrue(data(request("POST", "/api/staff/community/posts/" + id + "/review",
                    Map.of("decision", decision, "note", "   "), staff), 400).has("note"));
            assertTrue(data(request("POST", "/api/staff/community/posts/" + id + "/review",
                    Map.of("decision", decision, "note", "x".repeat(2001)), staff), 400).has("note"));
            var reviewed = data(request("POST", "/api/staff/community/posts/" + id + "/review",
                    Map.of("decision", decision, "note", "Vui lòng mô tả rõ tình trạng của đồ dùng."), staff), 200);
            assertEquals(decision.equals("REJECT") ? "REJECTED" : "NEED_CHANGES", reviewed.path("post").path("status").asString());
            assertFalse(contains(data(request("GET", "/api/community/posts", null, null), 200), id));
            var mine = data(request("GET", "/api/community/posts/mine", null, author), 200);
            assertTrue(contains(mine, id));
            for (var item : mine) if (item.path("id").asInt() == id) assertTrue(item.path("decisionNote").asString().startsWith("Vui lòng"));
        }
    }

    @Test
    void ownerCanResubmitChangesButCannotBypassAnotherReview() throws Exception {
        int id = create("ROOMMATE");
        assertEquals(409, request("PUT", "/api/community/posts/" + id, valid("ROOMMATE"), author).statusCode());
        data(request("POST", "/api/staff/community/posts/" + id + "/review",
                Map.of("decision", "REQUEST_CHANGES", "note", "Vui lòng ghi rõ chi phí hàng tháng."), staff), 200);
        String stranger = register();
        assertFalse(contains(data(request("GET", "/api/community/posts/mine", null, stranger), 200), id));
        assertEquals(404, request("PUT", "/api/community/posts/" + id, valid("ROOMMATE"), stranger).statusCode());
        var corrected = valid("ROOMMATE");
        corrected.put("content", "Đã bổ sung: chi phí 2.200.000 đồng mỗi tháng, chưa bao gồm tiền điện và nước.");
        corrected.put("status", "APPROVED");
        var saved = data(request("PUT", "/api/community/posts/" + id, corrected, author), 200);
        assertEquals("PENDING", saved.path("status").asString());
        assertTrue(saved.path("decisionNote").isNull());
        assertTrue(saved.path("reviewedAt").isNull());
        assertFalse(contains(data(request("GET", "/api/community/posts", null, null), 200), id));
        var approved = data(request("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), staff), 200);
        assertEquals(2, approved.path("history").size());
        assertTrue(contains(data(request("GET", "/api/community/posts", null, null), 200), id));
    }

    @Test
    void authenticationRolesMissingIdsAndSelfReviewAreEnforced() throws Exception {
        assertEquals(401, request("POST", "/api/community/posts", valid("ROOMMATE"), null).statusCode());
        assertEquals(401, request("GET", "/api/community/posts/mine", null, null).statusCode());
        assertEquals(401, request("GET", "/api/staff/community/posts", null, null).statusCode());
        assertEquals(403, request("GET", "/api/staff/community/posts", null, author).statusCode());
        int id = create("ROOMMATE");
        assertEquals(403, request("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), author).statusCode());
        assertEquals(404, request("GET", "/api/staff/community/posts/2147483647", null, staff).statusCode());
        assertEquals(400, request("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "INVALID"), staff).statusCode());
        int staffPost = data(request("POST", "/api/community/posts", valid("SECOND_HAND"), staff), 201).path("id").asInt();
        assertEquals(403, request("POST", "/api/staff/community/posts/" + staffPost + "/review", Map.of("decision", "APPROVE"), staff).statusCode());
        var dashboard = data(request("GET", "/api/staff/dashboard", null, staff), 200);
        boolean linked = false;
        for (var item : dashboard.path("queue")) if (item.path("key").asString().equals("COMMUNITY-" + id)) {
            linked = true;
            assertEquals("/staff/community/detail?id=" + id, item.path("detailLink").asString());
        }
        assertTrue(linked);
    }

    @Test
    void simultaneousStaffDecisionsCreateExactlyOneAuditEntry() throws Exception {
        int id = create("ROOM_TRANSFER");
        String admin = login("admin@hlrcs.com", "admin123");
        var first = client.sendAsync(build("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), staff), HttpResponse.BodyHandlers.ofString());
        var second = client.sendAsync(build("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "REJECT", "note", "Thông tin bài viết cần kiểm tra lại."), admin), HttpResponse.BodyHandlers.ofString());
        var codes = new ArrayList<>(List.of(first.get(15, TimeUnit.SECONDS).statusCode(), second.get(15, TimeUnit.SECONDS).statusCode()));
        Collections.sort(codes);
        assertEquals(List.of(200, 409), codes);
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("COMMUNITY_POST", id).size());
    }
}
