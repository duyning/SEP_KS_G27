package org.hlrcs.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class CollectedPostDtos {
    private CollectedPostDtos() {}
    public record ScrapeInput(@NotBlank @Size(max = 512)
        @Pattern(regexp = "https://(www\\.|m\\.)?facebook\\.com/groups/[A-Za-z0-9._-]+/?(?:\\?[^#]*)?") String groupUrl) {}
    public record Selection(@NotEmpty @Size(max = 100) List<@NotNull @Positive Long> postIds) {}
    public record Post(Long id, String author, String caption, String sourceUrl, String groupUrl,
                       List<String> images, Instant sourcePublishedAt, Instant collectedAt,
                       boolean published, Instant publishedAt) {}
    public record Feed(List<Post> posts, Long nextCursor) {}
    public record ImportResult(int imported, int skipped, List<String> warnings, boolean sessionReused) {}
    public record AuthStatus(String status, String message) {}
    public record RawPost(String id, String author, String text, String url, Instant publishedAt,
                          String caption, List<String> images) {}
    public record ScrapeResult(List<RawPost> posts, List<String> warnings, boolean sessionReused) {}
}
