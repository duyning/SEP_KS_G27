package org.hlrcs.service;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.junit.jupiter.api.DynamicTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityNotificationMatrixTest extends CommunityUnitSupport {
    static class F {
        CommunityNotificationRepository notices=mock(CommunityNotificationRepository.class);PostRepository posts=mock(PostRepository.class);CommentRepository comments=mock(CommentRepository.class);AuthService auth=mock(AuthService.class);ApplicationEventPublisher events=mock(ApplicationEventPublisher.class);
        CommunityNotificationService s=new CommunityNotificationService(notices,posts,comments,auth,events);User u=user(1,UserRole.USER);Post p=post();CommunityNotification n=CommunityNotification.builder().notificationId(30).recipient(u).postId(10).postTitle("Title").kind("COMMENT").build();
        F(){when(auth.getCurrentUser()).thenReturn(u);when(notices.findByNotificationIdAndRecipient_UserId(30,1)).thenReturn(Optional.of(n));when(posts.findById(10)).thenReturn(Optional.of(p));}
    }
    List<DynamicTest> notificationCases(){
        for(UserRole role:UserRole.values())for(boolean duplicate:List.of(false,true))add("CommunityNotificationService.record","Normal","recipientRole="+role+", duplicate="+duplicate,"Only USER/ROOM_HOST receives one notification per event key",()->{
            F f=new F();f.u.setRole(role);when(f.notices.existsByRecipient_UserIdAndEventKey(1,"key")).thenReturn(duplicate);f.s.record(new CommunityNotificationEvent(f.u,f.p,null,"Actor","COMMENT",null,"key"));
            int count=!duplicate&&(role==UserRole.USER||role==UserRole.ROOM_HOST)?1:0;verify(f.notices,times(count)).save(argThat(n->n.getRecipient()==f.u&&n.getPostId()==10&&n.getEventKey().equals("key")));verify(f.events,times(count)).publishEvent(isA(CommunityRealtimeEvent.class));
        });
        for(int page:List.of(-1,0,1000000,1000001))for(boolean unread:List.of(false,true))add("CommunityNotificationService.inbox","Boundary","page="+page+", unreadOnly="+unread,"Accept pages 0..1000000; correct recipient/query; return unread count and pagination",()->{
            F f=new F();when(f.notices.findByRecipient_UserId(eq(1),any())).thenReturn(new SliceImpl<>(List.of(f.n),PageRequest.of(0,20),true));when(f.notices.findByRecipient_UserIdAndReadFalse(eq(1),any())).thenReturn(new SliceImpl<>(List.of(f.n)));when(f.notices.countByRecipient_UserIdAndReadFalse(1)).thenReturn(3L);
            if(page<0||page>1000000)status(400,()->f.s.inbox(page,unread));else{var r=f.s.inbox(page,unread);assertEquals(1,r.items().size());assertEquals(30,r.items().get(0).notificationId());assertEquals(3,r.unreadCount());assertEquals(!unread,r.hasNext());}
        });
        for(String method:List.of("unread","read","readAll","deleteRead"))add("CommunityNotificationService."+method,"Normal","active caller=1; owned notice=30; unreadCount=3","Read/count/delete only caller records; mutations publish recipient invalidation",()->{
            F f=new F();when(f.notices.countByRecipient_UserIdAndReadFalse(1)).thenReturn(3L);when(f.notices.deleteRead(1)).thenReturn(2);switch(method){case "unread"->assertEquals(3,f.s.unread());case "read"->{f.s.read(30);assertTrue(f.n.isRead());}case "readAll"->{f.s.readAll();verify(f.notices).readAll(1);}case "deleteRead"->assertEquals(2,f.s.deleteRead());}if(!method.equals("unread"))verify(f.events).publishEvent(isA(CommunityRealtimeEvent.class));
        });
        for(String method:List.of("inbox","unread","read","readAll","deleteRead","destination"))add("CommunityNotificationService."+method,"Abnormal","callerStatus=INACTIVE","403; no notification writes",()->{
            F f=new F();f.u.setStatus(UserStatus.INACTIVE);status(403,()->{switch(method){case "inbox"->f.s.inbox(0,false);case "unread"->f.s.unread();case "read"->f.s.read(30);case "readAll"->f.s.readAll();case "deleteRead"->f.s.deleteRead();default->f.s.destination(30);}});verifyNoInteractions(f.events);
        });
        for(String method:List.of("read","destination"))add("CommunityNotificationService."+method,"Abnormal","notification missing or belongs to another recipient","404",()->{F f=new F();when(f.notices.findByNotificationIdAndRecipient_UserId(30,1)).thenReturn(Optional.empty());status(404,()->{if(method.equals("read"))f.s.read(30);else f.s.destination(30);});});
        for(String path:List.of("owner-pending","public-other","private-other","post-missing","root-comment","child-comment","comment-missing","root-missing","comment-private"))add("CommunityNotificationService.destination","Normal","destinationScenario="+path,"Owner/public visibility; resolve root and root page; unavailable post/comment =>404",()->{
            F f=new F();if(path.contains("other"))f.p.setAuthor(user(2,UserRole.USER));if(path.equals("public-other")||path.contains("comment")||path.equals("root-missing"))f.p.setStatus(PostStatus.APPROVED);
            if(path.equals("post-missing"))when(f.posts.findById(10)).thenReturn(Optional.empty());
            boolean comment=Set.of("root-comment","child-comment","comment-missing","root-missing","comment-private").contains(path);if(comment){f.n.setCommentId(20);var c=Comment.builder().commentId(20).post(f.p).parentCommentId(path.equals("child-comment")||path.equals("root-missing")?19:null).createdAt(f.p.getCreatedAt()).build();when(f.comments.findByCommentIdAndPost_PostId(20,10)).thenReturn(path.equals("comment-missing")?Optional.empty():Optional.of(c));var root=Comment.builder().commentId(19).post(f.p).createdAt(f.p.getCreatedAt()).build();when(f.comments.findByCommentIdAndPost_PostId(19,10)).thenReturn(path.equals("root-missing")?Optional.empty():Optional.of(root));when(f.comments.countRootsBefore(eq(10),any(),any())).thenReturn(40L);if(path.equals("comment-private"))f.p.setStatus(PostStatus.PENDING);}
            if(Set.of("private-other","post-missing","comment-missing","root-missing","comment-private").contains(path))status(404,()->f.s.destination(30));else{String r=f.s.destination(30);assertTrue(r.endsWith("#post-10"));assertEquals(!path.equals("public-other"),r.contains("view=mine"));if(comment){assertTrue(r.contains("commentPage=2"));assertTrue(r.contains("root="+(path.equals("child-comment")?19:20)));}}
        });
        return cases;
    }
}
