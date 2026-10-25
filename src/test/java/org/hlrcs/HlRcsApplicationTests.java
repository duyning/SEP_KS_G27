package org.hlrcs;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class HlRcsApplicationTests {
    @Autowired
    private Environment environment;
    @Autowired
    private ObjectMapper objectMapper;
    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<String> request(String path, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(
                "http://localhost:" + environment.getProperty("local.server.port") + path));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (body == null) builder.GET();
        else builder.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String login(String email, String password) throws Exception {
        HttpResponse<String> response = request("/api/auth/login",
                "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}", null);
        assertEquals(200, response.statusCode(), response.body());
        return objectMapper.readTree(response.body()).path("data").path("accessToken").asString();
    }

    @Test
    void newHostDemoAccountCanLoginAndStartsWithoutPropertyOrRegistration() throws Exception {
        String token = login("host-new@hlrcs.com", "123456");
        var profile = request("/api/auth/me", null, token);
        assertEquals("ROOM_HOST", objectMapper.readTree(profile.body()).path("data").path("role").asString());
        var eligibility = request("/api/host/property-registrations/eligibility", null, token);
        assertEquals(200, eligibility.statusCode());
        assertTrue(objectMapper.readTree(eligibility.body()).path("data").path("canRegister").asBoolean());
        var rooms = request("/api/host/rooms", null, token);
        assertEquals(200, rooms.statusCode());
        var data = objectMapper.readTree(rooms.body()).path("data");
        assertEquals(0, data.path("properties").size());
        assertEquals(0, data.path("roomTypes").size());
        assertEquals(0, data.path("rooms").size());
        assertEquals(0, data.path("pendingRegistrationCount").asInt());
    }

    private HttpResponse<String> put(String path, String body, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(
                "http://localhost:" + environment.getProperty("local.server.port") + path))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void allActorApiPermissionsRemainEnforced() throws Exception {
        String[] emails = {"user@hlrcs.com", "host@hlrcs.com", "staff@hlrcs.com", "admin@hlrcs.com"};
        String[] paths = {"/api/test/user", "/api/test/host", "/api/test/staff", "/api/test/admin"};
        int[][] expected = {{200, 403, 403, 403}, {200, 200, 403, 403}, {200, 403, 200, 403}, {200, 200, 200, 200}};
        for (int actor = 0; actor < emails.length; actor++) {
            String token = login(emails[actor], actor == 3 ? "admin123" : "123456");
            for (int endpoint = 0; endpoint < paths.length; endpoint++) {
                assertEquals(expected[actor][endpoint], request(paths[endpoint], null, token).statusCode(), emails[actor] + paths[endpoint]);
            }
        }
        assertEquals(401, put("/api/auth/profile", "{\"fullName\":\"Not authenticated\"}", null).statusCode());
    }

    @Test
    void profileUpdateAndPasswordPersistWithoutChangingAnotherUser() throws Exception {
        String suffix = Long.toString(System.nanoTime());
        String emailA = "profile-a-" + suffix + "@hlrcs.test";
        String emailB = "profile-b-" + suffix + "@hlrcs.test";
        String registerA = request("/api/auth/register", "{\"email\":\"" + emailA + "\",\"password\":\"Original@123\",\"fullName\":\"Profile A\"}", null).body();
        String registerB = request("/api/auth/register", "{\"email\":\"" + emailB + "\",\"password\":\"Original@123\",\"fullName\":\"Profile B\"}", null).body();
        String tokenA = objectMapper.readTree(registerA).path("data").path("accessToken").asString();
        String tokenB = objectMapper.readTree(registerB).path("data").path("accessToken").asString();
        int userB = objectMapper.readTree(registerB).path("data").path("userId").asInt();
        HttpResponse<String> update = put("/api/auth/profile", "{\"fullName\":\"Updated A\",\"userId\":" + userB + ",\"role\":\"ADMIN\"}", tokenA);
        assertEquals(200, update.statusCode(), update.body());
        assertEquals("Updated A", objectMapper.readTree(request("/api/auth/me", null, tokenA).body()).path("data").path("fullName").asString());
        assertEquals("USER", objectMapper.readTree(request("/api/auth/me", null, tokenA).body()).path("data").path("role").asString());
        assertEquals("Profile B", objectMapper.readTree(request("/api/auth/me", null, tokenB).body()).path("data").path("fullName").asString());
        assertEquals(400, put("/api/auth/profile", "{\"fullName\":\"\"}", tokenA).statusCode());
        assertEquals(400, put("/api/auth/change-password", "{\"oldPassword\":\"wrong\",\"newPassword\":\"NewPassword@123\"}", tokenA).statusCode());
        assertEquals(200, put("/api/auth/change-password", "{\"oldPassword\":\"Original@123\",\"newPassword\":\"NewPassword@123\"}", tokenA).statusCode());
        assertEquals(401, request("/api/auth/login", "{\"email\":\"" + emailA + "\",\"password\":\"Original@123\"}", null).statusCode());
        assertEquals(200, request("/api/auth/me", null, login(emailA, "NewPassword@123")).statusCode());
        assertEquals(200, request("/api/auth/me", null, login(emailB, "Original@123")).statusCode());
    }

    @Test
    void contextLoads() {
    }

    @Test
    void legacyPagesRedirectToReactAndOldHtmlIsRemoved() throws Exception {
        for (String path : new String[]{"/login.html", "/register.html"}) {
            HttpResponse<String> response = request(path, null, null);
            assertEquals(302, response.statusCode(), path);
            assertEquals("http://localhost:5173/" + path.substring(1).replace(".html", ""), response.headers().firstValue("Location").orElseThrow());
        }
        assertNull(getClass().getResource("/static/login.html"));
        assertNull(getClass().getResource("/static/register.html"));
    }

    @Test
    void loginSupportsPhoneNumber() throws Exception {
        String token = login("0987654324", "123456");
        assertEquals(200, request("/api/auth/me", null, token).statusCode());
    }

    @Test
    void loginAndProfileUseDatabaseAndJwt() throws Exception {
        String token = login("admin@hlrcs.com", "admin123");
        HttpResponse<String> response = request("/api/auth/me", null, token);
        assertEquals(200, response.statusCode());
        assertEquals("ADMIN", objectMapper.readTree(response.body()).path("data").path("role").asString());
        assertEquals(200, request("/api/test/admin", null, token).statusCode());
    }

    @Test
    void unauthorizedAndForbiddenResponsesAreJson() throws Exception {
        HttpResponse<String> unauthorized = request("/api/test/admin", null, null);
        assertEquals(401, unauthorized.statusCode());
        assertFalse(objectMapper.readTree(unauthorized.body()).path("success").asBoolean());
        String token = login("user@hlrcs.com", "123456");
        HttpResponse<String> forbidden = request("/api/test/admin", null, token);
        assertEquals(403, forbidden.statusCode());
        assertFalse(objectMapper.readTree(forbidden.body()).path("success").asBoolean());
    }

    @Test
    void publicRegistrationCannotGrantAdminRole() throws Exception {
        HttpResponse<String> response = request("/api/auth/register",
                "{\"email\":\"new-user@hlrcs.test\",\"password\":\"Test@12345\",\"fullName\":\"Test User\",\"role\":\"ADMIN\"}", null);
        assertEquals(201, response.statusCode(), response.body());
        assertEquals("USER", objectMapper.readTree(response.body()).path("data").path("role").asString());
    }

}
