package org.hlrcs.service;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.entity.CommunityScan.State;
import org.hlrcs.repository.*;
import org.hlrcs.dto.request.*;
import org.junit.jupiter.api.DynamicTest;
import org.springframework.context.ApplicationEventPublisher;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityServiceMatrixExtraTest extends CommunityUnitSupport {
    List<DynamicTest> extraCases(){
        for(boolean admin:List.of(false,true))add("CommunityReportService.stats","Normal","role="+(admin?"ADMIN":"USER"),"Admin receives counts for OPEN/ALL/RESOLVED/DISMISSED; USER forbidden",()->{
            var f=new CommunityReportServiceUnitTest.F();if(!admin)f.actor.setRole(UserRole.USER);var totals=mock(ReportRepository.CommunityTotals.class);
            when(totals.getPosts()).thenReturn(2L);when(totals.getReports()).thenReturn(3L);when(f.reports.communityTotals(any(),anyCollection())).thenReturn(totals);
            if(!admin)status(403,()->f.s.stats());else{var r=f.s.stats();assertEquals(4,r.size());for(var v:r.values()){assertEquals(2,v.posts());assertEquals(3,v.reports());}}
        });
        for(int actor:List.of(1,2,3))for(int target:List.of(1,2,3))add("CommunityCommentService.reply","Normal","actorId="+actor+", targetAuthorId="+target+", postOwnerId=1","Notify distinct recipients only; publish comment invalidation",()->{
            var f=new CommunityCommentServiceUnitTest.F();when(f.auth.getCurrentUser()).thenReturn(user(actor,UserRole.USER));f.c.setAuthor(user(target,UserRole.USER));var publisher=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(publisher);
            f.s.reply(10,20,new CommunityCommentRequest("new reply"));int expected=(target!=actor?1:0)+(actor!=1&&target!=1?1:0);
            verify(publisher,times(expected)).publishEvent(isA(CommunityNotificationEvent.class));verify(publisher).publishEvent(isA(CommunityRealtimeEvent.class));
        });
        for(boolean owner:List.of(false,true))add("CommunityCommentService.create","Normal","callerIsPostOwner="+owner,"Notify post owner only when author differs",()->{var f=new CommunityCommentServiceUnitTest.F();when(f.auth.getCurrentUser()).thenReturn(user(owner?1:2,UserRole.USER));var publisher=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(publisher);f.s.create(10,new CommunityCommentRequest("new comment"));verify(publisher,times(owner?0:1)).publishEvent(isA(CommunityNotificationEvent.class));});
        for(String path:List.of("latest-null","empty-batch","missing-post","not-pending","new-job","running-job","reset-failed","reset-ineligible","already-queued"))add("CommunityAutoModeration.processNext","Normal","backlog="+path,"AUTO backfills pending revisions in bounded batches; preserves running jobs; resets obsolete eligible jobs",()->{
            var f=new CommunityAutoModerationUnitTest.F(CommunityAutoModeration.Mode.AUTO,true);when(f.jobs.findFirstByStateOrderByIdAsc(State.QUEUED)).thenReturn(Optional.empty());when(f.posts.latestPostId()).thenReturn(path.equals("latest-null")?null:10);
            when(f.posts.pendingBacklogIds(eq(PostStatus.PENDING),eq(0),eq(10),any())).thenReturn(path.equals("empty-batch")?List.of():List.of(10));
            if(path.equals("missing-post"))when(f.posts.findForReview(10)).thenReturn(Optional.empty());if(path.equals("not-pending"))f.p.setStatus(PostStatus.APPROVED);
            if(Set.of("running-job","reset-failed","reset-ineligible","already-queued").contains(path)){when(f.jobs.findByPostIdAndRevision(10,0)).thenReturn(Optional.of(f.j));f.j.setState(path.equals("running-job")?State.RUNNING:path.equals("reset-failed")?State.FAILED:State.QUEUED);if(path.equals("reset-ineligible"))f.j.setAutoEligible(false);}
            f.s.processNext();if(path.equals("new-job"))verify(f.jobs).save(argThat(j->j.isAutoEligible()&&j.getPostId()==10));else verify(f.jobs,never()).save(any());
            if(path.startsWith("reset")){assertEquals(State.QUEUED,f.j.getState());assertTrue(f.j.isAutoEligible());assertNull(f.j.getFindings());}if(path.equals("running-job"))assertEquals(State.RUNNING,f.j.getState());
        });
        add("CommunityService.delete","Normal","postStatus=APPROVED; publisher injected","Delete public post and publish both post/report invalidations",()->{var f=new CommunityServiceUnitTest.F();f.p.setStatus(PostStatus.APPROVED);var publisher=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(publisher);f.s.delete(10);verify(publisher,times(2)).publishEvent(isA(CommunityRealtimeEvent.class));});
        add("CommunityReportService.submit","Normal","publisher injected; valid report","Publish report-submitted analysis event",()->{var f=new CommunityReportServiceUnitTest.F();var publisher=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(publisher);f.s.submit(10,new CommunityReportRequest(CommunityReportReason.SPAM,"details"),List.of());verify(publisher).publishEvent(isA(CommunityReportSubmitted.class));});
        add("CommunityAutoModeration.processNext","Normal","same AUTO worker polls twice; no remaining backlog","Second poll reuses completed backlog pass",()->{var f=new CommunityAutoModerationUnitTest.F(CommunityAutoModeration.Mode.AUTO,true);var pub=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(pub);when(f.jobs.findFirstByStateOrderByIdAsc(State.QUEUED)).thenReturn(Optional.empty());f.s.processNext();f.s.processNext();verify(f.posts,times(1)).latestPostId();});
        add("CommunityAutoModeration.processNext","Abnormal","transaction callback returns no next cursor","Keep previous backlog position and stop without claim",()->{var f=new CommunityAutoModerationUnitTest.F(CommunityAutoModeration.Mode.AUTO,true);org.springframework.test.util.ReflectionTestUtils.setField(f.s,"backlogRequested",false);org.springframework.test.util.ReflectionTestUtils.setField(f.s,"backlogThrough",10);var tx=new org.springframework.transaction.support.TransactionTemplate(){@Override public <T> T execute(org.springframework.transaction.support.TransactionCallback<T> callback){return null;}};org.springframework.test.util.ReflectionTestUtils.setField(f.s,"tx",tx);f.s.processNext();verify(f.scanner,never()).scan(anyString(),any());});
        return cases;
    }
}
