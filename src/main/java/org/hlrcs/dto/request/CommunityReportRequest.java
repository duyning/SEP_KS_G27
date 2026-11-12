package org.hlrcs.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hlrcs.entity.enums.CommunityReportReason;

public record CommunityReportRequest(@NotNull CommunityReportReason reason, @Size(max = 1000) String details) {}
