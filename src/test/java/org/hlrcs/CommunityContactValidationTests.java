package org.hlrcs;

import jakarta.validation.Validation;
import org.hlrcs.dto.request.CommunityPostRequest;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CommunityContactValidationTests {
    private CommunityPostRequest request(String facebook, String zalo) {
        return new CommunityPostRequest("ROOMMATE", "Tìm bạn ở ghép", "Phòng sạch sẽ thoáng mát", null,
                "Tân Xã", "Nguyễn Văn An", "0912345678", facebook, zalo, null, null, null);
    }

    @Test
    void socialLinksAreOptionalAndRestrictedToTrustedHttpsHosts() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(request(null, null)).isEmpty());
            assertTrue(validator.validate(request("  ", "")).isEmpty());
            assertTrue(validator.validate(request(" https://www.facebook.com/nguyenvanan ", "https://zalo.me/0912345678")).isEmpty());
            for (String url : new String[]{"javascript:alert(1)", "http://facebook.com/name", "https://facebook.com.evil.test/name",
                    "https://facebook.com@evil.test/name", "https://facebook.com/", "https://facebook.com/a b", "https://facebook.com/" + "x".repeat(500)}) {
                assertFalse(validator.validate(request(url, null)).isEmpty(), url);
            }
            assertFalse(validator.validate(request(null, "https://evil.test/0912345678")).isEmpty());
        }
    }
}
