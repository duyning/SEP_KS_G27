package org.hlrcs;

import org.hlrcs.entity.enums.UserRole;
import org.hlrcs.service.CommunityRealtimeEvent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.*;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:community-realtime-test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class CommunityRealtimeTests extends RegistrationOtpTestSupport {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired ApplicationEventPublisher events;
    @Autowired PlatformTransactionManager transactions;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Test
    void committedChangesReachOnlyTheirAudienceAndReconnectResyncs() throws Exception {
        String email = "live-" + UUID.randomUUID() + "@test.local";
        var author = api("POST", "/api/auth/register", null, Map.of("email", email,
                "password", "Password@123", "fullName", "Thành viên realtime",
                "verificationToken", verifyContact(email)), 201);
        String token = author.path("accessToken").asString();
        int userId = api("GET", "/api/auth/me", token, null, 200).path("userId").asInt();
        assertTrue(userId > 0);
        String staff = api("POST", "/api/auth/login", null, Map.of("email", "staff@hlrcs.com", "password", "123456"), 200).path("accessToken").asString();
        String admin = api("POST", "/api/auth/login", null, Map.of("email", "admin@hlrcs.com", "password", "admin123"), 200).path("accessToken").asString();
        try (var guest = stream(null); var own = stream(token); var reviewer = stream(staff); var administrator = stream(admin)) {
            var tx = new TransactionTemplate(transactions);
            tx.executeWithoutResult(s -> { events.publishEvent(CommunityRealtimeEvent.notifications(userId)); s.setRollbackOnly(); });
            assertNull(own.next.poll(250, TimeUnit.MILLISECONDS));
            tx.executeWithoutResult(s -> events.publishEvent(CommunityRealtimeEvent.notifications(userId)));
            assertEquals("notifications", own.take().path("type").asString());
            assertNull(guest.next.poll(200, TimeUnit.MILLISECONDS));
            assertNull(reviewer.next.poll(200, TimeUnit.MILLISECONDS));
            assertNull(administrator.next.poll(200, TimeUnit.MILLISECONDS));
            int post = api("POST", "/api/community/posts", token, Map.of("type", "SECOND_HAND", "title", "Bàn học gỗ còn sử dụng tốt", "content", "Nhượng bàn học tại Tân Xã. Có thể đến kiểm tra trực tiếp.", "location", "Tân Xã", "authorName", "Thành viên", "authorPhone", "0912345678"), 201).path("id").asInt();
            assertEquals(post, own.take().path("postId").asInt());
            assertEquals(post, reviewer.take().path("postId").asInt());
            assertEquals(post, administrator.take().path("postId").asInt());
            assertNull(guest.next.poll(200, TimeUnit.MILLISECONDS));
            api("POST", "/api/staff/community/posts/"+post+"/review", staff, Map.of("decision", "APPROVE"), 200);
            var visible = guest.take();
            assertEquals("posts", visible.path("type").asString());
            assertEquals(post, visible.path("postId").asInt());
            assertEquals(2, visible.size()); // Only invalidation IDs, no private snapshots.
            int comment = api("POST", "/api/community/posts/"+post+"/comments", token, Map.of("content", "Bàn vẫn còn, mời bạn đến xem."), 201).path("id").asInt();
            assertEquals("comments", guest.take().path("type").asString());
            api("PUT", "/api/community/posts/"+post+"/comments/"+comment, token, Map.of("content", "Bàn vẫn còn, bạn có thể đến xem sau 17 giờ."), 200);
            assertEquals("comments", guest.take().path("type").asString());
            api("DELETE", "/api/community/posts/"+post+"/comments/"+comment, token, null, 200);
            assertEquals("comments", guest.take().path("type").asString());
            tx.executeWithoutResult(s -> events.publishEvent(CommunityRealtimeEvent.reports(post)));
            assertNull(guest.next.poll(200, TimeUnit.MILLISECONDS));
        }
        try (var reconnect = stream(token)) { assertTrue(reconnect.next.isEmpty()); }
        api("GET", "/api/community/events", "invalid-token", null, 401);
    }

    @Test
    void privateAudienceDoesNotIncludeUnrelatedMembersOrStaff() {
        var notice = CommunityRealtimeEvent.notifications(1);
        assertTrue(notice.visibleTo(1, UserRole.USER));
        assertFalse(notice.visibleTo(2, UserRole.USER));
        assertFalse(notice.visibleTo(3, UserRole.STAFF));
        assertFalse(notice.visibleTo(null, null));
        assertTrue(CommunityRealtimeEvent.reports(5).visibleTo(3, UserRole.ADMIN));
        assertFalse(CommunityRealtimeEvent.reports(5).visibleTo(3, UserRole.STAFF));
    }

    @Test
    @org.junit.jupiter.api.Timeout(90)
    void openConnectionStillDeliversAfterTheFormerSixtySecondExpiry() throws Exception {
        try (var guest = stream(null)) {
            CompletableFuture.runAsync(() -> {}, CompletableFuture.delayedExecutor(66, TimeUnit.SECONDS)).get(70, TimeUnit.SECONDS);
            assertNull(guest.next.poll()); // Heartbeats and connection age do not trigger a resync.
            new TransactionTemplate(transactions).executeWithoutResult(s ->
                    events.publishEvent(new CommunityRealtimeEvent("posts", null, null, true, true, true)));
            assertEquals("posts", guest.take().path("type").asString());
        }
    }

    private URI uri(String path) { return URI.create("http://127.0.0.1:"+port+path); }
    private Stream stream(String token) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/community/events")).header("Accept", "text/event-stream");
        if (token != null) request.header("Authorization", "Bearer "+token);
        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofInputStream());
        assertEquals(200, response.statusCode());
        var stream = new Stream(response.body());
        assertEquals("resync", stream.take().path("type").asString());
        return stream;
    }
    private final class Stream implements AutoCloseable {
        final BlockingQueue<JsonNode> next = new LinkedBlockingQueue<>();
        final InputStream input;
        Stream(InputStream input) {
            this.input = input;
            var thread = new Thread(() -> {
                try (var lines = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = lines.readLine()) != null) if (line.startsWith("data:")) {
                        var event = json.readTree(line.substring(5));
                        if (!event.path("type").asString().equals("heartbeat")) next.add(event);
                    }
                } catch (IOException ignored) { }
            }, "community-test-reader");
            thread.setDaemon(true); thread.start();
        }
        JsonNode take() throws Exception { var event = next.poll(5, TimeUnit.SECONDS); assertNotNull(event, "Expected SSE event"); return event; }
        public void close() throws IOException { input.close(); }
    }
    private JsonNode api(String method, String path, String token, Object body, int expected) throws Exception {
        var request = HttpRequest.newBuilder(uri(path)).timeout(Duration.ofSeconds(10));
        if (token != null) request.header("Authorization", "Bearer "+token);
        if (body != null) request.header("Content-Type", "application/json");
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(expected, response.statusCode());
        return json.readTree(response.body()).path("data");
    }
}
