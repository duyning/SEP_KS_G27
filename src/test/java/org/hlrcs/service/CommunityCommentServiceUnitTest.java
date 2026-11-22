package org.hlrcs.service;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.dto.request.CommunityCommentRequest;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityCommentServiceUnitTest extends CommunityUnitSupport {
    static class F {
        CommentRepository comments=mock(CommentRepository.class);PostRepository posts=mock(PostRepository.class);AuthService auth=mock(AuthService.class);
        CommunityCommentService s=new CommunityCommentService(comments,posts,auth);Post p=post();Comment c;
        F(){p.setStatus(PostStatus.APPROVED);c=Comment.builder().commentId(20).post(p).author(p.getAuthor()).content("old text").build();
            when(auth.getCurrentUser()).thenReturn(p.getAuthor());when(posts.findForReview(10)).thenReturn(Optional.of(p));when(posts.findById(10)).thenReturn(Optional.of(p));
            when(comments.findByCommentIdAndPost_PostId(20,10)).thenReturn(Optional.of(c));when(comments.saveAndFlush(any())).thenAnswer(i->{Comment v=i.getArgument(0);v.setCommentId(20);return v;});}
    }
    @TestFactory List<DynamicTest> commentCases(){
        for(int[] v:List.of(new int[]{-1,20},new int[]{0,0},new int[]{0,101},new int[]{Integer.MAX_VALUE,100},new int[]{0,1},new int[]{0,100},new int[]{Integer.MAX_VALUE,1})){
            int page=v[0],size=v[1];add("CommunityCommentService.pageable","Boundary","page="+page+", size="+size,"Invalid range/overflow => 400; boundary 1/100 and max offset accepted",()->{
                F f=new F();when(f.comments.findByPost_PostIdAndParentCommentIdIsNull(eq(10),any())).thenReturn(Page.empty(PageRequest.of(0,1)));
                if(page<0||size<1||size>100||(long)page*size>Integer.MAX_VALUE)status(400,()->f.s.list(10,page,size));else{assertTrue(f.s.list(10,page,size).content().isEmpty());verify(f.comments).findByPost_PostIdAndParentCommentIdIsNull(eq(10),argThat(p->p.getPageNumber()==page&&p.getPageSize()==size));}
            });
        }
        for(String method:List.of("list","create"))for(String state:List.of("missing","pending"))add("CommunityCommentService.approvedPost","Abnormal",method+"; post="+state,"404 for absent or non-public post; read and locked paths",()->{
            F f=new F();if(state.equals("missing")){when(f.posts.findById(10)).thenReturn(Optional.empty());when(f.posts.findForReview(10)).thenReturn(Optional.empty());}else f.p.setStatus(PostStatus.PENDING);
            status(404,()->{if(method.equals("list"))f.s.list(10,0,20);else f.s.create(10,new CommunityCommentRequest("valid text"));});verify(f.comments,never()).saveAndFlush(any());
        });
        add("CommunityCommentService.create","Normal","approved post; valid content","Author bound to caller; root comment saved; response correct",()->{F f=new F();var r=f.s.create(10,new CommunityCommentRequest(" New comment "));assertEquals("New comment",r.content());assertEquals(1,r.authorId());assertNull(r.parentId());});
        for(boolean changed:List.of(false,true))add("CommunityCommentService.update","Normal","owner; content changed="+changed,"Unchanged text preserves timestamp; changed text sets updatedAt",()->{
            F f=new F();var r=f.s.update(10,20,new CommunityCommentRequest(changed?"updated text":"old text"));assertEquals(changed?"updated text":"old text",r.content());assertEquals(changed,r.updatedAt()!=null);verify(f.comments).saveAndFlush(f.c);
        });
        for(String method:List.of("update","delete","reply","replies"))add("CommunityCommentService.comment","Abnormal",method+"; nonexistent/mismatched comment id","404; comment lookup constrained by post",()->{
            F f=new F();when(f.comments.findByCommentIdAndPost_PostId(20,10)).thenReturn(Optional.empty());status(404,()->{switch(method){case "update"->f.s.update(10,20,new CommunityCommentRequest("new"));case "delete"->f.s.delete(10,20);case "reply"->f.s.reply(10,20,new CommunityCommentRequest("reply"));default->f.s.replies(10,20,0,20);}});
        });
        add("CommunityCommentService.update","Abnormal","caller differs from comment author","404 and no update",()->{F f=new F();when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.USER));status(404,()->f.s.update(10,20,new CommunityCommentRequest("new")));verify(f.comments,never()).saveAndFlush(any());});
        for(UserRole role:UserRole.values())for(boolean owner:List.of(false,true))for(boolean root:List.of(false,true))add("CommunityCommentService.delete","Normal","role="+role+", owner="+owner+", root="+root,"Owner/staff/admin can delete; root deletes replies; child clears references; stranger =>404",()->{
            F f=new F();when(f.auth.getCurrentUser()).thenReturn(user(owner?1:2,role));if(!root)f.c.setParentCommentId(19);
            if(!owner&&role!=UserRole.STAFF&&role!=UserRole.ADMIN){status(404,()->f.s.delete(10,20));verify(f.comments,never()).delete(any());}
            else{f.s.delete(10,20);verify(f.comments).delete(f.c);verify(f.comments).flush();if(root){verify(f.comments).deleteReplies(10,20);verify(f.comments,never()).clearReplyTargets(any(),any());}else{verify(f.comments).clearReplyTargets(10,20);verify(f.comments,never()).deleteReplies(any(),any());}}
        });
        for(boolean child:List.of(false,true))for(boolean missingTarget:List.of(false,true))add("CommunityCommentService.reply","Normal","target child="+child+", reply target disappears="+missingTarget,"Flatten reply to root; retain reply-to id; missing display target becomes null",()->{
            F f=new F();if(child){f.c.setParentCommentId(19);var root=Comment.builder().commentId(19).post(f.p).author(f.p.getAuthor()).build();when(f.comments.findByCommentIdAndPost_PostId(19,10)).thenReturn(Optional.of(root));}
            if(missingTarget){if(child)when(f.comments.findByCommentIdAndPost_PostId(20,10)).thenReturn(Optional.of(f.c),Optional.empty());else when(f.comments.findByCommentIdAndPost_PostId(20,10)).thenReturn(Optional.of(f.c),Optional.of(f.c),Optional.empty());}
            var r=f.s.reply(10,20,new CommunityCommentRequest("reply"));assertEquals(child?19:20,r.parentId());assertEquals(20,r.replyToId());assertEquals(missingTarget?null:"Actor 1",r.replyToAuthorName());
        });
        for(boolean child:List.of(false,true))add("CommunityCommentService.replies","Normal","target child="+child,"Select correct root and return page",()->{F f=new F();if(child)f.c.setParentCommentId(19);when(f.comments.findByPost_PostIdAndParentCommentId(eq(10),eq(child?19:20),any())).thenReturn(Page.empty());assertTrue(f.s.replies(10,20,0,20).content().isEmpty());verify(f.comments).findByPost_PostIdAndParentCommentId(eq(10),eq(child?19:20),any());});
        for(boolean target:List.of(false,true))add("CommunityCommentService.page","Normal","nonempty page; reply target="+target,"Resolve target names and counts; skip null author names; preserve pagination",()->{
            F f=new F();if(target)f.c.setReplyToCommentId(19);var t=Comment.builder().commentId(19).author(user(2,UserRole.USER)).build();var nullName=Comment.builder().commentId(18).author(user(3,UserRole.USER)).build();nullName.getAuthor().setFullName(null);
            when(f.comments.findByCommentIdIn(anyList())).thenReturn(List.of(t,nullName));var count=mock(CommentRepository.ReplyCount.class);when(count.getParentId()).thenReturn(20);when(count.getTotal()).thenReturn(4L);when(f.comments.countForParents(anyList())).thenReturn(List.of(count));
            when(f.comments.findByPost_PostIdAndParentCommentIdIsNull(eq(10),any())).thenReturn(new PageImpl<>(List.of(f.c),PageRequest.of(0,20),1));when(f.comments.countByPost_PostId(10)).thenReturn(5L);
            var r=f.s.list(10,0,20);assertEquals(1,r.content().size());assertEquals(4,r.content().get(0).replyCount());assertEquals(target?"Actor 2":null,r.content().get(0).replyToAuthorName());assertEquals(5,r.commentCount());
        });
        return cases;
    }
}

