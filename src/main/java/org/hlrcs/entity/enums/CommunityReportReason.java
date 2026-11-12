package org.hlrcs.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum CommunityReportReason {
    FRAUD, SPAM, INAPPROPRIATE, MISLEADING, OTHER;

    @JsonCreator
    public static CommunityReportReason fromCode(String code) {
        return valueOf(code);
    }
}
