package org.hlrcs.service;

import org.hlrcs.dto.request.*;
import org.hlrcs.dto.response.CommunityPostResponse.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.DynamicTest;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityServiceUnitTest extends CommunityUnitSupport {
    static class F {
        PostRepository posts=mock(PostRepository.class); ModerationLogRepository logs=mock(ModerationLogRepository.class);
        AuthService auth=mock(AuthService.class); CommunityImageService images=mock(CommunityImageService.class);
        CommunityVideoService videos=mock(CommunityVideoService.class); CommentRepository comments=mock(CommentRepository.class);
        CommunityScanRepository scans=mock(CommunityScanRepository.class); CommunityAutoModeration auto=mock(CommunityAutoModeration.class);
        CommunityService s=new CommunityService(posts,logs,auth,images,videos,comments,JSON,scans,auto);
        Post p=post();
        F() {
            when(auth.getCurrentUser()).thenReturn(p.getAuthor());
            when(posts.findForReview(10)).thenReturn(Optional.of(p)); when(posts.findById(10)).thenReturn(Optional.of(p));
            when(posts.saveAndFlush(any())).thenAnswer(i-> { Post value=i.getArgument(0); value.setPostId(10); return value; });
        }
    }
    @TestFactory List<DynamicTest> communityCases() {
        for (PostType t:PostType.values()) for(boolean privacy:List.of(false,true)) for(boolean reviewer:List.of(false,true)) {
            add("CommunityService.response", "Normal", "postType="+t+", privateView="+privacy+", reviewer="+reviewer,
                    "Correct category, label, author fallback, comment count; review fields visible only in private view", ()->{
                F f=new F(); f.p.setPostType(t); f.p.setContactName(null); f.p.setReviewer(reviewer?user(2,UserRole.STAFF):null); f.p.setReviewNote("private");
                var r=f.s.response(f.p,privacy); assertEquals(10,r.id()); assertEquals("Actor 1",r.authorName());
                assertEquals(t==PostType.PASS_ROOM?"ROOM_TRANSFER":t==PostType.PASS_ITEM?"SECOND_HAND":"ROOMMATE",r.type());
                assertNotNull(r.typeLabel()); assertEquals(privacy?"private":null,r.decisionNote()); assertEquals(privacy&&reviewer?"Actor 2":null,r.reviewedBy());
            });
        }
        add("CommunityService.responses","Boundary","empty list","Empty result and no count query",()->{F f=new F();assertTrue(f.s.responses(List.of(),false).isEmpty());verifyNoInteractions(f.comments);});
        add("CommunityService.responses","Normal","two posts; only first has count projection","Batched count lookup; missing count defaults to 0",()->{
            F f=new F(); var count=mock(CommentRepository.PostCount.class); when(count.getPostId()).thenReturn(10);when(count.getTotal()).thenReturn(3L);
            when(f.comments.countForPosts(anyList())).thenReturn(List.of(count));Post other=post();other.setPostId(11);
            var rows=f.s.responses(List.of(f.p,other),true);assertEquals(3,rows.get(0).commentCount());assertEquals(0,rows.get(1).commentCount());assertEquals("Contact",rows.get(0).authorName());
        });
        for(String m:List.of("published","mine","moderationList"))add("CommunityService."+m,"Normal","one pending/approved fixture; caller id=1","Correct repository query and public/private mapping",()->{
            F f=new F(); if(m.equals("published")){when(f.posts.findByStatusOrderByCreatedAtDescPostIdDesc(PostStatus.APPROVED)).thenReturn(List.of(f.p));assertEquals(1,f.s.published().size());}
            else if(m.equals("mine")){when(f.posts.findByAuthor_UserIdOrderByCreatedAtDescPostIdDesc(1)).thenReturn(List.of(f.p));assertEquals(1,f.s.mine().size());}
            else{when(f.posts.findAllByOrderByCreatedAtDescPostIdDesc()).thenReturn(List.of(f.p));assertEquals(1,f.s.moderationList().size());}
        });
        for(int overload=1;overload<=3;overload++){int n=overload;add("CommunityService.submit"+n,"Normal","valid request; overload arity="+n,"PENDING; authenticated author; save, media replace and enqueue exactly once",()->{
            F f=new F();var r=n==1?f.s.submit(request()):n==2?f.s.submit(request(),List.of()):f.s.submit(request(),List.of(),List.of());
            assertEquals("PENDING",r.status());assertEquals(1,r.authorId());verify(f.auto).enqueue(any());verify(f.images).replace(any(),isNull(),anyList());verify(f.videos).replace(any(),isNull(),anyList());
        });}
        for(String type:List.of("ROOM_TRANSFER","ROOMMATE","SECOND_HAND","INVALID"))for(String price:List.of("null","0","1")){
            add("CommunityService.apply","Boundary","type="+type+", price="+price,"Reject invalid category and zero rental price; accept null/positive and free second-hand item",()->{
                F f=new F();var change=new HashMap<String,Object>();change.put("type",type);change.put("price",price.equals("null")?null:new BigDecimal(price));
                if(type.equals("INVALID")||price.equals("0")&&!type.equals("SECOND_HAND")){status(400,()->f.s.submit(request(change)));verify(f.posts,never()).saveAndFlush(any());}
                else{var r=f.s.submit(request(change));assertEquals(type,r.type());assertEquals(change.get("price"),r.price());}
            });
        }
        add("CommunityService.apply","Normal","format=serif:large:bi","Validated legacy formatting is persisted",()->{F f=new F();assertEquals("serif:large:bi",f.s.submit(request(Map.of("format","serif:large:bi"))).contentFormat());});
        for(PostStatus st:PostStatus.values()) add("CommunityService.resubmit3","Abnormal","existing status="+st+"; changed title","Only NEED_CHANGES is resubmittable",()->{
            F f=new F();f.p.setStatus(st);if(st!=PostStatus.NEED_CHANGES)status(409,()->f.s.resubmit(10,request(Map.of("title","Updated community title")),null,null));
            else{f.p.setReviewer(user(2,UserRole.STAFF));f.p.setReviewNote("revise");var r=f.s.resubmit(10,request(Map.of("title","Updated community title")),null,null);
                assertEquals("PENDING",r.status());assertEquals(1,f.p.revision());assertNull(f.p.getReviewer());assertNull(f.p.getReviewedAt());assertNull(f.p.getReviewNote());verify(f.auto).enqueue(f.p);}
        });
        for(String action:List.of("delete","resubmit","review","detail"))add("CommunityService."+(action.equals("resubmit")?"resubmit3":action),"Abnormal","post id does not exist","404 and no writes",()->{
            F f=new F();when(f.posts.findForReview(10)).thenReturn(Optional.empty());when(f.posts.findById(10)).thenReturn(Optional.empty());
            status(404,()->{switch(action){case "delete"->f.s.delete(10);case "resubmit"->f.s.resubmit(10,request(),null,null);case "review"->f.s.review(10,new CommunityReviewRequest("APPROVE",null,0));default->f.s.detail(10);}});verify(f.posts,never()).saveAndFlush(any());
        });
        for(String action:List.of("delete","resubmit"))add("CommunityService."+(action.equals("resubmit")?"resubmit3":action),"Abnormal","caller id=2; owner id=1","404; owner isolation; no media deletion/enqueue",()->{
            F f=new F();when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.USER));status(404,()->{if(action.equals("delete"))f.s.delete(10);else f.s.resubmit(10,request(),null,null);});verifyNoInteractions(f.auto);verify(f.posts,never()).delete(any());
        });
        add("CommunityService.delete","Normal","caller is author; dependent records exist","Delete all dependent types then post and flush",()->{
            F f=new F();f.s.delete(10);var order=inOrder(f.posts,f.scans);order.verify(f.posts).findForReview(10);order.verify(f.posts).deleteCommentsForPost(10);order.verify(f.posts).deleteMediaForPost(10);
            order.verify(f.posts).deleteRoommateDetailForPost(10);order.verify(f.posts).deleteRoomTransferDetailForPost(10);order.verify(f.posts).deleteItemDetailForPost(10);order.verify(f.scans).deleteForPost(10);order.verify(f.posts).delete(f.p);order.verify(f.posts).flush();
        });
        for(int n:List.of(1,2))add("CommunityService.resubmit"+n,"Normal","changed title; overload arity="+n,"Delegates and resubmits",()->{F f=new F();f.p.setStatus(PostStatus.NEED_CHANGES);assertEquals("PENDING",(n==1?f.s.resubmit(10,request(Map.of("title","Changed title"))):f.s.resubmit(10,request(Map.of("title","Changed title")),List.of())).status());});
        for(String field:List.of("type","title","content","price","location","authorName","authorPhone","facebookUrl","zaloUrl","format","images","videos","none")){
            add("CommunityService.hasRevisionChanges","Normal","Only "+field+" changes; remaining fields equal","Each operand independently triggers revision; unchanged request rejected",()->{
                F f=new F();f.p.setStatus(PostStatus.NEED_CHANGES);var c=new HashMap<String,Object>();
                switch(field){case "type"->c.put(field,"SECOND_HAND");case "title","content","location","authorName"->c.put(field,"Changed value");case "authorPhone"->c.put(field,"0987654321");case "price"->c.put(field,new BigDecimal("2000"));case "facebookUrl"->c.put(field,"https://facebook.com/test");case "zaloUrl"->c.put(field,"https://zalo.me/0987654321");case "format"->c.put(field,"mono:large:b");case "images"->{when(f.images.metadata(10)).thenReturn(List.of(new Image(1,"a.png")));c.put(field,List.of());}case "videos"->{when(f.videos.metadata(10)).thenReturn(List.of(new Image(1,"a.mp4")));c.put(field,List.of());}}
                if(field.equals("none"))status(400,()->f.s.resubmit(10,request(c),null,null));else assertEquals("PENDING",f.s.resubmit(10,request(c),null,null).status());
            });
        }
        for(String state:List.of("both-null","post-null","request-null","scale-equal","format-equal","same-size-different-ids","same-ids","empty-uploads","new-photo","new-video","pass-room","pass-item"))add("CommunityService.hasRevisionChanges","Boundary",state,"Null, empty and independent short-circuit condition paths behave correctly",()->{
            F f=new F();f.p.setStatus(PostStatus.NEED_CHANGES);var c=new HashMap<String,Object>();List<org.springframework.web.multipart.MultipartFile> photo=null,video=null;boolean changed=false;
            switch(state){case "both-null"->{f.p.setPrice(null);c.put("price",null);}case "post-null"->{f.p.setPrice(null);changed=true;}case "request-null"->{c.put("price",null);changed=true;}case "scale-equal"->c.put("price",new BigDecimal("1000.00"));case "format-equal"->{f.p.setContentFormat("mono:normal:b");c.put("format","mono:normal:b");}case "same-size-different-ids"->{when(f.images.metadata(10)).thenReturn(List.of(new Image(1,"a")));c.put("images",List.of(2));changed=true;}case "same-ids"->{when(f.images.metadata(10)).thenReturn(List.of(new Image(1,"a")));c.put("images",List.of(1));c.put("videos",List.of());}case "empty-uploads"->{photo=List.of();video=List.of();}case "new-photo"->{photo=List.of(mock(org.springframework.web.multipart.MultipartFile.class));changed=true;}case "new-video"->{photo=List.of();video=List.of(mock(org.springframework.web.multipart.MultipartFile.class));changed=true;}case "pass-room"->{f.p.setPostType(PostType.PASS_ROOM);c.put("type","ROOM_TRANSFER");}case "pass-item"->{f.p.setPostType(PostType.PASS_ITEM);c.put("type","SECOND_HAND");}}
            var ph=photo;var vi=video;if(changed)assertEquals("PENDING",f.s.resubmit(10,request(c),ph,vi).status());else status(400,()->f.s.resubmit(10,request(c),ph,vi));
        });
        for(String decision:List.of("APPROVE","REJECT","REQUEST_CHANGES","BOGUS"))for(int length:List.of(0,9,10))add("CommunityService.review","Boundary","decision="+decision+", note length="+length,"Decision mapping and minimum reason length; approve permits empty reason",()->{
            F f=new F();when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.STAFF));var req=new CommunityReviewRequest(decision,"x".repeat(length),0);
            if(!decision.equals("APPROVE")&&length<10||decision.equals("BOGUS"))status(400,()->f.s.review(10,req));else{
                var r=f.s.review(10,req);assertEquals(decision.equals("APPROVE")?PostStatus.APPROVED:decision.equals("REJECT")?PostStatus.REJECTED:PostStatus.NEED_CHANGES,f.p.getStatus());
                assertNotNull(r);assertNotNull(f.p.getReviewedAt());assertFalse(f.p.getReviewNote().isBlank());verify(f.logs).saveAndFlush(any());}
        });
        for(String condition:List.of("self","stale","processed","null-revision"))add("CommunityService.review","Abnormal",condition,"403 for self; 409 for stale/processed; null revision defaults to zero",()->{
            F f=new F();if(!condition.equals("self"))when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.STAFF));if(condition.equals("processed"))f.p.setStatus(PostStatus.APPROVED);
            var req=new CommunityReviewRequest("APPROVE",null,condition.equals("null-revision")?null:condition.equals("stale")?1:0);
            if(condition.equals("null-revision"))assertNotNull(f.s.review(10,req));else status(condition.equals("self")?403:409,()->f.s.review(10,req));
        });
        add("CommunityService.detail","Normal","manual history + current/prior AI scans; null timestamp","Merge histories, current revision scan, reverse chronological with null last",()->{
            F f=new F();var log=ModerationLog.builder().logId(1).staff(user(2,UserRole.STAFF)).createdAt(f.p.getCreatedAt()).action("PENDING").build();
            var old=CommunityScan.builder().id(1).postId(10).revision(1).decision(PostStatus.APPROVED).finishedAt(null).build();
            var now=CommunityScan.builder().id(2).postId(10).revision(0).build();var scan=new Scan("CLEAR",List.of(),null);when(f.auto.view(now)).thenReturn(scan);
            when(f.logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("COMMUNITY_POST",10)).thenReturn(List.of(log));when(f.scans.findByPostIdOrderByRevisionDesc(10)).thenReturn(List.of(old,now));
            var r=f.s.detail(10);assertEquals(2,r.history().size());assertEquals(1,r.history().get(0).id());assertEquals(-1,r.history().get(1).id());assertSame(scan,r.scan());
        });
        return cases;
    }
}
