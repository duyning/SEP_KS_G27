package org.hlrcs.service;

import org.hlrcs.exception.AppException;
import org.hlrcs.security.GoogleTokenVerifier;
import org.hlrcs.security.GoogleUserInfo;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleBrowserSignInTests {
    private static final String ORIGIN = "https://login.example.com";
    private final GoogleTokenVerifier verifier = mock(GoogleTokenVerifier.class);
    private final GoogleBrowserSignIn service = new GoogleBrowserSignIn(verifier, ORIGIN, "web-client");
    private final GoogleUserInfo user = new GoogleUserInfo("subject", "user@example.com", "Test User", null);

    @Test
    void verifiesGoogleNonceAndRequiresBothProofAndCodeToRedeemExactlyOnce() {
        var attempt = service.begin();
        assertTrue(attempt.id().matches("[A-Za-z0-9_-]{43}"));
        assertNotEquals(attempt.id(), attempt.proof());
        assertEquals("web-client", service.options(ORIGIN, attempt.id()).clientId());
        when(verifier.verifyToken("id-token", attempt.id())).thenReturn(user);

        var code = service.complete(ORIGIN, attempt.id(), "id-token").code();
        assertTrue(code.matches("[0-9]{8}"));
        assertEquals(HttpStatus.GONE,
                assertThrows(AppException.class, () -> service.redeem(attempt.id(), "unrelated-proof", code)).getStatus());
        String wrongCode = code.equals("99999999") ? "00000000" : "99999999";
        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(AppException.class, () -> service.redeem(attempt.id(), attempt.proof(), wrongCode)).getStatus());
        assertEquals(user, service.redeem(attempt.id(), attempt.proof(), code));
        assertEquals(HttpStatus.GONE,
                assertThrows(AppException.class, () -> service.redeem(attempt.id(), attempt.proof(), code)).getStatus());
        verify(verifier).verifyToken("id-token", attempt.id());
    }

    @Test
    void rejectsUnregisteredOriginAndMissingHttpsBeforeTokenVerification() {
        var attempt = service.begin();
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(AppException.class,
                () -> service.complete("https://other.example.com", attempt.id(), "id-token")).getStatus());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, assertThrows(AppException.class,
                () -> new GoogleBrowserSignIn(verifier, "http://192.168.1.4", "web-client").begin()).getStatus());
        verifyNoInteractions(verifier);
    }
}
