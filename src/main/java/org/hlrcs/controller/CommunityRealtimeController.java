package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.exception.AppException;
import org.hlrcs.service.AuthService;
import org.hlrcs.service.CommunityRealtimeService;
import org.springframework.http.*;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController @RequiredArgsConstructor
public class CommunityRealtimeController {
    private final CommunityRealtimeService realtime;
    private final AuthService auth;

    @GetMapping(value = "/api/community/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> events(Authentication authentication,
            @RequestHeader(value = "Authorization", required = false) String header) {
        boolean signedIn = authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
        if (header != null && !signedIn) throw new AppException("Phiên đăng nhập đã hết hạn.", HttpStatus.UNAUTHORIZED);
        var user = signedIn ? auth.getCurrentUser() : null;
        if (user != null && user.getStatus() != UserStatus.ACTIVE)
            throw new AppException("Tài khoản không hoạt động.", HttpStatus.FORBIDDEN);
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Accel-Buffering", "no")
                .body(realtime.connect(user == null ? null : user.getUserId(), user == null ? null : user.getRole(), token));
    }
}
