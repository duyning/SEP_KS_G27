package org.hlrcs;

import org.hlrcs.repository.PostMediaRepository;
import org.hlrcs.repository.PostRepository;
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

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:community-image-test;MODE=MySQL;DB_CLOSE_DELAY=-1", "spring.jpa.show-sql=false"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunityImageTests {
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
        return call("POST", "/api/auth/register", Map.of("email", "image-" + UUID.randomUUID() + "@hlrcs.test",
                "password", "Password@123", "fullName", "Image Author"), null, 201).path("accessToken").asString();
    }

    private Map<String, Object> details() {
        return new HashMap<>(Map.of("type", "SECOND_HAND", "title", "Đồ dùng sinh viên có hình ảnh thực tế",
                "content", "Bàn học còn mới và chắc chắn, ảnh chụp thực tế để mọi người tham khảo.", "location", "Tân Xã, Hòa Lạc",
                "authorName", "Người đăng", "authorPhone", "0912345678"));
    }

    private byte[] image(String format, int width, int height) throws Exception {
        var bytes = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, bytes));
        return bytes.toByteArray();
    }

    private MockMultipartFile photo(String name, String type, byte[] bytes) { return new MockMultipartFile("photos", name, type, bytes); }

    private JsonNode upload(Integer id, Map<String, Object> details, String token, int expected, MockMultipartFile... photos) throws Exception {
        var request = multipart(id == null ? "/api/community/posts" : "/api/community/posts/" + id)
                .file(new MockMultipartFile("details", "details.json", "application/json", json.writeValueAsBytes(details)));
        for (var file : photos) request.file(file);
        if (id != null) request.with(value -> { value.setMethod("PUT"); return value; });
        if (token != null) request.header("Authorization", "Bearer " + token);
        return json.readTree(mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }

    private String imagePath(int postId, int imageId) { return "/api/community/posts/" + postId + "/images/" + imageId; }

    @Test
    void jpgJpegAndPngPersistAndOnlyApprovedImagesBecomePublic() throws Exception {
        byte[] png = image("png", 3, 2), jpeg = image("jpg", 2, 3);
        var saved = upload(null, details(), author, 201, photo("Ảnh.PNG", "image/png", png),
                photo("photo.jpg", "image/jpeg", jpeg), photo("photo.JPEG", "image/jpeg", jpeg));
        int id = saved.path("id").asInt(), imageId = saved.path("images").get(0).path("id").asInt();
        assertEquals("PENDING", saved.path("status").asString());
        assertEquals(3, saved.path("images").size());
        assertEquals("Ảnh.PNG", saved.path("images").get(0).path("fileName").asString());
        var image = get(imagePath(id, imageId));
        mvc.perform(image).andExpect(status().isNotFound());
        mvc.perform(get(imagePath(id, imageId)).header("Authorization", "Bearer " + register())).andExpect(status().isNotFound());
        mvc.perform(get(imagePath(id, imageId)).header("Authorization", "Bearer " + author)).andExpect(status().isOk())
                .andExpect(content().contentType("image/png")).andExpect(content().bytes(png))
                .andExpect(header().string("Cache-Control", "private, no-store")).andExpect(header().string("X-Content-Type-Options", "nosniff"));
        mvc.perform(get(imagePath(id, imageId)).header("Authorization", "Bearer " + staff)).andExpect(status().isOk());
        int otherPost = upload(null, details(), author, 201).path("id").asInt();
        mvc.perform(get(imagePath(otherPost, imageId)).header("Authorization", "Bearer " + author)).andExpect(status().isNotFound());
        call("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "APPROVE"), staff, 200);
        mvc.perform(get(imagePath(id, imageId))).andExpect(status().isOk()).andExpect(content().bytes(png));
        call("DELETE", "/api/community/posts/" + id, null, author, 200);
        assertFalse(media.existsById(imageId));
        mvc.perform(get(imagePath(id, imageId))).andExpect(status().isNotFound());
    }

    @Test
    void invalidOrSpoofedFilesAreRejectedWithImageFieldErrorsAndNoPartialPost() throws Exception {
        byte[] png = image("png", 2, 2), jpeg = image("jpg", 2, 2);
        var badFiles = new ArrayList<>(List.of(photo("a.gif", "image/gif", png), photo("a.webp", "image/webp", png),
                photo("a.heic", "image/heic", png), photo("a.svg", "image/svg+xml", png), photo("a.pdf", "application/pdf", png),
                photo("a.mp4", "video/mp4", png), photo("a.png.exe", "image/png", png), photo("empty.png", "image/png", new byte[0]),
                photo("fake.png", "image/png", "not-an-image".getBytes(StandardCharsets.UTF_8)), photo("wrong.png", "image/png", jpeg),
                photo("wrong.jpg", "image/jpeg", png), photo("mime.png", "image/jpeg", png),
                photo("truncated.png", "image/png", Arrays.copyOf(png, 24)),
                photo("oversized.png", "image/png", new byte[5 * 1024 * 1024 + 1]), photo("wide.png", "image/png", image("png", 10001, 1))));
        for (var file : badFiles) {
            long before = posts.count(), mediaBefore = media.count();
            var errors = upload(null, details(), author, 400, photo("valid.png", "image/png", png), file);
            assertTrue(errors.has("images"), errors.toString());
            assertTrue(errors.path("images").asString().contains(file.getOriginalFilename()), errors.toString());
            assertEquals(before, posts.count());
            assertEquals(mediaBefore, media.count());
        }
    }

    @Test
    void countLimitRetainedOwnershipAndResubmissionAreAtomic() throws Exception {
        var png = photo("photo.png", "image/png", image("png", 2, 2));
        assertTrue(upload(null, details(), author, 400, Collections.nCopies(7, png).toArray(MockMultipartFile[]::new)).has("images"));
        int id = upload(null, details(), author, 201, Collections.nCopies(6, png).toArray(MockMultipartFile[]::new)).path("id").asInt();
        int foreign = upload(null, details(), author, 201, png).path("images").get(0).path("id").asInt();
        upload(id, details(), author, 409, png);
        call("POST", "/api/staff/community/posts/" + id + "/review", Map.of("decision", "REQUEST_CHANGES", "note", "Vui lòng thay hình ảnh rõ nét hơn."), staff, 200);
        var existing = call("GET", "/api/community/posts/mine", null, author, 200);
        var own = new ArrayList<Integer>();
        for (var post : existing) if (post.path("id").asInt() == id) for (var row : post.path("images")) own.add(row.path("id").asInt());
        var updated = details();
        updated.put("retainedImageIds", List.of(foreign));
        assertTrue(upload(id, updated, author, 400).has("images"));
        updated.put("retainedImageIds", List.of(own.get(0), own.get(0)));
        assertTrue(upload(id, updated, author, 400).has("images"));
        updated.put("retainedImageIds", own);
        assertTrue(upload(id, updated, author, 400, png).has("images"));
        updated.put("retainedImageIds", List.of(own.get(0)));
        upload(id, updated, register(), 404, png);
        assertTrue(upload(id, updated, author, 400, photo("fake.png", "image/png", new byte[] {1})).has("images"));
        assertEquals("NEED_CHANGES", posts.findById(id).orElseThrow().getStatus().name());
        for (int imageId : own) assertTrue(media.existsById(imageId));
        var corrected = upload(id, updated, author, 200, png);
        assertEquals("PENDING", corrected.path("status").asString());
        assertEquals(2, corrected.path("images").size());
        assertTrue(media.existsById(own.get(0)));
        for (int imageId : own.subList(1, own.size())) assertFalse(media.existsById(imageId));
        mvc.perform(get(imagePath(id, own.get(0)))).andExpect(status().isNotFound());
        upload(null, details(), null, 401, png);
    }
}
