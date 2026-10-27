package org.hlrcs.exception;

import java.util.Map;

public class FieldValidationException extends RuntimeException {
    private final Map<String, String> fields;

    public FieldValidationException(String field, String message) {
        super(message);
        fields = Map.of(field, message);
    }

    public Map<String, String> getFields() { return fields; }
}
