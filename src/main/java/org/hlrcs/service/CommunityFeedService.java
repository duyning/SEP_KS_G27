package org.hlrcs.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.CommunityPostResponse;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.enums.PostStatus;
import org.hlrcs.entity.enums.PostType;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityFeedService {
    private static final int PAGE_SIZE = 8;
    private static final int SCAN_SIZE = 64;
    private final EntityManager em;
    private final PostRepository posts;
    private final CommunityService community;
    private final AuthService auth;
    private final ObjectMapper json;

    public record Page(List<CommunityPostResponse> items, String nextCursor, boolean hasMore, Map<String, Long> counts) {}
    private record Cursor(Integer id, LocalDateTime time, BigDecimal price, String scope) {}

    public long mineCount() {
        return posts.countByAuthor_UserId(auth.getCurrentUser().getUserId());
    }

    public CommunityPostResponse one(Integer id, boolean mine) {
        Post post = posts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết."));
        boolean allowed = mine ? post.getAuthor().getUserId().equals(auth.getCurrentUser().getUserId())
                : post.getStatus() == PostStatus.APPROVED;
        if (!allowed) throw new ResourceNotFoundException("Không tìm thấy bài viết.");
        return community.responses(List.of(post), mine).get(0);
    }

    public Page page(boolean mine, String category, String keyword, String zone, String sort, String token) {
        PostType type = switch (category) {
            case "ALL" -> null;
            case "ROOM_TRANSFER" -> PostType.PASS_ROOM;
            case "ROOMMATE" -> PostType.ROOMMATE;
            case "SECOND_HAND" -> PostType.PASS_ITEM;
            default -> throw new BadRequestException("Chuyên mục không hợp lệ.");
        };
        if (keyword.length() > 200 || !Set.of("all", "tan-xa", "thach-hoa", "binh-yen", "cnc", "khac").contains(zone)
                || !Set.of("newest", "oldest", "price-asc", "price-desc").contains(sort)) {
            throw new BadRequestException("Bộ lọc bài viết không hợp lệ.");
        }
        Integer authorId = mine ? auth.getCurrentUser().getUserId() : null;
        String query = normalize(keyword.strip());
        String scope = json.writeValueAsString(Arrays.asList(authorId, category, query, zone, sort));
        Cursor after = decode(token, scope);
        var matches = new ArrayList<Post>();
        while (matches.size() <= PAGE_SIZE) {
            List<Post> batch = candidates(authorId, type, sort, after);
            if (batch.isEmpty()) break;
            for (Post post : batch) {
                after = cursor(post, scope);
                String name = post.getContactName() == null ? post.getAuthor().getFullName() : post.getContactName();
                String text = normalize(post.getTitle() + " " + post.getDescription() + " " + post.getLocation() + " " + name);
                if ((query.isEmpty() || text.contains(query)) && (zone.equals("all") || zone.equals(zone(post.getLocation())))) {
                    matches.add(post);
                    if (matches.size() > PAGE_SIZE) break;
                }
            }
            if (batch.size() < SCAN_SIZE) break;
        }
        boolean more = matches.size() > PAGE_SIZE;
        List<Post> visible = matches.subList(0, Math.min(PAGE_SIZE, matches.size()));
        String next = more ? Base64.getUrlEncoder().withoutPadding().encodeToString(
                json.writeValueAsBytes(cursor(visible.get(visible.size() - 1), scope))) : null;
        return new Page(community.responses(visible, mine), next, more, counts(authorId));
    }

    private List<Post> candidates(Integer authorId, PostType type, String sort, Cursor after) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Post> query = cb.createQuery(Post.class);
        Root<Post> p = query.from(Post.class);
        p.fetch("author");
        p.fetch("reviewer", JoinType.LEFT);
        var conditions = new ArrayList<Predicate>();
        conditions.add(authorId == null ? cb.equal(p.get("status"), PostStatus.APPROVED)
                : cb.equal(p.get("author").get("userId"), authorId));
        if (type != null) conditions.add(cb.equal(p.get("postType"), type));
        Expression<LocalDateTime> time = cb.coalesce(p.<LocalDateTime>get("createdAt"), LocalDateTime.of(1970, 1, 1, 0, 0));
        Path<Integer> id = p.get("postId");
        Predicate timeAfter = null;
        if (after != null) {
            Predicate later = sort.equals("oldest") ? cb.greaterThan(time, after.time()) : cb.lessThan(time, after.time());
            timeAfter = cb.or(later, cb.and(cb.equal(time, after.time()), cb.lessThan(id, after.id())));
        }
        var order = new ArrayList<Order>();
        if (sort.startsWith("price-")) {
            Path<BigDecimal> price = p.get("price");
            order.add(cb.asc(cb.<Integer>selectCase().when(cb.isNull(price), 1).otherwise(0)));
            order.add(sort.equals("price-asc") ? cb.asc(price) : cb.desc(price));
            if (after != null) {
                Predicate priceAfter = after.price() == null ? cb.and(cb.isNull(price), timeAfter)
                        : cb.or(cb.isNull(price), sort.equals("price-asc") ? cb.greaterThan(price, after.price()) : cb.lessThan(price, after.price()),
                                cb.and(cb.equal(price, after.price()), timeAfter));
                conditions.add(priceAfter);
            }
        } else if (after != null) {
            conditions.add(timeAfter);
        }
        order.add(sort.equals("oldest") ? cb.asc(time) : cb.desc(time));
        order.add(cb.desc(id));
        return em.createQuery(query.select(p).where(conditions.toArray(Predicate[]::new)).orderBy(order))
                .setMaxResults(SCAN_SIZE).getResultList();
    }

    private Map<String, Long> counts(Integer authorId) {
        var query = authorId == null
                ? em.createQuery("select p.postType, count(p) from Post p where p.status = :status group by p.postType", Object[].class)
                    .setParameter("status", PostStatus.APPROVED)
                : em.createQuery("select p.postType, count(p) from Post p where p.author.userId = :author group by p.postType", Object[].class)
                    .setParameter("author", authorId);
        Map<String, Long> counts = new LinkedHashMap<>(Map.of("ALL", 0L, "ROOM_TRANSFER", 0L, "ROOMMATE", 0L, "SECOND_HAND", 0L));
        for (Object[] row : query.getResultList()) {
            String category = switch ((PostType) row[0]) {
                case PASS_ROOM -> "ROOM_TRANSFER";
                case ROOMMATE -> "ROOMMATE";
                case PASS_ITEM -> "SECOND_HAND";
            };
            long total = (Long) row[1];
            counts.put(category, total);
            counts.compute("ALL", (key, value) -> value + total);
        }
        return counts;
    }

    private Cursor cursor(Post post, String scope) {
        return new Cursor(post.getPostId(), post.getCreatedAt() == null ? LocalDateTime.of(1970, 1, 1, 0, 0) : post.getCreatedAt(),
                post.getPrice(), scope);
    }

    private Cursor decode(String token, String scope) {
        if (token == null || token.isBlank()) return null;
        try {
            if (token.length() > 4096) throw new IllegalArgumentException();
            Cursor cursor = json.readValue(Base64.getUrlDecoder().decode(token.getBytes(StandardCharsets.US_ASCII)), Cursor.class);
            if (cursor.id() == null || cursor.id() < 1 || cursor.time() == null || !scope.equals(cursor.scope())
                    || cursor.price() != null && cursor.price().signum() < 0) throw new IllegalArgumentException();
            return cursor;
        } catch (RuntimeException error) {
            throw new BadRequestException("Vị trí tải bài không hợp lệ. Vui lòng tải lại danh sách.");
        }
    }

    private static String normalize(String value) {
        return Normalizer.normalize(Objects.toString(value, ""), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'd').toLowerCase(Locale.ROOT);
    }

    private static String zone(String location) {
        String text = normalize(location);
        if (text.contains("tan xa")) return "tan-xa";
        if (text.contains("thach hoa")) return "thach-hoa";
        if (text.contains("binh yen")) return "binh-yen";
        return text.contains("cong nghe cao") || text.contains("khu cnc") ? "cnc" : "khac";
    }
}
