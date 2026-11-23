package org.hlrcs.service;

import lombok.extern.slf4j.Slf4j;
import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.annotation.Autowired;
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
@Slf4j
public class GeminiAccommodationClient {
    private static class Transport {
        private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    }
    private final ObjectMapper json;
    private final HttpClient http;
    private final String key;
    private final String model;
    private final String fallbackModel;

    @Autowired
    public GeminiAccommodationClient(ObjectMapper json,
            @Value("${accommodation.ai.key:}") String key,
            @Value("${accommodation.ai.model}") String model,
            @Value("${accommodation.ai.fallback-model:}") String fallbackModel) {
        this(json, key, model, fallbackModel, Transport.HTTP);
    }

    GeminiAccommodationClient(ObjectMapper json, String key, String model, String fallbackModel, HttpClient http) {
        if (!model.matches("[a-zA-Z0-9._-]+") || (!fallbackModel.isEmpty() && !fallbackModel.matches("[a-zA-Z0-9._-]+"))) {
            throw new IllegalArgumentException("Invalid accommodation AI model");
        }
        this.json = json;
        this.http = http;
        this.key = key.strip();
        this.model = model;
        this.fallbackModel = fallbackModel;
    }

    public JsonNode generate(String instruction, Object input, Map<String, ?> schema) {
        if (key.isBlank()) throw new AppException("Tìm phòng bằng AI chưa được cấu hình.", HttpStatus.SERVICE_UNAVAILABLE);
        boolean hasFallback = !fallbackModel.isEmpty() && !fallbackModel.equals(model);
        try {
            var body = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", instruction))),
                    "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", json.writeValueAsString(input))))),
                    "generationConfig", Map.of("responseMimeType", "application/json", "responseJsonSchema", schema));
            var payload = json.writeValueAsString(body);
            try {
                return requestModel(payload, model, Duration.ofSeconds(hasFallback ? 7 : 12));
            } catch (AppException error) {
                if (!hasFallback || (error.getStatus() != HttpStatus.SERVICE_UNAVAILABLE
                        && error.getStatus() != HttpStatus.GATEWAY_TIMEOUT)) throw error;
                log.warn("Accommodation AI trying fallback model {}", fallbackModel);
                return requestModel(payload, fallbackModel, Duration.ofSeconds(5));
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException | tools.jackson.core.JacksonException error) {
            log.warn("Accommodation AI request failed with {}", error.getClass().getSimpleName());
            throw unavailable();
        }
    }

    private JsonNode requestModel(String payload, String selectedModel, Duration timeout)
            throws IOException, InterruptedException {
        var endpoint = URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + selectedModel + ":generateContent");
        var request = HttpRequest.newBuilder(endpoint).timeout(timeout)
                .header("Content-Type", "application/json; charset=UTF-8").header("x-goog-api-key", key)
                .POST(HttpRequest.BodyPublishers.ofString(payload)).build();
        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException error) {
            log.warn("Accommodation AI model {} timed out", selectedModel);
            throw new AppException("AI phản hồi quá chậm. Vui lòng thử lại.", HttpStatus.GATEWAY_TIMEOUT);
        }
        int status = response.statusCode();
        if (status == 200) return parseResponse(response.body(), selectedModel);

        log.warn("Accommodation AI model {} returned HTTP {}", selectedModel, status);
        if (status == 429) {
            throw new AppException("AI đã chạm giới hạn yêu cầu. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS);
        }
        if (status == 502 || status == 503 || status == 504) {
            throw new AppException("Trợ lý tìm phòng đang quá tải. Vui lòng thử lại sau.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        throw unavailable();
    }

    private JsonNode parseResponse(String body, String selectedModel) {
        var candidate = json.readTree(body).path("candidates").path(0);
        var text = new StringBuilder();
        for (var part : candidate.path("content").path("parts")) {
            var value = part.path("text");
            if (!part.path("thought").asBoolean(false) && value.isTextual()) text.append(value.asText());
        }
        if (!"STOP".equals(candidate.path("finishReason").asText()) || text.toString().isBlank()) {
            log.warn("Accommodation AI model {} did not return a complete answer", selectedModel);
            throw unavailable();
        }
        var criteria = json.readTree(text.toString());
        if (!criteria.isObject()) throw unavailable();
        return criteria;
    }

    static AppException unavailable() {
        return new AppException("Chưa thể nhận phản hồi từ AI. Vui lòng thử lại.", HttpStatus.BAD_GATEWAY);
    }
}
