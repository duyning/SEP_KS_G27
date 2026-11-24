package org.hlrcs.service;

import org.hlrcs.exception.AppException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GeminiAccommodationClientTests {
    private static final String RESULT = """
            {"candidates":[{"finishReason":"STOP","content":{"parts":[
              {"thought":true,"text":"internal reasoning"},
              {"text":"{\\"maxBudget\\":2500000,"},
              {"text":"\\"amenities\\":[\\"airConditioner\\",\\"waterHeater\\"]}"}
            ]}}]}
            """;

    private final HttpClient http = mock(HttpClient.class);
    private final GeminiAccommodationClient client = new GeminiAccommodationClient(
            new ObjectMapper(), "test-key", "test-model", "backup-model", http);

    @Test
    void aTemporaryProviderFailureUsesTheFallbackAndReadsTheCompleteAnswer() throws Exception {
        var overloaded = response(503, "");
        var recovered = response(200, RESULT);
        when(http.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
                .thenReturn(overloaded, recovered);

        var result = client.generate("Read these criteria", Map.of(), Map.of());

        assertEquals(2500000, result.path("maxBudget").asInt());
        assertEquals("airConditioner", result.path("amenities").path(0).asText());
        assertEquals("waterHeater", result.path("amenities").path(1).asText());
        var requests = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(2)).send(requests.capture(), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any());
        assertEquals(List.of("/v1beta/models/test-model:generateContent", "/v1beta/models/backup-model:generateContent"),
                requests.getAllValues().stream().map(request -> request.uri().getPath()).toList());
    }

    @Test
    void aSecondTemporaryProviderFailureReturnsServiceUnavailable() throws Exception {
        var overloaded = response(503, "");
        when(http.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
                .thenReturn(overloaded);

        var error = assertThrows(AppException.class, () -> client.generate("Read these criteria", Map.of(), Map.of()));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        verify(http, times(2)).send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any());
    }

    @Test
    void aPrimaryTimeoutTriesTheFallbackInTheSameRequestWithABoundedWait() throws Exception {
        var recovered = response(200, RESULT);
        when(http.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
                .thenThrow(new HttpTimeoutException("test primary timeout"))
                .thenReturn(recovered);

        var result = client.generate("Read these criteria", Map.of(), Map.of());

        assertEquals(2500000, result.path("maxBudget").asInt());
        var requests = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(2)).send(requests.capture(), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any());
        assertEquals(List.of(Duration.ofSeconds(7), Duration.ofSeconds(5)),
                requests.getAllValues().stream().map(request -> request.timeout().orElseThrow()).toList());
    }

    @Test
    void rateLimitsDoNotTriggerAnotherRequest() throws Exception {
        var rateLimited = response(429, "");
        when(http.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
                .thenReturn(rateLimited);

        var error = assertThrows(AppException.class, () -> client.generate("Read these criteria", Map.of(), Map.of()));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verify(http).send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any());
    }

    private static HttpResponse<String> response(int status, String body) {
        HttpResponse<String> response = mock();
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        return response;
    }
}
