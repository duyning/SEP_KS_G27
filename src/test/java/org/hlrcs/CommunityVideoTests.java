package org.hlrcs;

import org.hlrcs.repository.PostMediaRepository;
import org.hlrcs.repository.PostRepository;
import org.jcodec.api.SequenceEncoder;
import org.jcodec.common.io.ByteBufferSeekableByteChannel;
import org.jcodec.common.model.ColorSpace;
import org.jcodec.common.model.Picture;
import org.jcodec.common.model.Rational;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:community-video-test;MODE=MySQL;DB_CLOSE_DELAY=-1", "spring.jpa.show-sql=false"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunityVideoTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PostRepository posts;
    @Autowired PostMediaRepository media;
    private String author;
    private String staff;

    @BeforeEach
    void actors() throws Exception {
        author = register();
        staff = call("POST", "/api/auth/login", Map.of("email", "staff@hlrcs.com", "password", "123456"), null, 200).path("accessToken").asString();
    }

    private JsonNode call(String method, String path, Object body, String token, int expected) throws Exception {
        var request = request(method, java.net.URI.create(path));
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.contentType("application/json").content(json.writeValueAsBytes(body));
        return json.readTree(mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }

    private String register() throws Exception {
        return call("POST", "/api/auth/register", Map.of("email", "video-" + UUID.randomUUID() + "@hlrcs.test",
                "password", "Password@123", "fullName", "Video Author"), null, 201).path("accessToken").asString();
    }

    private Map<String, Object> details() {
        return new HashMap<>(Map.of("type", "SECOND_HAND", "title", "Đồ dùng sinh viên có video thực tế",
                "content", "Bàn học còn mới và chắc chắn, video chụp thực tế để mọi người tham khảo.", "location", "Tân Xã, Hòa Lạc",
                "authorName", "Người đăng", "authorPhone", "0912345678"));
    }

    private byte[] video(int width, int height, Rational fps) throws Exception {
        var channel = ByteBufferSeekableByteChannel.writeToByteBuffer(ByteBuffer.allocate(1024 * 1024));
        var encoder = SequenceEncoder.createWithFps(channel, fps);
        encoder.encodeNativeFrame(Picture.create(width, height, ColorSpace.RGB));
        encoder.finish();
        var data = channel.getContents();
        byte[] bytes = new byte[data.remaining()]; data.get(bytes);
        return bytes;
    }

    private MockMultipartFile clip(String name, String type, byte[] bytes) { return new MockMultipartFile("videos", name, type, bytes); }

    private JsonNode upload(Integer id, Map<String, Object> details, String token, int expected, MockMultipartFile... files) throws Exception {
        var request = multipart(id == null ? "/api/community/posts" : "/api/community/posts/" + id)
                .file(new MockMultipartFile("details", "details.json", "application/json", json.writeValueAsBytes(details)));
        for (var file : files) request.file(file);
        if (id != null) request.with(value -> { value.setMethod("PUT"); return value; });
        if (token != null) request.header("Authorization", "Bearer " + token);
        return json.readTree(mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }

    @Test
    void realH264VideoPersistsAndSharesPostVisibilityIncludingRangeRequests() throws Exception {
        byte[] bytes = video(320, 180, Rational.R(1, 1));
        Files.createDirectories(Path.of("logs"));
        Files.write(Path.of("logs", "post-video-test.mp4"), bytes);
        var saved = upload(null, details(), author, 201, clip("VIDEO.MP4", "video/mp4", bytes));
        int id = saved.path("id").asInt(), videoId = saved.path("videos").get(0).path("id").asInt();
        assertEquals("PENDING", saved.path("status").asString());
        assertEquals(1, saved.path("videos").size());
        String path = "/api/community/posts/" + id + "/videos/" + videoId;
        mvc.perform(get(path)).andExpect(status().isNotFound());
        mvc.perform(get(path).header("Authorization", "Bearer " + register())).andExpect(status().isNotFound());
        mvc.perform(get(path).header("Authorization", "Bearer " + author)).andExpect(status().isOk()).andExpect(content().contentType("video/mp4")).andExpect(content().bytes(bytes));
        mvc.perform(get(path).header("Authorization", "Bearer " + staff)).andExpect(status().isOk());
        mvc.perform(get("/api/community/posts/" + id + "/images/" + videoId).header("Authorization", "Bearer " + author)).andExpect(status().isNotFound());
        call("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), staff, 200);
        mvc.perform(get(path).header("Range", "bytes=0-15")).andExpect(status().isPartialContent())
                .andExpect(content().bytes(Arrays.copyOf(bytes, 16))).andExpect(header().string("Cache-Control", "private, no-store"));
        call("DELETE", "/api/community/posts/" + id, null, author, 200);
        assertFalse(media.existsById(videoId));
        mvc.perform(get(path)).andExpect(status().isNotFound());
    }

    @Test
    void invalidVideosAreRejectedWithoutPartialPost() throws Exception {
        byte[] valid = video(32, 32, Rational.R(1, 1));
        var pngBytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2, 2, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", pngBytes);
        var photo = new MockMultipartFile("photos", "photo.png", "image/png", pngBytes.toByteArray());
        var bad = List.of(clip("a.mov", "video/quicktime", valid), clip("a.webm", "video/webm", valid),
                clip("a.mp4", "application/octet-stream", valid), clip("empty.mp4", "video/mp4", new byte[0]),
                clip("fake.mp4", "video/mp4", "not video".getBytes(StandardCharsets.UTF_8)),
                clip("cut.mp4", "video/mp4", Arrays.copyOf(valid, valid.length - 20)),
                clip("large.mp4", "video/mp4", new byte[50 * 1024 * 1024 + 1]),
                clip("long.mp4", "video/mp4", video(32, 32, Rational.R(1, 181))),
                clip("wide.mp4", "video/mp4", video(1936, 16, Rational.R(1, 1))));
        for (var file : bad) {
            long before = posts.count(), beforeMedia = media.count();
            var errors = upload(null, details(), author, 400, photo, file);
            assertTrue(errors.has("videos"), errors.toString());
            assertEquals(before, posts.count()); assertEquals(beforeMedia, media.count());
        }
    }

    @Test
    void authorCanRetainReplaceOrRemoveVideoOnResubmissionAndCannotUseForeignVideo() throws Exception {
        var file = clip("clip.mp4", "video/mp4", video(32, 32, Rational.R(1, 1)));
        assertTrue(upload(null, details(), author, 400, file, file).has("videos"));
        var saved = upload(null, details(), author, 201, file);
        int id = saved.path("id").asInt(), videoId = saved.path("videos").get(0).path("id").asInt();
        int foreignId = upload(null, details(), author, 201, file).path("videos").get(0).path("id").asInt();
        call("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "REQUEST_CHANGES", "note", "Vui lòng thay video rõ nét hơn."), staff, 200);
        assertTrue(upload(id, details(), author, 400, file).has("videos"));
        var updated = details(); updated.put("retainedVideoIds", List.of(foreignId));
        assertTrue(upload(id, updated, author, 400).has("videos"));
        updated.put("retainedVideoIds", List.of());
        upload(id, updated, register(), 404, file);
        assertTrue(upload(id, updated, author, 400, clip("fake.mp4", "video/mp4", new byte[] {1})).has("videos"));
        assertTrue(media.existsById(videoId));
        assertEquals("NEED_CHANGES", posts.findById(id).orElseThrow().getStatus().name());
        var replaced = upload(id, updated, author, 200, file);
        assertEquals("PENDING", replaced.path("status").asString());
        int replacementId = replaced.path("videos").get(0).path("id").asInt();
        assertFalse(media.existsById(videoId));
        call("POST", "/api/staff/community/posts/" + id + "/review",
                Map.of("decision", "REQUEST_CHANGES", "note", "Vui lòng kiểm tra lại video.", "revision", 1), staff, 200);
        var removed = call("PUT", "/api/community/posts/" + id, updated, author, 200);
        assertEquals(0, removed.path("videos").size());
        assertFalse(media.existsById(replacementId));
        upload(null, details(), null, 401, file);
    }

    @Test
    void staffRevisionRequestRequiresAuthorChangesAndANewApprovalWithMediaPreserved() throws Exception {
        var original = details();
        byte[] video = video(32, 32, Rational.R(1, 1));
        var pngBytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2, 2, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", pngBytes);
        var created = upload(null, original, author, 201,
                new MockMultipartFile("photos", "photo.png", "image/png", pngBytes.toByteArray()), clip("clip.mp4", "video/mp4", video));
        int id = created.path("id").asInt();
        String note = "Bổ sung tình trạng bàn học và mô tả rõ các vết trầy xước.";
        assertTrue(call("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "REQUEST_CHANGES"), staff, 400).has("note"));
        var requested = call("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "REQUEST_CHANGES", "note", note), staff, 200);
        assertEquals("NEED_CHANGES", requested.path("post").path("status").asString());
        assertEquals(note, requested.path("post").path("decisionNote").asString());
        var mine = call("GET", "/api/community/posts/mine", null, author, 200);
        boolean received = false;
        for (var post : mine) if (post.path("id").asInt() == id) {
            received = true;
            assertEquals(note, post.path("decisionNote").asString());
            assertEquals("NEED_CHANGES", post.path("status").asString());
        }
        assertTrue(received, "Author must receive the staff instruction from the API");
        call("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), staff, 409);
        call("PUT", "/api/community/posts/" + id, original, register(), 404);
        call("PUT", "/api/community/posts/" + id, original, author, 400);
        assertEquals("NEED_CHANGES", posts.findById(id).orElseThrow().getStatus().name());
        assertEquals(note, posts.findById(id).orElseThrow().getReviewNote());
        var invalid = new HashMap<>(original); invalid.put("title", "short");
        call("PUT", "/api/community/posts/" + id, invalid, author, 400);
        var revised = new HashMap<>(original);
        revised.put("content", "Đã bổ sung: bàn học mới sử dụng 6 tháng, mặt bàn có một vết trầy nhỏ, chân bàn chắc chắn.");
        revised.put("status", "APPROVED");
        var resubmitted = call("PUT", "/api/community/posts/" + id, revised, author, 200);
        assertEquals("PENDING", resubmitted.path("status").asString());
        assertTrue(resubmitted.path("decisionNote").isNull());
        assertTrue(resubmitted.path("reviewedBy").isNull());
        assertTrue(resubmitted.path("reviewedAt").isNull());
        assertEquals(created.path("images"), resubmitted.path("images"));
        assertEquals(created.path("videos"), resubmitted.path("videos"));
        var detail = call("GET", "/api/staff/community/posts/" + id, null, staff, 200);
        assertEquals("PENDING", detail.path("post").path("status").asString());
        assertEquals(revised.get("content"), detail.path("post").path("content").asString());
        assertEquals(note, detail.path("history").get(0).path("note").asString());
        for (var post : call("GET", "/api/community/posts", null, null, 200)) assertNotEquals(id, post.path("id").asInt());
        call("PUT", "/api/community/posts/" + id, revised, author, 409);
        var approved = call("POST", "/api/staff/community/posts/" + id + "/review",
                Map.of("decision", "APPROVE", "revision", 1), staff, 200);
        assertEquals("APPROVED", approved.path("post").path("status").asString());
        assertEquals(2, approved.path("history").size());
        boolean published = false;
        for (var post : call("GET", "/api/community/posts", null, null, 200)) if (post.path("id").asInt() == id) published = true;
        assertTrue(published, "Only a new staff approval can publish the resubmitted post");
    }

    @Test
    void tenRevisionRoundsKeepTheSamePostMediaAndCompleteReviewHistory() throws Exception {
        var values = details();
        byte[] bytes = video(32, 32, Rational.R(1, 1));
        var pngBytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2, 2, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", pngBytes);
        var created = upload(null, values, author, 201,
                new MockMultipartFile("photos", "photo.png", "image/png", pngBytes.toByteArray()), clip("clip.mp4", "video/mp4", bytes));
        int id = created.path("id").asInt(), videoId = created.path("videos").get(0).path("id").asInt();
        long postCount = posts.count(), mediaCount = media.count();
        var expectedNotes = new HashSet<String>();

        for (int round = 1; round <= 10; round++) {
            String note = "Lần " + round + ": vui lòng bổ sung chi tiết tình trạng và thông tin liên hệ.";
            expectedNotes.add(note);
            var reviewed = call("POST", "/api/staff/community/posts/" + id + "/review",
                    Map.of("decision", "REQUEST_CHANGES", "note", note, "revision", round - 1), staff, 200);
            assertEquals("NEED_CHANGES", reviewed.path("post").path("status").asString());
            assertEquals(note, reviewed.path("post").path("decisionNote").asString());
            assertEquals(round, reviewed.path("history").size());

            values.put("content", "Nội dung đã chỉnh sửa lần " + round + ": đã bổ sung tình trạng thực tế của bàn học và thông tin theo hướng dẫn.");
            var resubmitted = call("PUT", "/api/community/posts/" + id, values, author, 200);
            assertEquals(id, resubmitted.path("id").asInt());
            assertEquals("PENDING", resubmitted.path("status").asString());
            assertTrue(resubmitted.path("decisionNote").isNull());
            assertTrue(resubmitted.path("reviewedBy").isNull());
            assertTrue(resubmitted.path("reviewedAt").isNull());
            assertEquals(created.path("images"), resubmitted.path("images"));
            assertEquals(created.path("videos"), resubmitted.path("videos"));
            assertEquals(postCount, posts.count());
            assertEquals(mediaCount, media.count());
            mvc.perform(get("/api/community/posts/" + id + "/videos/" + videoId).header("Authorization", "Bearer " + author))
                    .andExpect(status().isOk()).andExpect(content().bytes(bytes));
            for (var post : call("GET", "/api/community/posts", null, null, 200)) assertNotEquals(id, post.path("id").asInt());
        }

        var approved = call("POST", "/api/staff/community/posts/" + id + "/review",
                Map.of("decision", "APPROVE", "revision", 10), staff, 200);
        assertEquals("APPROVED", approved.path("post").path("status").asString());
        assertEquals(11, approved.path("history").size());
        var actualNotes = new HashSet<String>();
        for (var action : approved.path("history")) if (action.path("action").asString().equals("NEED_CHANGES")) actualNotes.add(action.path("note").asString());
        assertEquals(expectedNotes, actualNotes);
        boolean published = false;
        for (var post : call("GET", "/api/community/posts", null, null, 200)) if (post.path("id").asInt() == id) published = true;
        assertTrue(published);
    }
}
