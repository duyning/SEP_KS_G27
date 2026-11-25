package org.hlrcs.service;

import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.Optional;
import java.util.concurrent.ThreadPoolExecutor;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class MessagingRealtimePrivacyTest {
    @Test void heartbeatKeepsConnectionsBeyondOneMinuteButStillClosesRevokedAndAgedConnections() throws Exception {
        var tokens=mock(JwtTokenProvider.class);var users=mock(UserRepository.class);
        var hub=new CommunityRealtimeService(tokens,users);var sender=mock(ThreadPoolExecutor.class);
        var clock=new java.util.concurrent.atomic.AtomicLong(0);
        ReflectionTestUtils.setField(hub,"now",(java.util.function.LongSupplier)clock::get);
        ReflectionTestUtils.setField(hub,"sender",sender);
        doAnswer(i->{((Runnable)i.getArgument(0)).run();return null;}).when(sender).execute(any());
        var member=User.builder().userId(1).status(UserStatus.ACTIVE).role(UserRole.USER).build();
        when(users.findById(1)).thenReturn(Optional.of(member));
        when(tokens.isCurrentSession("member",member)).thenReturn(true);
        try(var emitters=mockConstruction(SseEmitter.class)){
            hub.connect(1,UserRole.USER,"member");hub.connect(null,null,null);
            var own=emitters.constructed().get(0);var guest=emitters.constructed().get(1);
            clearInvocations(own,guest);clock.set(61_000);hub.heartbeat();
            verify(own).send(any(SseEmitter.SseEventBuilder.class));verify(guest).send(any(SseEmitter.SseEventBuilder.class));
            verify(own,never()).complete();verify(guest,never()).complete();
            clearInvocations(own);member.setStatus(UserStatus.INACTIVE);hub.heartbeat();
            verify(own).complete();verify(own,never()).send(any(SseEmitter.SseEventBuilder.class));
            clearInvocations(guest);clock.set(301_000);hub.heartbeat();
            verify(guest).complete();verify(guest,never()).send(any(SseEmitter.SseEventBuilder.class));
        }finally{hub.shutdown();}
    }
    @Test void onlyMembersReceiveMessageInvalidationsAndRevokedSessionsClose() throws Exception {
        var tokens=mock(JwtTokenProvider.class);var users=mock(UserRepository.class);
        var hub=new CommunityRealtimeService(tokens,users);var sender=mock(ThreadPoolExecutor.class);
        ReflectionTestUtils.setField(hub,"sender",sender);
        doAnswer(i->{((Runnable)i.getArgument(0)).run();return null;}).when(sender).execute(any());
        when(tokens.isCurrentSession(anyString(),any())).thenReturn(true);
        for(int id=1;id<=3;id++)when(users.findById(id)).thenReturn(Optional.of(User.builder().userId(id).status(UserStatus.ACTIVE).role(id==3?UserRole.ADMIN:UserRole.USER).build()));
        try(var emitters=mockConstruction(SseEmitter.class)){
            hub.connect(1,UserRole.USER,"one");hub.connect(2,UserRole.USER,"two");
            hub.connect(3,UserRole.ADMIN,"admin");hub.connect(null,null,null);
            emitters.constructed().forEach(e->clearInvocations(e));
            hub.messagesChanged(new MessagingChanged(9L,1,2));
            verify(emitters.constructed().get(0)).send(any(SseEmitter.SseEventBuilder.class));
            verify(emitters.constructed().get(1)).send(any(SseEmitter.SseEventBuilder.class));
            verify(emitters.constructed().get(2),never()).send(any(SseEmitter.SseEventBuilder.class));
            verify(emitters.constructed().get(3),never()).send(any(SseEmitter.SseEventBuilder.class));
            when(tokens.isCurrentSession(eq("one"),any())).thenReturn(false);
            clearInvocations(emitters.constructed().get(0));hub.messagesChanged(new MessagingChanged(9L,1,2));
            verify(emitters.constructed().get(0)).complete();
            verify(emitters.constructed().get(0),never()).send(any(SseEmitter.SseEventBuilder.class));
        }finally{hub.shutdown();}
    }
}
