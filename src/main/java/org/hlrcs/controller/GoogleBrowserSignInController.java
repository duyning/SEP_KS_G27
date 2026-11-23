package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.AuthResponse;
import org.hlrcs.service.AuthService;
import org.hlrcs.service.GoogleBrowserSignIn;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth/google/mobile")
public class GoogleBrowserSignInController {
    private static final String TOKEN = "[A-Za-z0-9_-]{43}";
    private static final String CSP = "default-src 'none'; script-src 'self' https://accounts.google.com/gsi/client; "
            + "style-src 'unsafe-inline' https://accounts.google.com/gsi/style; "
            + "connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; "
            + "base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
    private final GoogleBrowserSignIn signIn;
    private final AuthService auth;

    public record BrowserRequest(@NotBlank @Pattern(regexp = TOKEN) String id) {}
    public record Credential(@NotBlank @Pattern(regexp = TOKEN) String id,
                             @NotBlank @Size(max = 8192) String idToken) {}
    public record Code(@NotBlank @Pattern(regexp = TOKEN) String id,
                       @NotBlank @Pattern(regexp = TOKEN) String proof,
                       @NotBlank @Pattern(regexp = "[0-9]{8}") String code) {}

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<GoogleBrowserSignIn.Attempt>> begin() {
        return uncached(signIn.begin());
    }

    @PostMapping("/redeem")
    public ResponseEntity<ApiResponse<AuthResponse>> redeem(@Valid @RequestBody Code input) {
        return uncached(auth.loginWithVerifiedGoogleUser(signIn.redeem(input.id(), input.proof(), input.code())));
    }

    @GetMapping(value = "/browser", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> browser() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Content-Security-Policy", CSP)
                .header("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
                .header("Referrer-Policy", "strict-origin-when-cross-origin")
                .body(new ClassPathResource("google-mobile/sign-in.html"));
    }

    @GetMapping(value = "/browser/script", produces = "text/javascript")
    public ResponseEntity<Resource> script() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new ClassPathResource("google-mobile/sign-in.js"));
    }

    @PostMapping("/browser/options")
    public ResponseEntity<ApiResponse<GoogleBrowserSignIn.BrowserOptions>> options(
            @RequestHeader("Origin") String origin, @Valid @RequestBody BrowserRequest input) {
        return uncached(signIn.options(origin, input.id()));
    }

    @PostMapping("/browser/complete")
    public ResponseEntity<ApiResponse<GoogleBrowserSignIn.Confirmation>> complete(
            @RequestHeader("Origin") String origin, @Valid @RequestBody Credential input) {
        return uncached(signIn.complete(origin, input.id(), input.idToken()));
    }

    private static <T> ResponseEntity<ApiResponse<T>> uncached(T data) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.success(data));
    }
}
