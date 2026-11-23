package org.hlrcs.service;
import org.hlrcs.controller.*;
import org.hlrcs.dto.request.*;
import org.hlrcs.dto.response.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.entity.enums.MediaType;
import org.junit.jupiter.api.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Direct controller units cover delegation/response construction. Security annotations need HTTP tests. */
class CommunityControllerUnitTest extends CommunityUnitSupport {
    @TestFactory List<DynamicTest> controllerCases(){
        for(String method:List.of("feed","myFeed","myCount","feedPost","myFeedPost","published","mine","submit","resubmit","submitWithImages","resubmitWithImages","image","video","delete","oversizedImages"))add("CommunityController."+method,"Normal","valid arguments; mocked service","Forward exact arguments; preserve envelope/data or media headers/status",()->{
            var s=mock(CommunityService.class);var images=mock(CommunityImageService.class);var feed=mock(CommunityFeedService.class);var c=new CommunityController(s,images,feed);var req=request();byte[] bytes={1,2,3};
            switch(method){case "feed"->{var page=new CommunityFeedService.Page(List.of(),null,false,Map.of());when(feed.page(false,"ALL","q","all","oldest","cursor")).thenReturn(page);assertSame(page,c.feed("ALL","q","all","oldest","cursor").getData());}
                case "myFeed"->{c.myFeed("ALL","q","all","oldest","cursor");verify(feed).page(true,"ALL","q","all","oldest","cursor");}case "myCount"->{when(feed.mineCount()).thenReturn(9L);assertEquals(9L,c.myCount().getData());}case "feedPost"->{c.feedPost(10);verify(feed).one(10,false);}case "myFeedPost"->{c.myFeedPost(10);verify(feed).one(10,true);}case "published"->{assertTrue(c.published().isSuccess());verify(s).published();}case "mine"->{c.mine();verify(s).mine();}case "submit"->{assertTrue(c.submit(req).isSuccess());verify(s).submit(req);}case "resubmit"->{c.resubmit(10,req);verify(s).resubmit(10,req);}case "submitWithImages"->{c.submitWithImages(req,null,null);verify(s).submit(req,null,null);}case "resubmitWithImages"->{c.resubmitWithImages(10,req,List.of(),List.of());verify(s).resubmit(10,req,List.of(),List.of());}case "image"->{when(images.image(10,8)).thenReturn(new CommunityImageService.ImageContent(bytes,"image/png","a.png"));var r=c.image(10,8);assertArrayEquals(bytes,r.getBody());assertEquals("private, no-store",r.getHeaders().getFirst("Cache-Control"));assertEquals("nosniff",r.getHeaders().getFirst("X-Content-Type-Options"));assertEquals("image/png",r.getHeaders().getContentType().toString());}case "video"->{when(images.content(10,8,MediaType.VIDEO)).thenReturn(new CommunityImageService.ImageContent(bytes,"video/mp4","a.mp4"));var r=c.video(10,8);assertArrayEquals(bytes,r.getBody().getContentAsByteArray());assertEquals("video/mp4",r.getHeaders().getContentType().toString());assertEquals("private, no-store",r.getHeaders().getFirst("Cache-Control"));}case "delete"->{assertNull(c.delete(10).getData());verify(s).delete(10);}case "oversizedImages"->{var r=c.oversizedImages();assertEquals(413,r.getStatusCode().value());assertFalse(r.getBody().isSuccess());assertEquals(2,r.getBody().getData().size());}}
        });
        for(String method:List.of("invalidParameter","list","create","replies","reply","update","delete"))add("CommunityCommentController."+method,"Normal","post=10; comment=20; page=2; size=5","Forward exact arguments and construct success/error response",()->{
            var s=mock(CommunityCommentService.class);var c=new CommunityCommentController(s);var req=new CommunityCommentRequest("content");switch(method){case "invalidParameter"->{var r=c.invalidParameter();assertEquals(400,r.getStatusCode().value());assertFalse(r.getBody().isSuccess());}case "list"->{c.list(10,2,5);verify(s).list(10,2,5);}case "create"->{c.create(10,req);verify(s).create(10,req);}case "replies"->{c.replies(10,20,2,5);verify(s).replies(10,20,2,5);}case "reply"->{c.reply(10,20,req);verify(s).reply(10,20,req);}case "update"->{c.update(10,20,req);verify(s).update(10,20,req);}case "delete"->{assertNull(c.delete(10,20).getData());verify(s).delete(10,20);}}
        });
        for(String method:List.of("autoModerationSettings","changeAutoModeration","list","detail","review"))add("CommunityModerationController."+method,"Normal","valid request; mode=AUTO","Exact delegation; success response",()->{
            var s=mock(CommunityService.class);var a=mock(CommunityAutoModeration.class);var c=new CommunityModerationController(s,a);switch(method){case "autoModerationSettings"->{c.autoModerationSettings();verify(a).settings();}case "changeAutoModeration"->{c.changeAutoModeration(new CommunityModerationController.ModeRequest(CommunityAutoModeration.Mode.AUTO));verify(a).changeMode(CommunityAutoModeration.Mode.AUTO);}case "list"->{c.list();verify(s).moderationList();}case "detail"->{c.detail(10);verify(s).detail(10);}case "review"->{var r=new CommunityReviewRequest("APPROVE",null,0);c.review(10,r);verify(s).review(10,r);}}
        });
        for(String method:List.of("submit-null","submit-list","mine","queue","detail","resolve","evidence"))add("CommunityReportController."+(method.startsWith("submit")?"submit":method),"Normal",method,"Null evidence normalized to empty; preserve payload, headers and exact delegation",()->{
            var s=mock(CommunityReportService.class);var c=new CommunityReportController(s);switch(method){case "submit-null","submit-list"->{var req=new CommunityReportRequest(CommunityReportReason.SPAM,"details");List<MultipartFile> files=method.equals("submit-null")?null:List.of(mock(MultipartFile.class));c.submit(10,req,files);verify(s).submit(10,req,files==null?List.of():files);}case "mine"->{c.mine(2);verify(s).mine(2);}case "queue"->{c.queue("OPEN",2);verify(s).queue("OPEN",2);}case "detail"->{c.detail(30);verify(s).detail(30);}case "resolve"->{var req=new CommunityReportDecision(CommunityReportDecision.Action.DISMISS,"reason");c.resolve(30,req);verify(s).resolve(30,req);}case "evidence"->{byte[] bytes={1};when(s.evidence(30)).thenReturn(CommunityReportEvidence.builder().contentType("image/png").fileContent(bytes).build());var r=c.evidence(30);assertArrayEquals(bytes,r.getBody());assertEquals("no-store",r.getHeaders().getFirst("Cache-Control"));assertEquals("nosniff",r.getHeaders().getFirst("X-Content-Type-Options"));}}
        });
        return cases;
    }
}
