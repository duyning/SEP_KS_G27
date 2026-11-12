package org.hlrcs.dto.request;

import com.fasterxml.jackson.annotation.JsonCreator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CommunityReportDecision(@NotNull Action action, @NotBlank @Size(max = 1000) String reason) {
    public enum Action {
        HIDE_POST, DISMISS;

        @JsonCreator
        public static Action fromCode(String code) {
            return valueOf(code);
        }
    }
}
