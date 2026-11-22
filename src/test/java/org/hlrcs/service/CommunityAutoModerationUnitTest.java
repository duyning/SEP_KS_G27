package org.hlrcs.service;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.entity.enums.MediaType;
import org.hlrcs.entity.CommunityScan.State;
import org.hlrcs.dto.response.CommunityPostResponse.ScanFinding;
import org.hlrcs.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.transaction.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityAutoModerationUnitTest extends CommunityUnitSupport {
    static class F {
        CommunityScanRepository jobs=mock(CommunityScanRepository.class);PostRepository posts=mock(PostRepository.class);PostMediaRepository media=mock(PostMediaRepository.class);GeminiCommunityScanner scanner=mock(GeminiCommunityScanner.class);
        PlatformTransactionManager tx=mock(PlatformTransactionManager.class);CommunityAutoModeration s;Post p=post();CommunityScan j=CommunityScan.builder().id(1).postId(10).revision(0).state(State.QUEUED).autoEligible(true).build();
        F(CommunityAutoModeration.Mode mode,boolean configured){when(scanner.configured()).thenReturn(configured);when(tx.getTransaction(any())).thenReturn(mock(TransactionStatus.class));s=new CommunityAutoModeration(jobs,posts,media,scanner,JSON,tx,mode);var entry=mock(CommunityScanRepository.QueueEntry.class);when(entry.getId()).thenReturn(1);when(entry.getPostId()).thenReturn(10);when(jobs.findFirstByStateOrderByIdAsc(State.QUEUED)).thenReturn(Optional.of(entry));when(jobs.lockById(1)).thenReturn(Optional.of(j));when(posts.findForReview(10)).thenReturn(Optional.of(p));}
    }
    @TestFactory List<DynamicTest> autoCases(){
        for(var mode:CommunityAutoModeration.Mode.values())for(boolean configured:List.of(false,true)){
            add("CommunityAutoModeration.settings","Normal","mode="+mode+", configured="+configured,"Return configured flag and mode",()->{F f=new F(mode,configured);assertEquals(mode,f.s.settings().mode());assertEquals(configured,f.s.settings().configured());});
            add("CommunityAutoModeration.enqueue","Normal","mode="+mode+", configured="+configured,"OFF saves nothing; AUTO eligibility; QUEUED or FAILED with timestamp",()->{
                F f=new F(mode,configured);f.s.enqueue(f.p);if(mode==CommunityAutoModeration.Mode.OFF)verify(f.jobs,never()).save(any());else verify(f.jobs).save(argThat(j->j.getPostId()==10&&j.getRevision()==0&&j.isAutoEligible()==(mode==CommunityAutoModeration.Mode.AUTO)&&j.getState()==(configured?State.QUEUED:State.FAILED)&&(j.getFinishedAt()!=null)==!configured));
            });
            for(var next:CommunityAutoModeration.Mode.values())add("CommunityAutoModeration.changeMode","Normal","from="+mode+", to="+next+", configured="+configured,"OFF always allowed; AI modes require key; same mode idempotent",()->{F f=new F(mode,configured);if(next!=CommunityAutoModeration.Mode.OFF&&!configured)status(400,()->f.s.changeMode(next));else assertEquals(next,f.s.changeMode(next).mode());});
        }
        add("CommunityAutoModeration.changeMode","Abnormal","mode=null","400",()->status(400,()->new F(CommunityAutoModeration.Mode.OFF,true).s.changeMode(null)));
        for(var mode:CommunityAutoModeration.Mode.values())for(State state:State.values())for(boolean findings:List.of(false,true))add("CommunityAutoModeration.view","Normal","mode="+mode+", state="+state+", findings="+findings,"Queued OFF is PAUSED; otherwise state name; deserialize findings",()->{
            F f=new F(mode,true);f.j.setState(state);if(findings)f.j.setFindings(JSON.writeValueAsString(List.of(new ScanFinding("UNSURE",1,"a.png",null))));var r=f.s.view(f.j);assertEquals(mode==CommunityAutoModeration.Mode.OFF&&state==State.QUEUED?"PAUSED":state.name(),r.state());assertEquals(findings?1:0,r.findings().size());
        });
        for(String path:List.of("off","unconfigured","no-queue","missing-job","already-running","missing-post","not-pending","wrong-revision"))add("CommunityAutoModeration.claim","Abnormal",path,"No scan/decision for disabled, empty, raced or obsolete queue; obsolete marked SKIPPED",()->{
            F f=new F(path.equals("off")?CommunityAutoModeration.Mode.OFF:CommunityAutoModeration.Mode.AUTO,!path.equals("unconfigured"));
            switch(path){case "no-queue"->when(f.jobs.findFirstByStateOrderByIdAsc(State.QUEUED)).thenReturn(Optional.empty());case "missing-job"->when(f.jobs.lockById(1)).thenReturn(Optional.empty());case "already-running"->f.j.setState(State.RUNNING);case "missing-post"->when(f.posts.findForReview(10)).thenReturn(Optional.empty());case "not-pending"->f.p.setStatus(PostStatus.REJECTED);case "wrong-revision"->f.p.setSubmissionRevision(1);}
            f.s.processNext();verify(f.scanner,never()).scan(anyString(),any());if(Set.of("missing-post","not-pending","wrong-revision").contains(path)){assertEquals(State.SKIPPED,f.j.getState());assertNotNull(f.j.getFinishedAt());}
        });
        for(var mode:List.of(CommunityAutoModeration.Mode.AUTO,CommunityAutoModeration.Mode.ASSIST))for(String verdict:List.of("CLEAR","OFF_TOPIC","FLAGGED","UNSURE","SEXUAL","IO_ERROR","INTERRUPT"))add("CommunityAutoModeration.processNext","Normal","mode="+mode+", scanner="+verdict,"Aggregate result; AUTO approves clear or requests image changes; ASSIST never decides; failures stay pending",()->{
            F f=new F(mode,true);var image=PostMedia.builder().mediaId(8).mediaType(MediaType.IMAGE).fileName(null).build();when(f.media.findByPost_PostIdOrderByMediaIdAsc(10)).thenReturn(List.of(image));
            if(verdict.equals("IO_ERROR"))when(f.scanner.scan(anyString(),isNull())).thenThrow(new java.io.IOException());else if(verdict.equals("INTERRUPT"))when(f.scanner.scan(anyString(),isNull())).thenThrow(new InterruptedException());
            else if(!verdict.equals("CLEAR"))when(f.scanner.scan(anyString(),eq(image))).thenReturn(new ScanFinding(verdict,8,null,null));
            try{f.s.processNext();assertEquals(verdict.equals("CLEAR")?State.CLEAR:verdict.equals("OFF_TOPIC")?State.OFF_TOPIC:Set.of("IO_ERROR","INTERRUPT").contains(verdict)?State.FAILED:State.FLAGGED,f.j.getState());
                assertEquals(mode==CommunityAutoModeration.Mode.AUTO&&verdict.equals("CLEAR")?PostStatus.APPROVED:mode==CommunityAutoModeration.Mode.AUTO&&verdict.equals("OFF_TOPIC")?PostStatus.NEED_CHANGES:PostStatus.PENDING,f.p.getStatus());
                assertNotNull(f.j.getFinishedAt());assertNotNull(f.j.getFindings());if(verdict.equals("INTERRUPT"))assertTrue(Thread.currentThread().isInterrupted());
            }finally{Thread.interrupted();}
        });
        for(String race:List.of("job-missing","job-not-running","ineligible","off","assist","generation","post-missing","post-decided","revision","off-during-media"))add("CommunityAutoModeration.finish","Abnormal",race,"Concurrent invalidation blocks automatic decision; disabled media scan recorded as failed",()->{
            F f=new F(CommunityAutoModeration.Mode.AUTO,true);if(race.equals("ineligible"))f.j.setAutoEligible(false);
            when(f.scanner.scan(anyString(),isNull())).thenAnswer(i->{switch(race){case "job-missing"->when(f.jobs.lockById(1)).thenReturn(Optional.empty());case "job-not-running"->f.j.setState(State.FAILED);case "off","off-during-media"->f.s.changeMode(CommunityAutoModeration.Mode.OFF);case "assist"->f.s.changeMode(CommunityAutoModeration.Mode.ASSIST);case "generation"->{f.s.changeMode(CommunityAutoModeration.Mode.ASSIST);f.s.changeMode(CommunityAutoModeration.Mode.AUTO);}case "post-missing"->when(f.posts.findForReview(10)).thenReturn(Optional.empty());case "post-decided"->f.p.setStatus(PostStatus.REJECTED);case "revision"->f.p.setSubmissionRevision(1);}return null;});
            if(race.equals("off-during-media"))when(f.media.findByPost_PostIdOrderByMediaIdAsc(10)).thenReturn(List.of(PostMedia.builder().mediaId(8).build()));
            f.s.processNext();assertNull(f.j.getDecision());assertEquals(race.equals("post-decided")?PostStatus.REJECTED:PostStatus.PENDING,f.p.getStatus());if(race.equals("off-during-media"))assertEquals(State.FAILED,f.j.getState());
        });
        add("CommunityAutoModeration.finish","Normal","OFF_TOPIC finding has filename","Change guidance includes filename",()->{F f=new F(CommunityAutoModeration.Mode.AUTO,true);when(f.scanner.scan(anyString(),isNull())).thenReturn(new ScanFinding("OFF_TOPIC",8,"photo.png",null));f.s.processNext();assertTrue(f.j.getDecisionNote().contains("photo.png"));});
        return cases;
    }
}

