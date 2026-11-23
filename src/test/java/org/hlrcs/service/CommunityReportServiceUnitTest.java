package org.hlrcs.service;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.dto.request.*;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.mock.web.MockMultipartFile;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityReportServiceUnitTest extends CommunityUnitSupport {
    static class F {
        ReportRepository reports=mock(ReportRepository.class);CommunityReportEvidenceRepository evidence=mock(CommunityReportEvidenceRepository.class);
        PostRepository posts=mock(PostRepository.class);ModerationLogRepository logs=mock(ModerationLogRepository.class);CommunityService community=mock(CommunityService.class);AuthService auth=mock(AuthService.class);
        CommunityReportService s=new CommunityReportService(reports,evidence,posts,logs,community,auth);Post p=post();User actor=user(2,UserRole.ADMIN);
        Report r=Report.builder().reportId(30).targetType(ReportTargetType.POST).targetId(10).reporter(user(3,UserRole.USER)).postTitle("Stored title").reasonCode("SPAM").reason("Details").status(ReportStatus.OPEN).build();
        F(){p.setStatus(PostStatus.APPROVED);when(auth.getCurrentUser()).thenReturn(actor);when(posts.findForReview(10)).thenReturn(Optional.of(p));when(posts.findById(10)).thenReturn(Optional.of(p));
            when(reports.findByReportIdAndTargetType(30,ReportTargetType.POST)).thenReturn(Optional.of(r));when(reports.findTargetId(30,ReportTargetType.POST)).thenReturn(Optional.of(10));
            when(reports.lockForTarget(ReportTargetType.POST,10)).thenReturn(List.of(r));when(reports.findByTargetTypeAndTargetId(ReportTargetType.POST,10)).thenReturn(List.of(r));
            when(reports.saveAndFlush(any())).thenAnswer(i->{Report x=i.getArgument(0);x.setReportId(30);return x;});}
    }
    @TestFactory List<DynamicTest> reportCases(){
        for(CommunityReportReason reason:CommunityReportReason.values())for(String details:Arrays.asList(null,"","explanation"))add("CommunityReportService.submit","Normal","reason="+reason+", details="+details,"OTHER requires nonblank details; other reasons accept absent details; persist OPEN",()->{
            F f=new F();if(reason==CommunityReportReason.OTHER&&(details==null||details.isEmpty()))status(400,()->f.s.submit(10,new CommunityReportRequest(reason,details),List.of()));
            else{var r=f.s.submit(10,new CommunityReportRequest(reason,details),List.of());assertEquals(30,r.id());verify(f.reports).saveAndFlush(argThat(x->x.getStatus()==ReportStatus.OPEN&&x.getReporter()==f.actor&&x.getReasonCode().equals(reason.name())));}
        });
        for(String c:List.of("inactive","self","missing","not-approved","duplicate","too-many-evidence"))add("CommunityReportService.submit","Abnormal",c,"Reject forbidden, missing, duplicate or excessive evidence without writing",()->{
            F f=new F();int code=400;List<MultipartFile> files=List.of();switch(c){case "inactive"->{f.actor.setStatus(UserStatus.INACTIVE);code=403;}case "self"->{f.p.setAuthor(f.actor);code=403;}case "missing"->{when(f.posts.findForReview(10)).thenReturn(Optional.empty());code=404;}case "not-approved"->{f.p.setStatus(PostStatus.HIDDEN);code=404;}case "duplicate"->{when(f.reports.lockByReporter(ReportTargetType.POST,10,2)).thenReturn(List.of(f.r));code=409;}case "too-many-evidence"->files=List.of(mock(MultipartFile.class),mock(MultipartFile.class));}
            var uploads=files;status(code,()->f.s.submit(10,new CommunityReportRequest(CommunityReportReason.SPAM,null),uploads));verify(f.reports,never()).saveAndFlush(any());
        });
        add("CommunityReportService.submit","Normal","one valid PNG evidence","Validate and save evidence linked to new report",()->{
            F f=new F();var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(1,1,1),"png",out);
            f.s.submit(10,new CommunityReportRequest(CommunityReportReason.SPAM," detail "),List.of(new MockMultipartFile("evidence","a.png","image/png",out.toByteArray())));verify(f.evidence).save(argThat(x->x.getReport().getReportId()==30&&x.getContentType().equals("image/png")));});
        for(int page:List.of(-1,0,1))add("CommunityReportService.mine","Boundary","page="+page,"Negative page rejected; valid page returns caller reports",()->{F f=new F();when(f.reports.findByTargetTypeAndReporter_UserId(eq(ReportTargetType.POST),eq(2),any())).thenReturn(new PageImpl<>(List.of(f.r)));if(page<0)status(400,()->f.s.mine(page));else assertEquals(30,f.s.mine(page).content().get(0).id());});
        for(String filter:List.of("ALL","OPEN","RESOLVED","DISMISSED","BAD"))add("CommunityReportService.queue","Normal","status filter="+filter,"Correct status grouping; invalid filter =>400",()->{
            F f=new F();var group=mock(ReportRepository.PostReportGroup.class);when(group.getPostId()).thenReturn(10);when(group.getSelectedReportId()).thenReturn(30);when(group.getReportCount()).thenReturn(3L);when(group.getOpenCount()).thenReturn(2L);
            when(f.reports.groupByPost(eq(ReportTargetType.POST),anyCollection(),anyCollection(),any())).thenReturn(new PageImpl<>(List.of(group)));when(f.reports.findAllById(any())).thenReturn(List.of(f.r));
            if(filter.equals("BAD"))status(400,()->f.s.queue(filter,0));else{var r=f.s.queue(filter,0).content().get(0);assertEquals("Stored title",r.postTitle());assertEquals(3,r.reportCount());assertEquals(2,r.openCount());}
        });
        add("CommunityReportService.queue","Boundary","page=-1","400",()->status(400,()->new F().s.queue("ALL",-1)));
        for(UserRole role:UserRole.values())add("CommunityReportService.admin","Abnormal","role="+role,"Only active ADMIN may inspect/resolve reports",()->{F f=new F();f.actor.setRole(role);if(role!=UserRole.ADMIN)status(403,()->f.s.detail(30));else assertEquals(30,f.s.detail(30).report().id());});
        for(ReportStatus st:ReportStatus.values())for(boolean postExists:List.of(false,true))add("CommunityReportService.detail","Normal","report status="+st+", post exists="+postExists,"Map open aliases, nullable post/handler, evidence and sorted related reports",()->{
            F f=new F();f.r.setStatus(st);if(!postExists)when(f.posts.findById(10)).thenReturn(Optional.empty());else f.r.setHandler(f.actor);
            var d=f.s.detail(30);assertEquals(st==ReportStatus.PENDING?ReportStatus.OPEN:st,d.report().status());assertEquals(postExists?"Actor 2":null,d.handler());assertEquals(1,d.relatedReports().size());
        });
        for(String method:List.of("detail","evidence","resolve"))add("CommunityReportService."+method,"Abnormal","report missing","404",()->{F f=new F();when(f.reports.findByReportIdAndTargetType(30,ReportTargetType.POST)).thenReturn(Optional.empty());when(f.reports.findTargetId(30,ReportTargetType.POST)).thenReturn(Optional.empty());status(404,()->{if(method.equals("detail"))f.s.detail(30);else if(method.equals("evidence"))f.s.evidence(30);else f.s.resolve(30,new CommunityReportDecision(CommunityReportDecision.Action.DISMISS,"reason"));});});
        for(boolean exists:List.of(false,true))add("CommunityReportService.evidence","Normal","image exists="+exists,"Return exact evidence or 404",()->{F f=new F();var img=CommunityReportEvidence.builder().fileName("e.png").build();when(f.evidence.findById(30)).thenReturn(exists?Optional.of(img):Optional.empty());if(exists)assertSame(img,f.s.evidence(30));else status(404,()->f.s.evidence(30));});
        for(CommunityReportDecision.Action action:CommunityReportDecision.Action.values())for(String state:List.of("approved","hidden","deleted"))for(ReportStatus reportStatus:ReportStatus.values())add("CommunityReportService.resolve","Normal","action="+action+", post="+state+", report="+reportStatus,"Only open reports; hide requires public post; dismiss permits deleted post; close open siblings and audit",()->{
            F f=new F();f.r.setStatus(reportStatus);if(state.equals("hidden"))f.p.setStatus(PostStatus.HIDDEN);if(state.equals("deleted"))when(f.posts.findForReview(10)).thenReturn(Optional.empty());
            var sibling=Report.builder().reportId(31).reporter(f.actor).status(ReportStatus.PENDING).build();var closed=Report.builder().reportId(32).reporter(f.actor).status(ReportStatus.RESOLVED).build();when(f.reports.lockForTarget(ReportTargetType.POST,10)).thenReturn(List.of(f.r,sibling,closed));
            var req=new CommunityReportDecision(action," resolution ");boolean valid=(reportStatus==ReportStatus.OPEN||reportStatus==ReportStatus.PENDING)&&(action==CommunityReportDecision.Action.DISMISS||state.equals("approved"));
            if(!valid){status(409,()->f.s.resolve(30,req));verifyNoInteractions(f.logs);}else{var d=f.s.resolve(30,req);var expected=action==CommunityReportDecision.Action.HIDE_POST?ReportStatus.RESOLVED:ReportStatus.DISMISSED;assertEquals(expected,f.r.getStatus());assertEquals(expected,sibling.getStatus());assertEquals(ReportStatus.RESOLVED,closed.getStatus());assertEquals("resolution",d.resolutionNote());assertSame(f.actor,f.r.getHandler());assertNotNull(f.r.getResolvedAt());assertEquals(32,d.relatedReports().get(0).id());verify(f.logs,times(action==CommunityReportDecision.Action.HIDE_POST?3:2)).save(any());}
        });
        add("CommunityReportService.resolve","Abnormal","target lookup exists but locked report disappeared","404",()->{F f=new F();when(f.reports.lockForTarget(ReportTargetType.POST,10)).thenReturn(List.of());status(404,()->f.s.resolve(30,new CommunityReportDecision(CommunityReportDecision.Action.DISMISS,"reason")));});
        return cases;
    }
}
