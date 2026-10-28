package org.hlrcs;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:community-comments;MODE=MySQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunityCommentTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    private String author;
    private String commenter;
    private String staff;

    @BeforeEach
    void actors() throws Exception {
        author = register("Post owner");
        commenter = register("Comment author");
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

    private String register(String name) throws Exception {
        return data("POST", "/api/auth/register", Map.of("email", "comment-" + UUID.randomUUID() + "@hlrcs.test",
                "password", "Password@123", "fullName", name), null, 201).path("accessToken").asString();
    }

    private int post(boolean approve) throws Exception {
        int id = data("POST", "/api/community/posts", Map.of("type", "SECOND_HAND", "title", "Bài viết kiểm thử bình luận",
                "content", "Nội dung bài viết đủ dài để kiểm tra chức năng bình luận cộng đồng.",
                "location", "Tân Xã, Hòa Lạc", "authorName", "Liên hệ chủ bài", "authorPhone", "0912345678"), author, 201).path("id").asInt();
        if (approve) data("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), staff, 200);
        return id;
    }

    private String path(int postId) { return "/api/community/posts/" + postId + "/comments"; }

    private int feedCount(int postId) throws Exception {
        for (var post : data("GET", "/api/community/posts", null, null, 200)) {
            if (post.path("id").asInt() == postId) return post.path("commentCount").asInt(-1);
        }
        fail("Post missing from published feed");
        return -1;
    }

    @Test
    void authorCanCreateEditDeleteAndPublicCanReadPaginatedComments() throws Exception {
        int post = post(true);
        String path = path(post);
        assertEquals(0, feedCount(post));
        var first = data("POST", path, Map.of("content", "  Hàng còn không bạn?  "), commenter, 201);
        int id = first.path("id").asInt();
        assertEquals("Hàng còn không bạn?", first.path("content").asString());
        assertEquals("Comment author", first.path("authorName").asString());
        assertEquals(post, first.path("postId").asInt());
        assertFalse(first.path("createdAt").isNull());
        assertTrue(first.path("authorId").asInt() > 0);
        assertFalse(first.has("email"));
        data("POST", path, Map.of("content", "Mình muốn xem hàng."), author, 201);
        assertEquals(2, feedCount(post));
        var page = data("GET", path + "?page=0&size=1", null, null, 200);
        assertEquals(2, page.path("totalElements").asInt());
        assertEquals(2, page.path("totalPages").asInt());
        assertEquals(id, page.path("content").get(0).path("id").asInt());
        var second = data("GET", path + "?page=1&size=1", null, null, 200);
        assertNotEquals(id, second.path("content").get(0).path("id").asInt());
        assertEquals(0, data("GET", path + "?page=5", null, null, 200).path("content").size());
        assertEquals("Mình lấy chiều nay nhé.", data("PUT", path + "/" + id,
                Map.of("content", "Mình lấy chiều nay nhé."), commenter, 200).path("content").asString());
        data("DELETE", path + "/" + id, null, commenter, 200);
        assertEquals(1, feedCount(post));
        assertEquals(1, data("GET", path, null, null, 200).path("totalElements").asInt());
        data("DELETE", path + "/" + id, null, commenter, 404);
    }

    @Test
    void authenticationOwnershipAndPostScopeAreEnforced() throws Exception {
        int post = post(true);
        String path = path(post);
        int id = data("POST", path, Map.of("content", "Bình luận của người khác"), commenter, 201).path("id").asInt();
        data("POST", path, Map.of("content", "Chưa đăng nhập"), null, 401);
        data("PUT", path + "/" + id, Map.of("content", "Không được sửa"), null, 401);
        data("DELETE", path + "/" + id, null, null, 401);
        data("PUT", path + "/" + id, Map.of("content", "Chủ bài không được sửa"), author, 404);
        data("DELETE", path + "/" + id, null, author, 404);
        data("PUT", path + "/" + id, Map.of("content", "Staff không được sửa"), staff, 404);
        String otherPost = path(post(true));
        data("PUT", otherPost + "/" + id, Map.of("content", "Sai bài viết"), commenter, 404);
        data("DELETE", otherPost + "/" + id, null, staff, 404);
        data("DELETE", path + "/" + id, null, staff, 200);
    }

    @Test
    void unpublishedPostsAndInvalidContentAreRejected() throws Exception {
        for (String decision : new String[]{"PENDING", "REJECT", "REQUEST_CHANGES"}) {
            int post = post(false);
            if (!decision.equals("PENDING")) data("POST", "/api/staff/community/posts/" + post + "/review",
                    Map.of("decision", decision, "note", "Vui lòng chỉnh lại nội dung bài."), staff, 200);
            data("GET", path(post), null, null, 404);
            data("POST", path(post), Map.of("content", "Bài chưa công khai"), author, 404);
        }
        String path = path(post(true));
        for (Object body : new Object[]{Map.of(), Map.of("content", " \n\t "), Map.of("content", "x".repeat(2001))}) {
            data("POST", path, body, commenter, 400);
        }
        int id = data("POST", path, Map.of("content", "x".repeat(2000)), commenter, 201).path("id").asInt();
        data("PUT", path + "/" + id, Map.of("content", " "), commenter, 400);
        data("POST", path(2147483647), Map.of("content", "Bài không tồn tại"), commenter, 404);
        for (String query : new String[]{"?page=-1", "?size=0", "?size=101", "?page=abc", "?page=2147483647"}) {
            data("GET", path + query, null, null, 400);
        }
    }

    @Test
    void repliesStayInTheirThreadAndEditingKeepsOwnershipAndTimestamps() throws Exception {
        int post = post(true);
        String path = path(post);
        var root = data("POST", path, Map.of("content", "Bàn còn không bạn?"), commenter, 201);
        int rootId = root.path("id").asInt();
        assertTrue(root.path("updatedAt").isNull());
        int firstReply = data("POST", path + "/" + rootId + "/replies", Map.of("content", "Bàn vẫn còn nhé."), author, 201).path("id").asInt();
        var nested = data("POST", path + "/" + firstReply + "/replies", Map.of("content", "Mình qua xem chiều nay."), commenter, 201);
        assertEquals(rootId, nested.path("parentId").asInt());
        assertEquals(firstReply, nested.path("replyToId").asInt());
        assertEquals("Post owner", nested.path("replyToAuthorName").asString());
        var roots = data("GET", path, null, null, 200);
        assertEquals(1, roots.path("totalElements").asInt());
        assertEquals(3, roots.path("commentCount").asInt());
        assertEquals(2, roots.path("content").get(0).path("replyCount").asInt());
        var replies = data("GET", path + "/" + rootId + "/replies?size=1", null, null, 200);
        assertEquals(2, replies.path("totalPages").asInt());
        assertEquals(firstReply, replies.path("content").get(0).path("id").asInt());
        assertEquals(3, feedCount(post));
        var edited = data("PUT", path + "/" + rootId, Map.of("content", "Mình cần xem bàn trước."), commenter, 200);
        assertEquals(root.path("createdAt"), edited.path("createdAt"));
        assertFalse(edited.path("updatedAt").isNull());
        assertEquals(edited.path("updatedAt"), data("PUT", path + "/" + rootId,
                Map.of("content", "  Mình cần xem bàn trước.  "), commenter, 200).path("updatedAt"));
        data("PUT", path + "/" + firstReply, Map.of("content", "Không được sửa phản hồi"), commenter, 404);
        data("PUT", path + "/" + firstReply, Map.of("content", "Bạn qua xem nhé."), author, 200);
        data("POST", path + "/" + rootId + "/replies", Map.of("content", "Chưa đăng nhập"), null, 401);
        data("POST", path + "/" + rootId + "/replies", Map.of("content", "  "), author, 400);
        data("POST", path(post(true)) + "/" + rootId + "/replies", Map.of("content", "Sai bài viết"), commenter, 404);
        data("GET", path(post(false)) + "/" + rootId + "/replies", null, null, 404);
        data("DELETE", path + "/" + firstReply, null, author, 200);
        var remaining = data("GET", path + "/" + rootId + "/replies", null, null, 200);
        assertEquals(1, remaining.path("totalElements").asInt());
        assertTrue(remaining.path("content").get(0).path("replyToId").isNull());
        data("DELETE", path + "/" + rootId, null, commenter, 200);
        assertEquals(0, feedCount(post));
        assertEquals(0, data("GET", path, null, null, 200).path("totalElements").asInt());
        data("POST", path + "/" + rootId + "/replies", Map.of("content", "Bình luận đã xóa"), author, 404);
    }

    @Test
    void deletingPostAlsoDeletesCommentsAndPreventsFurtherAccess() throws Exception {
        int post = post(true);
        int id = data("POST", path(post), Map.of("content", "Bình luận trước khi xóa bài"), commenter, 201).path("id").asInt();
        data("POST", path(post) + "/" + id + "/replies", Map.of("content", "Phản hồi trước khi xóa bài"), author, 201);
        data("DELETE", "/api/community/posts/" + post, null, author, 200);
        data("GET", path(post), null, null, 404);
        data("POST", path(post), Map.of("content", "Không thể gửi"), commenter, 404);
        data("PUT", path(post) + "/" + id, Map.of("content", "Không thể sửa"), commenter, 404);
        data("DELETE", path(post) + "/" + id, null, commenter, 404);
    }
}
