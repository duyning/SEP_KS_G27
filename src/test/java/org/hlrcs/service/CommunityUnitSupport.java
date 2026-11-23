package org.hlrcs.service;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.dto.request.*;
import org.hlrcs.exception.AppException;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.function.Executable;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Case descriptions are exported only when the corresponding assertions actually run. */
class CommunityUnitSupport {
    static final ObjectMapper JSON = new ObjectMapper();
    static final Path RESULT_DIR = Path.of("target/community-unit-results");
    final List<DynamicTest> cases = new ArrayList<>();
    CommunityUnitSupport() {
        try { Files.deleteIfExists(RESULT_DIR.resolve(getClass().getSimpleName() + ".jsonl")); }
        catch (java.io.IOException error) { throw new java.io.UncheckedIOException(error); }
    }
    void add(String method, String type, String input, String expected, Executable body) {
        String id = getClass().getSimpleName() + "-" + String.format("%03d", cases.size() + 1);
        cases.add(DynamicTest.dynamicTest(id + " " + method + " " + input, () -> {
            String status = "Passed", error = "";
            try { body.execute(); }
            catch (Throwable failure) { status = "Failed"; error = failure.toString(); throw failure; }
            finally {
                afterCase();
                Files.createDirectories(RESULT_DIR);
                var row = new LinkedHashMap<String,Object>();
                row.put("id", id); row.put("method", method); row.put("type", type);
                row.put("preconditions", "Isolated unit; repositories/external dependencies mocked; no live DB/network.");
                row.put("input", input); row.put("expected", expected); row.put("status", status);
                row.put("error", error); row.put("executedAt", LocalDateTime.now().toString());
                Files.writeString(RESULT_DIR.resolve(getClass().getSimpleName() + ".jsonl"), JSON.writeValueAsString(row) + System.lineSeparator(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            }
        }));
    }
    void afterCase() { }
    static User user(int id, UserRole role) {
        return User.builder().userId(id).fullName("Actor " + id).role(role).status(UserStatus.ACTIVE).build();
    }
    static Post post() {
        return Post.builder().postId(10).author(user(1, UserRole.USER)).postType(PostType.ROOMMATE)
                .title("Community title").description("Community content").price(new BigDecimal("1000"))
                .location("Tan Xa").contactName("Contact").contactPhone("0912345678")
                .status(PostStatus.PENDING).submissionRevision(0).createdAt(LocalDateTime.of(2026,11,20,0,0)).build();
    }
    static CommunityPostRequest request() { return request(Map.of()); }
    static CommunityPostRequest request(Map<String,Object> changes) {
        var m = new HashMap<String,Object>();
        m.put("type", "ROOMMATE"); m.put("title", "Community title"); m.put("content", "Community content");
        m.put("price", new BigDecimal("1000")); m.put("location", "Tan Xa"); m.put("authorName", "Contact"); m.put("authorPhone", "0912345678");
        m.putAll(changes);
        return new CommunityPostRequest((String)m.get("type"),(String)m.get("title"),(String)m.get("content"),(BigDecimal)m.get("price"),
                (String)m.get("location"),(String)m.get("authorName"),(String)m.get("authorPhone"),(String)m.get("facebookUrl"),(String)m.get("zaloUrl"),
                cast(m.get("images")),cast(m.get("videos")),(String)m.get("format"));
    }
    @SuppressWarnings("unchecked") private static List<Integer> cast(Object value) { return (List<Integer>)value; }
    static void status(int code, Executable body) {
        RuntimeException error = assertThrows(RuntimeException.class, body);
        if (error instanceof org.hlrcs.exception.FieldValidationException) assertEquals(400, code);
        else { assertInstanceOf(AppException.class, error); assertEquals(code, ((AppException)error).getStatus().value()); }
    }
}
