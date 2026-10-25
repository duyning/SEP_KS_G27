package org.hlrcs.dto.response;

import java.time.LocalDateTime;
import org.hlrcs.entity.PropertyRegistration;

public record PropertyRegistrationResponse(Integer registrationId, String name, String status, LocalDateTime createdAt, String reasonNote) {
    public static PropertyRegistrationResponse from(PropertyRegistration registration) {
        return new PropertyRegistrationResponse(registration.getRegistrationId(), registration.getName(), registration.getStatus().name(), registration.getCreatedAt(), registration.getReasonNote());
    }
}
