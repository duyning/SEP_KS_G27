package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.CollectedPostDtos.*;
import org.hlrcs.entity.CollectedPost;
import org.hlrcs.exception.AppException;
import org.hlrcs.repository.CollectedPostRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class CollectedPostService {
    private final CollectedPostRepository repository;
    private final AuthService auth;

    @Transactional(readOnly = true)
    public Feed feed(boolean published, Long before) {
        if (before != null && before <= 0) throw new AppException("Con trỏ tải bài không hợp lệ.");
        var rows = repository.feed(published, before == null ? Long.MAX_VALUE : before, PageRequest.of(0, 13));
        var page = rows.stream().limit(12).map(this::view).toList();
        return new Feed(page, rows.size() > 12 ? page.get(page.size() - 1).id() : null);
    }

    @Transactional
    public ImportResult store(String groupUrl, ScrapeResult result) {
        var user = auth.getCurrentUser();
        var now = Instant.now();
        int imported = 0, skipped = 0, enriched = 0;
        var seen = new HashSet<String>();
        for (var raw : Objects.requireNonNullElse(result.posts(), List.<RawPost>of())) {
            if (raw == null || raw.id() == null || !raw.id().matches("[0-9]{1,64}")
                    || raw.publishedAt() == null || raw.publishedAt().isBefore(now.minusSeconds(86400))
                    || raw.publishedAt().isAfter(now.plusSeconds(300)) || !seen.add(raw.id())) { skipped++; continue; }
            var caption = Objects.requireNonNullElse(raw.caption(), Objects.requireNonNullElse(raw.text(), "")).strip();
            var images = Objects.requireNonNullElse(raw.images(), List.<String>of()).stream()
                    .filter(CollectedPostService::imageUrl).distinct().toList();
            var existing = repository.lockByExternalId(raw.id());
            if (existing.isPresent()) {
                var row = existing.get();
                if (!row.isDeleted() && !row.isPublished()) {
                    var merged = new LinkedHashMap<String, String>();
                    for (var image : images) merged.putIfAbsent(URI.create(image).getPath(), image);
                    for (var image : row.getImages()) merged.putIfAbsent(URI.create(image).getPath(), image);
                    if (!new ArrayList<>(merged.values()).equals(row.getImages())) {
                        row.setImages(new ArrayList<>(merged.values())); enriched++;
                    }
                }
                skipped++; continue;
            }
            if (caption.length() > 16000 || (caption.isBlank() && images.isEmpty())) { skipped++; continue; }
            var post = new CollectedPost();
            post.setExternalId(raw.id());
            // Derive canonical links from validated input, never trust arbitrary URLs returned by a worker.
            post.setGroupUrl(groupUrl);
            post.setSourceUrl(groupUrl + "/posts/" + raw.id() + "/");
            var author = Objects.requireNonNullElse(raw.author(), "Thành viên Facebook").strip();
            post.setAuthor(author.isBlank() ? "Thành viên Facebook" : author.substring(0, Math.min(255, author.length())));
            post.setCaption(caption); post.setImages(new ArrayList<>(images));
            post.setSourcePublishedAt(raw.publishedAt()); post.setCollectedAt(now); post.setCollectedBy(user);
            repository.save(post); imported++;
        }
        var warnings = new ArrayList<>(Objects.requireNonNullElse(result.warnings(), List.<String>of()).stream().filter(Objects::nonNull).limit(20).toList());
        if (enriched > 0) warnings.add("Đã cập nhật bộ ảnh cho " + enriched + " bài chờ đăng đã có.");
        return new ImportResult(imported, skipped, warnings, result.sessionReused());
    }

    static boolean imageUrl(String value) {
        if (value == null || value.length() > 2048) return false;
        try {
            var uri = URI.create(value);
            var host = Objects.requireNonNullElse(uri.getHost(), "").toLowerCase(Locale.ROOT);
            return "https".equals(uri.getScheme()) && uri.getUserInfo() == null && uri.getPort() == -1
                    && (host.endsWith(".fbcdn.net") || host.endsWith(".fbsbx.com"));
        } catch (IllegalArgumentException ex) { return false; }
    }

    @Transactional
    public int publish(Selection input, boolean publish) {
        var ids = input.postIds().stream().distinct().sorted().toList();
        var rows = repository.lockAll(ids);
        if (rows.size() != ids.size() || rows.stream().anyMatch(CollectedPost::isDeleted)) throw new AppException("Có bài viết không còn tồn tại. Hãy tải lại danh sách.", HttpStatus.NOT_FOUND);
        var user = auth.getCurrentUser();
        for (var row : rows) {
            if (row.isPublished() == publish) continue;
            row.setPublished(publish);
            row.setPublishedAt(publish ? Instant.now() : null);
            row.setPublishedBy(publish ? user : null);
        }
        return rows.size();
    }

    @Transactional
    public void delete(long id) {
        var rows = repository.lockAll(List.of(id));
        if (rows.isEmpty()) throw new AppException("Bài viết không còn tồn tại.", HttpStatus.NOT_FOUND);
        var row = rows.get(0);
        row.setDeleted(true);
        row.setPublished(false);
        // Retain source identity to prevent an explicitly removed post from reappearing on import.
    }

    private Post view(CollectedPost p) {
        return new Post(p.getId(), p.getAuthor(), p.getCaption(), p.getSourceUrl(), p.getGroupUrl(),
                List.copyOf(p.getImages()), p.getSourcePublishedAt(), p.getCollectedAt(), p.isPublished(), p.getPublishedAt());
    }
}
