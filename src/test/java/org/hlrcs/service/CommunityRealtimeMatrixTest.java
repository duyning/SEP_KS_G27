package org.hlrcs.service;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.DynamicTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityRealtimeMatrixTest extends CommunityUnitSupport {
    static class F implements AutoCloseable {
        JwtTokenProvider tokens=mock(JwtTokenProvider.class);UserRepository users=mock(UserRepository.class);CommunityRealtimeService s=new CommunityRealtimeService(tokens,users);
        ThreadPoolExecutor sender=mock(ThreadPoolExecutor.class);ScheduledExecutorService clock=mock(ScheduledExecutorService.class);
        F(){ReflectionTestUtils.setField(s,"sender",sender);ReflectionTestUtils.setField(s,"heartbeatClock",clock);doAnswer(i->{((Runnable)i.getArgument(0)).run();return null;}).when(sender).execute(any());when(tokens.isCurrentSession(eq("token"), any(org.hlrcs.entity.User.class))).thenReturn(true);when(users.findById(1)).thenReturn(Optional.of(user(1,UserRole.USER)));}
        @SuppressWarnings("unchecked") Set<Object> clients(){return (Set<Object>)ReflectionTestUtils.getField(s,"clients");}
        public void close(){s.shutdown();}
    }
    List<DynamicTest> realtimeCases(){
        for(String path:List.of("anonymous","active-user","bad-token","missing-user","inactive-user","changed-role","send-rejected","expired"))add("CommunityRealtimeService.connect","Normal","connection="+path,"Accept anonymous/valid active identity; close invalid or rejected clients; expiry enforced",()->{
            try(F f=new F()){if(path.equals("bad-token"))when(f.tokens.isCurrentSession(eq("token"), any(org.hlrcs.entity.User.class))).thenReturn(false);if(path.equals("missing-user"))when(f.users.findById(1)).thenReturn(Optional.empty());if(path.equals("inactive-user")){var u=user(1,UserRole.USER);u.setStatus(UserStatus.INACTIVE);when(f.users.findById(1)).thenReturn(Optional.of(u));}if(path.equals("changed-role"))when(f.users.findById(1)).thenReturn(Optional.of(user(1,UserRole.ADMIN)));if(path.equals("send-rejected"))doThrow(new RejectedExecutionException()).when(f.sender).execute(any());
                SseEmitter emitter=f.s.connect(path.equals("anonymous")?null:1,UserRole.USER,"token");assertEquals(305_000L,emitter.getTimeout());assertEquals(Set.of("anonymous","active-user","expired").contains(path)?1:0,f.clients().size());
                if(path.equals("expired")){Object old=f.clients().iterator().next();var type=old.getClass();var constructor=type.getDeclaredConstructors()[0];constructor.setAccessible(true);Object expired=constructor.newInstance(emitter,1,UserRole.USER,"token",0L);f.clients().clear();f.clients().add(expired);f.s.heartbeat();assertTrue(f.clients().isEmpty());}
            }
        });
        for(String kind:List.of("public-post","private-report","own-notification","other-notification"))add("CommunityRealtimeService.changed","Normal","event="+kind+", viewer=USER:1","Send visible invalidations only; support event with/without postId",()->{
            try(F f=new F()){f.s.connect(1,UserRole.USER,"token");clearInvocations(f.sender);var event=switch(kind){case "public-post"->CommunityRealtimeEvent.comments(10);case "private-report"->CommunityRealtimeEvent.reports(10);case "own-notification"->CommunityRealtimeEvent.notifications(1);default->CommunityRealtimeEvent.notifications(2);};f.s.changed(event);verify(f.sender,times(kind.equals("public-post")||kind.equals("own-notification")?1:0)).execute(any());}
        });
        add("CommunityRealtimeService.start","Normal","service initialized","Schedule heartbeat every 15 seconds",()->{try(F f=new F()){f.s.start();verify(f.clock).scheduleWithFixedDelay(any(Runnable.class),eq(15L),eq(15L),eq(TimeUnit.SECONDS));}});
        add("CommunityRealtimeService.heartbeat","Normal","one anonymous connected client","Send heartbeat task to connected client",()->{try(F f=new F()){f.s.connect(null,null,null);clearInvocations(f.sender);f.s.heartbeat();verify(f.sender).execute(any());}});
        add("CommunityRealtimeService.contextClosing","Normal","two connected clients","Close all emitters before context shutdown",()->{try(F f=new F()){f.s.connect(null,null,null);f.s.connect(1,UserRole.USER,"token");f.s.contextClosing();assertTrue(f.clients().isEmpty());}});
        add("CommunityRealtimeService.shutdown","Normal","one connected client","Close clients and shut down heartbeat/sender executors",()->{F f=new F();f.s.connect(null,null,null);f.s.shutdown();assertTrue(f.clients().isEmpty());verify(f.clock).shutdownNow();verify(f.sender).shutdownNow();});
        add("CommunityRealtimeService.changed","Abnormal","queued sender task runs after client was closed","Ignore queued delivery for removed client",()->{try(F f=new F()){var tasks=new ArrayList<Runnable>();doAnswer(i->{tasks.add(i.getArgument(0));return null;}).when(f.sender).execute(any());f.s.connect(null,null,null);f.s.contextClosing();tasks.forEach(Runnable::run);assertTrue(f.clients().isEmpty());}});
        for(String callback:List.of("completion","timeout","error","send-error"))add("CommunityRealtimeService.connect","Abnormal","emitterCallback="+callback,"Remove closed/failed SSE client; repeated timeout is idempotent",()->{
            try(F f=new F();var construction=mockConstruction(SseEmitter.class)){f.s.connect(null,null,null);var em=construction.constructed().get(0);
                if(callback.equals("send-error")){doThrow(new java.io.IOException()).when(em).send(any(SseEmitter.SseEventBuilder.class));f.s.heartbeat();}
                else if(callback.equals("error")){var cap=org.mockito.ArgumentCaptor.forClass(java.util.function.Consumer.class);verify(em).onError(cap.capture());cap.getValue().accept(new RuntimeException());}
                else{var cap=org.mockito.ArgumentCaptor.forClass(Runnable.class);if(callback.equals("timeout"))verify(em).onTimeout(cap.capture());else verify(em).onCompletion(cap.capture());cap.getValue().run();cap.getValue().run();}assertTrue(f.clients().isEmpty());
            }
        });
        return cases;
    }
}
