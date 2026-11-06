package org.hlrcs.dto.response;

import java.util.List;

public record HostViewingsResponse(List<PropertySummary> properties, long pendingRegistrationCount,
                                  List<ViewingResponses.Viewing> viewings) {
    public record PropertySummary(Integer propertyId, String name) {}
}
