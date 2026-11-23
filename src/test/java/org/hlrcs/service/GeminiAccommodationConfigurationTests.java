package org.hlrcs.service;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.ResourcePropertySource;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeminiAccommodationConfigurationTests {
    @Test
    void accommodationCanReuseThePropertyDescriptionKeyUnlessAnOverrideIsConfigured() throws IOException {
        var environment = new MockEnvironment();
        environment.getPropertySources().addLast(new ResourcePropertySource("classpath:application.properties"));

        assertEquals("", environment.getRequiredProperty("accommodation.ai.key"));

        environment.setProperty("property.description.ai.key", "test-description-key");
        assertEquals("test-description-key", environment.getRequiredProperty("accommodation.ai.key"));

        environment.setProperty("GEMINI_API_KEY", "test-common-key");
        assertEquals("test-common-key", environment.getRequiredProperty("accommodation.ai.key"));

        environment.setProperty("ACCOMMODATION_AI_KEY", "test-accommodation-key");
        assertEquals("test-accommodation-key", environment.getRequiredProperty("accommodation.ai.key"));
    }
}
