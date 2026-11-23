package org.hlrcs;

import com.sun.net.httpserver.HttpServer;
import org.hlrcs.exception.AppException;
import org.hlrcs.service.FacebookScraperClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class FacebookScraperClientTests {
    @Test void missingConfigurationFailsBeforeNetworkAccess() {
        var client = new FacebookScraperClient("http://127.0.0.1:1", "");
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,
                assertThrows(AppException.class, () -> client.scrape("https://www.facebook.com/groups/a")).getStatus());
    }

    @Test void facebookSessionFailureDoesNotBecomePlatformUnauthorized() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/scrape", exchange -> {
            assertEquals("test-token", exchange.getRequestHeaders().getFirst("X-Scraper-Token"));
            var body = "{\"detail\":\"Session expired\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(401, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.start();
        try {
            var client = new FacebookScraperClient("http://127.0.0.1:" + server.getAddress().getPort(), "test-token");
            var error = assertThrows(AppException.class, () -> client.scrape("https://www.facebook.com/groups/a"));
            assertEquals(HttpStatus.BAD_GATEWAY, error.getStatus());
            assertTrue(error.getMessage().contains("Facebook"));
        } finally { server.stop(0); }
    }
}
