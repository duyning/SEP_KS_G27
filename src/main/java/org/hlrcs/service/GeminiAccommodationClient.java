package org.hlrcs.service;

import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class GeminiAccommodationClient {
    private static class Transport {
        private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    }
    private final ObjectMapper json;
    private final URI endpoint;
    private final String key;

    public GeminiAccommodationClient(ObjectMapper json,
            @Value("${accommodation.ai.key:}") String key,
            @Value("${accommodation.ai.model}") String model) {
        if (!model.matches("[a-zA-Z0-9._-]+")) throw new IllegalArgumentException("Invalid accommodation AI model");
        this.json = json;
        this.key = key.strip();
        this.endpoint = URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent");
    }

    public JsonNode generate(String instruction, Object input, Map<String, ?> schema) {
        if (key.isBlank()) throw new AppException("Tìm phòng bằng AI chưa được cấu hình.", HttpStatus.SERVICE_UNAVAILABLE);
        try {
            var body = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", instruction))),
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", json.writeValueAsString(input))))),
                    "generationConfig", Map.of("responseMimeType", "application/json", "responseJsonSchema", schema));
            var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json").header("x-goog-api-key", key)
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
            var response = Transport.HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) throw unavailable();
            var text = json.readTree(response.body()).path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (!text.isTextual()) throw unavailable();
            return json.readTree(text.asText());
        } catch (HttpTimeoutException error) {
            throw new AppException("AI phản hồi quá chậm. Vui lòng thử lại.", HttpStatus.GATEWAY_TIMEOUT);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException | tools.jackson.core.JacksonException error) {
            throw unavailable();
        }
    }

    static AppException unavailable() {
        return new AppException("Chưa thể nhận phản hồi từ AI. Vui lòng thử lại.", HttpStatus.BAD_GATEWAY);
    }
}
