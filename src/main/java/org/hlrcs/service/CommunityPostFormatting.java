package org.hlrcs.service;

import org.hlrcs.exception.FieldValidationException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;

final class CommunityPostFormatting {
    private static final Set<String> BLOCKS = Set.of("paragraph", "bulletList", "orderedList");
    private static final Map<String, Set<String>> CHILDREN = Map.of(
            "doc", BLOCKS,
            "paragraph", Set.of("text", "hardBreak"),
            "bulletList", Set.of("listItem"),
            "orderedList", Set.of("listItem"),
            "listItem", BLOCKS
    );

    private CommunityPostFormatting() {}

    static String validate(ObjectMapper json, String format, String content) {
        if (format.isEmpty() || format.equals("default:normal:")) return null;
        if (format.matches("(?:default|serif|mono):(?:small|normal|large):b?i?u?")) return format;
        try {
            JsonNode doc = json.readTree(format);
            if (doc == null || !"doc".equals(doc.path("type").asString())) throw invalid();
            String plainText = readText(doc, 0).replaceAll("(?U)^[\\s\\uFEFF]+|[\\s\\uFEFF]+$", "");
            if (!content.equals(plainText)) throw invalid();
            return format;
        } catch (JacksonException exception) {
            throw invalid();
        }
    }

    private static String readText(JsonNode node, int depth) {
        if (!node.isObject() || depth > 24) throw invalid();
        String type = node.path("type").asString();
        if (type.equals("hardBreak")) return "\n";
        if (type.equals("text")) {
            JsonNode text = node.path("text");
            if (!text.isTextual() || text.asString().isEmpty()) throw invalid();
            JsonNode marks = node.get("marks");
            if (marks != null) {
                if (!marks.isArray() || marks.size() > 4) throw invalid();
                for (JsonNode mark : marks) {
                    String name = mark.path("type").asString();
                    if (Set.of("bold", "italic", "underline").contains(name)) continue;
                    if (!name.equals("textStyle")
                            || !Set.of("13px", "18px").contains(mark.path("attrs").path("fontSize").asString())) throw invalid();
                }
            }
            return text.asString();
        }
        Set<String> allowed = CHILDREN.get(type);
        JsonNode children = node.get("content");
        if (allowed == null) throw invalid();
        if (children == null && type.equals("paragraph")) return "";
        if (children == null || !children.isArray() || (children.isEmpty() && !type.equals("paragraph"))) throw invalid();
        if (type.equals("listItem") && !"paragraph".equals(children.get(0).path("type").asString())) throw invalid();
        StringJoiner text = new StringJoiner(type.equals("paragraph") ? "" : "\n");
        for (JsonNode child : children) {
            if (!allowed.contains(child.path("type").asString())) throw invalid();
            text.add(readText(child, depth + 1));
        }
        return text.toString();
    }

    private static FieldValidationException invalid() {
        return new FieldValidationException("contentFormat", "Định dạng nội dung không hợp lệ.");
    }
}
