package org.hlrcs;

import org.hlrcs.dto.CollectedPostDtos.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.hlrcs.service.FacebookScraperClient;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class CollectedPostTests {
    static final String ROOT = "/api/staff/collected-posts";
    static final String PUBLIC = "/api/public/collected-posts";
    static final String GROUP = "https://www.facebook.com/groups/hoalac";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired CollectedPostRepository posts;
    @Autowired JwtTokenProvider jwt;
    @MockitoBean FacebookScraperClient worker;
    User staff;
    @BeforeEach void setup() {
        posts.deleteAll();
        staff = account(UserRole.STAFF);
    }

    @Test void onlyStaffAndAdminCanCollectManageAndPublish() throws Exception {
        mvc.perform(get(ROOT)).andExpect(status().isUnauthorized());
        for (var role : List.of(UserRole.USER, UserRole.ROOM_HOST)) {
            var bearer = token(account(role));
            mvc.perform(get(ROOT).header("Authorization", bearer)).andExpect(status().isForbidden());
            for (var path : List.of("/scrape", "/publish", "/unpublish", "/auth/login", "/auth/cancel"))
                mvc.perform(post(ROOT + path).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"groupUrl\":\"" + GROUP + "\",\"postIds\":[1]}" )).andExpect(status().isForbidden());
            mvc.perform(get(ROOT + "/auth/status").header("Authorization", bearer)).andExpect(status().isForbidden());
            mvc.perform(delete(ROOT + "/1").header("Authorization", bearer)).andExpect(status().isForbidden());
        }
        for (var user : List.of(staff, account(UserRole.ADMIN)))
            mvc.perform(get(ROOT).header("Authorization", token(user))).andExpect(status().isOk());
        verifyNoInteractions(worker);
    }

    @Test void importIsPrivateDeduplicatedSanitizedAndExplicitlyPublished() throws Exception {
        var now = Instant.now();
        var raw = new RawPost("123", "Tác giả", "Nội dung", "javascript:alert(1)", now, null,
                List.of("https://scontent.xx.fbcdn.net/photo.jpg", "https://evil.example/a.jpg", "http://127.0.0.1/private"));
        when(worker.scrape(GROUP)).thenReturn(new ScrapeResult(List.of(raw, raw,
                new RawPost("124", "Cũ", "Cũ", "", now.minusSeconds(90000), null, List.of())), List.of(), true));
        mvc.perform(post(ROOT + "/scrape").header("Authorization", token(staff)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("groupUrl", GROUP + "/?ref=test"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.imported").value(1)).andExpect(jsonPath("$.data.skipped").value(2));
        mvc.perform(get(PUBLIC)).andExpect(status().isOk()).andExpect(jsonPath("$.data.posts.length()").value(0));
        var post = posts.findAll().get(0);
        assertEquals(GROUP + "/posts/123/", post.getSourceUrl());
        assertEquals(List.of("https://scontent.xx.fbcdn.net/photo.jpg"), post.getImages());
        assertEquals(staff.getUserId(), post.getCollectedBy().getUserId());
        select("publish", List.of(post.getId()), staff, 200);
        select("publish", List.of(post.getId()), staff, 200);
        mvc.perform(get(PUBLIC)).andExpect(jsonPath("$.data.posts[0].caption").value("Nội dung"))
                .andExpect(jsonPath("$.data.posts[0].collectedBy").doesNotExist());
        // A second collection never overwrites content already selected for publication.
        mvc.perform(post(ROOT + "/scrape").header("Authorization", token(staff)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("groupUrl", GROUP))))
                .andExpect(jsonPath("$.data.imported").value(0));
        assertEquals(1, posts.count());
        select("unpublish", List.of(post.getId()), account(UserRole.ADMIN), 200);
        mvc.perform(get(PUBLIC)).andExpect(jsonPath("$.data.posts.length()").value(0));
    }

    @Test void cursorDoesNotExposeDraftsOrRepeatPostsAndSelectionIsAtomic() throws Exception {
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < 15; i++) ids.add(save("" + (1000 + i), true).getId());
        var draft = save("9999", false);
        var first = json.readTree(mvc.perform(get(PUBLIC)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data");
        assertEquals(12, first.path("posts").size());
        long cursor = first.path("nextCursor").asLong();
        mvc.perform(get(PUBLIC).param("before", "" + cursor)).andExpect(jsonPath("$.data.posts.length()").value(3))
                .andExpect(jsonPath("$.data.nextCursor").isEmpty());
        select("publish", List.of(draft.getId(), Long.MAX_VALUE), staff, 404);
        assertFalse(posts.findById(draft.getId()).orElseThrow().isPublished());
        select("publish", List.of(), staff, 400);
        mvc.perform(get(PUBLIC).param("before", "-1")).andExpect(status().isBadRequest());
    }

    @Test void rejectsInvalidSourceBeforeCallingWorker() throws Exception {
        for (var url : List.of("https://evil.example/groups/test", "http://www.facebook.com/groups/test", "https://www.facebook.com@127.0.0.1/groups/test"))
            mvc.perform(post(ROOT + "/scrape").header("Authorization", token(staff)).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("groupUrl", url)))).andExpect(status().isBadRequest());
        verifyNoInteractions(worker);
    }

    @Test void deletionHidesPostFromBothFeedsAndCannotBeRepublishedOrReimported() throws Exception {
        var post = save("888", true);
        mvc.perform(delete(ROOT + "/" + post.getId())).andExpect(status().isUnauthorized());
        mvc.perform(delete(ROOT + "/" + post.getId()).header("Authorization", token(staff))).andExpect(status().isOk());
        mvc.perform(get(PUBLIC)).andExpect(jsonPath("$.data.posts.length()").value(0));
        mvc.perform(get(ROOT).header("Authorization", token(staff))).andExpect(jsonPath("$.data.posts.length()").value(0));
        select("publish", List.of(post.getId()), staff, 404);
        mvc.perform(delete(ROOT + "/" + post.getId()).header("Authorization", token(account(UserRole.ADMIN)))).andExpect(status().isOk());
        when(worker.scrape(GROUP)).thenReturn(new ScrapeResult(List.of(new RawPost("888", "A", "Text", "", Instant.now(), null, List.of())), List.of(), true));
        mvc.perform(post(ROOT + "/scrape").header("Authorization", token(staff)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("groupUrl", GROUP)))).andExpect(jsonPath("$.data.imported").value(0));
        assertTrue(posts.findById(post.getId()).orElseThrow().isDeleted());
    }

    @Test void importsEveryImageAndEnrichesExistingDraftWithoutChangingPublishedPosts() throws Exception {
        var images = List.of("https://scontent.xx.fbcdn.net/a.jpg", "https://scontent.xx.fbcdn.net/b.jpg",
                "https://scontent.xx.fbcdn.net/c.jpg", "https://scontent.xx.fbcdn.net/d.jpg");
        var draft = save("555", false);
        draft.setImages(new ArrayList<>(images.subList(0, 2))); posts.save(draft);
        var live = save("666", true);
        when(worker.scrape(GROUP)).thenReturn(new ScrapeResult(List.of(
                new RawPost("555", "A", "Text", "", Instant.now(), null, images),
                new RawPost("666", "A", "Text", "", Instant.now(), null, images),
                new RawPost("777", "A", "Text", "", Instant.now(), null, images)), List.of(), true));
        mvc.perform(post(ROOT + "/scrape").header("Authorization", token(staff)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("groupUrl", GROUP)))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imported").value(1));
        assertEquals(images, posts.findById(draft.getId()).orElseThrow().getImages());
        assertEquals(images, posts.findByExternalId("777").orElseThrow().getImages());
        assertTrue(posts.findById(live.getId()).orElseThrow().getImages().isEmpty());
    }
    private void select(String action, List<Long> ids, User user, int status) throws Exception {
        mvc.perform(post(ROOT + "/" + action).header("Authorization", token(user)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("postIds", ids)))).andExpect(status().is(status));
    }
    private CollectedPost save(String id, boolean published) {
        var post = new CollectedPost(); post.setExternalId(id); post.setSourceUrl(GROUP + "/posts/" + id + "/");
        post.setGroupUrl(GROUP); post.setAuthor("Tác giả"); post.setCaption("Nội dung");
        post.setSourcePublishedAt(Instant.now()); post.setCollectedAt(Instant.now()); post.setCollectedBy(staff);
        post.setPublished(published); return posts.save(post);
    }
    private User account(UserRole role) {
        return users.save(User.builder().email(UUID.randomUUID() + "@test.local").fullName("Người dùng")
                .passwordHash("unused").role(role).status(UserStatus.ACTIVE).build());
    }
    private String token(User user) { return "Bearer " + jwt.generateTokenFromUser(user); }
}
