package org.hlrcs;

import org.hlrcs.repository.ModerationLogRepository;
import org.hlrcs.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:community-delete-test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunityDeletionTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PostRepository posts;
    @Autowired ModerationLogRepository logs;
    @Autowired JdbcTemplate jdbc;
    private String author;
    private String staff;

    @BeforeEach
    void actors() throws Exception {
        author = register();
        staff = data("POST", "/api/auth/login", Map.of("email", "staff@hlrcs.com", "password", "123456"), null, 200)
                .path("accessToken").asString();
    }

    private JsonNode data(String method, String path, Object body, String token, int expected) throws Exception {
        var request = MockMvcRequestBuilders.request(method, java.net.URI.create(path));
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.contentType("application/json").content(json.writeValueAsString(body));
        var result = mvc.perform(request).andExpect(status().is(expected)).andReturn();
        return json.readTree(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).path("data");
    }

    private String register() throws Exception {
        return data("POST", "/api/auth/register", Map.of("email", "delete-" + UUID.randomUUID() + "@hlrcs.test",
                "password", "Password@123", "fullName", "Post Author"), null, 201).path("accessToken").asString();
    }

    private int create(String type) throws Exception {
        return data("POST", "/api/community/posts", Map.of("type", type, "title", "Bài viết dùng để kiểm thử xóa",
                "content", "Nội dung bài viết kiểm thử đủ dài để gửi tới hệ thống kiểm duyệt.",
                "location", "Tân Xã, Hòa Lạc", "authorName", "Người đăng", "authorPhone", "0912345678"), author, 201)
                .path("id").asInt();
    }

    private boolean contains(JsonNode list, int id) {
        for (var post : list) if (post.path("id").asInt() == id) return true;
        return false;
    }

    @Test
    void authorsCanDeleteEveryReviewStatusAndPostsDisappearFromAllLists() throws Exception {
        int retained = create("SECOND_HAND");
        for (String decision : new String[] {"PENDING", "APPROVE", "REJECT", "REQUEST_CHANGES"}) {
            int id = create("ROOM_TRANSFER");
            if (!decision.equals("PENDING")) {
                data("POST", "/api/staff/community/posts/" + id + "/review",
                        Map.of("decision", decision, "note", "Thông tin đã được kiểm tra."), staff, 200);
            }
            assertTrue(contains(data("GET", "/api/community/posts/mine", null, author, 200), id));
            if (decision.equals("APPROVE")) assertTrue(contains(data("GET", "/api/community/posts", null, null, 200), id));
            data("DELETE", "/api/community/posts/" + id, null, author, 200);
            assertFalse(posts.existsById(id));
            assertFalse(contains(data("GET", "/api/community/posts", null, null, 200), id));
            assertFalse(contains(data("GET", "/api/community/posts/mine", null, author, 200), id));
            assertFalse(contains(data("GET", "/api/staff/community/posts", null, staff, 200), id));
            data("GET", "/api/staff/community/posts/" + id, null, staff, 404);
            data("DELETE", "/api/community/posts/" + id, null, author, 404);
            data("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), staff, 404);
            if (!decision.equals("PENDING")) assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("COMMUNITY_POST", id).size());
        }
        assertTrue(posts.existsById(retained));
    }

    @Test
    void deletionRequiresAuthenticationAndOwnershipEvenForStaff() throws Exception {
        int id = create("ROOMMATE");
        data("DELETE", "/api/community/posts/" + id, null, null, 401);
        data("DELETE", "/api/community/posts/" + id, null, register(), 404);
        data("DELETE", "/api/community/posts/" + id, null, staff, 404);
        data("DELETE", "/api/community/posts/2147483647", null, author, 404);
        assertTrue(posts.existsById(id));
        data("DELETE", "/api/community/posts/" + id, null, author, 200);
    }

    @Test
    void deletionRemovesRelatedRowsWithoutRelyingOnDatabaseCascade() throws Exception {
        String[][] categories = {{"ROOM_TRANSFER", "pass_room_post_details"}, {"ROOMMATE", "roommate_post_details"}, {"SECOND_HAND", "pass_item_post_details"}};
        for (var category : categories) {
            int id = create(category[0]);
            int authorId = jdbc.queryForObject("select author_id from posts where post_id = ?", Integer.class, id);
            jdbc.update("insert into comments (post_id, author_id, content, created_at) values (?, ?, ?, CURRENT_TIMESTAMP)", id, authorId, "Test comment");
            jdbc.update("insert into post_media (post_id, media_type, media_url) values (?, ?, ?)", id, "IMAGE", "/test.jpg");
            jdbc.update("insert into " + category[1] + " (post_id) values (?)", id);
            data("DELETE", "/api/community/posts/" + id, null, author, 200);
            for (String table : new String[] {"posts", "comments", "post_media", category[1]}) {
                assertEquals(0, jdbc.queryForObject("select count(*) from " + table + " where post_id = ?", Integer.class, id));
            }
        }
    }
}
