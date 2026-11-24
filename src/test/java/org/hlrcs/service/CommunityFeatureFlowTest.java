package org.hlrcs.service;

import org.hlrcs.dto.request.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.entity.CommunityScan.State;
import org.hlrcs.repository.*;
import org.junit.jupiter.api.DynamicTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.mock.web.MockMultipartFile;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Business-level flows with complete, reproducible input metadata for the matrix. */
class CommunityFeatureFlowTest extends CommunityUnitSupport {
    static Map<String,Object> postInput(){
        var v=new LinkedHashMap<String,Object>();
        v.put("caller","userId=1; role=USER; status=ACTIVE");
        v.put("type","ROOMMATE");v.put("title","Community title");v.put("content","Community content");
        v.put("price","1000 VND");v.put("location","Tan Xa");v.put("authorName","Contact");v.put("authorPhone","0912345678");
        v.put("facebookUrl","null");v.put("zaloUrl","null");v.put("contentFormat","null");
        v.put("retainedImageIds","null");v.put("retainedVideoIds","null");v.put("photos","[]");v.put("videos","[]");return v;
    }
    List<DynamicTest> featureFlows(){
        for(boolean free:List.of(false,true)){
            var input=postInput();if(free){input.put("type","SECOND_HAND");input.put("price","0 VND");}
            detailed("Đăng bài",free?"Alternative":"Normal","CommunityService.submit",free?"Tặng đồ cũ miễn phí thành công":"Đăng bài tìm người ở ghép thành công",input,
                "post.id=10; authorId=1; type="+(free?"SECOND_HAND":"ROOMMATE")+"; price="+(free?0:1000)+"; status=PENDING; giữ nguyên nội dung/liên hệ; saveAndFlush và enqueue đúng một lần",()->{
                var f=new CommunityServiceUnitTest.F();var pub=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(pub);
                var req=free?request(Map.of("type","SECOND_HAND","price",BigDecimal.ZERO)):request();var r=f.s.submit(req,List.of(),List.of());
                assertEquals(10,r.id());assertEquals(1,r.authorId());assertEquals(req.type(),r.type());assertEquals(req.price(),r.price());assertEquals(req.title(),r.title());assertEquals(req.content(),r.content());assertEquals(req.authorPhone(),r.authorPhone());assertEquals("PENDING",r.status());
                verify(f.posts).saveAndFlush(any());verify(f.auto).enqueue(any());verify(pub).publishEvent(isA(CommunityRealtimeEvent.class));
            });
        }
        for(boolean media:List.of(false,true)){
            var input=postInput();input.put("post","id=10; authorId=1; status=NEED_CHANGES; revision=0; title=Community title");input.put("title",media?"Community title":"Đã sửa tiêu đề bài viết");input.put("reviewer","id=2; note=revise");
            if(media)input.put("photos","[MockMultipartFile(a.png,image/png,PNG 1x1)] — image service mocked at this orchestration boundary");
            detailed("Chỉnh sửa và gửi lại",media?"Alternative":"Normal","CommunityService.resubmit",media?"Gửi lại bằng cách thêm ảnh, giữ nguyên văn bản":"Chủ bài sửa tiêu đề và gửi lại",input,
                "id=10 giữ nguyên; status=PENDING; revision=1; reviewer/reviewNote/reviewedAt=null; enqueue một lần; chuyển đúng danh sách photos sang image service",()->{
                var f=new CommunityServiceUnitTest.F();f.p.setStatus(PostStatus.NEED_CHANGES);f.p.setReviewer(user(2,UserRole.STAFF));f.p.setReviewNote("revise");
                var photos=media?List.<org.springframework.web.multipart.MultipartFile>of(new MockMultipartFile("photos","a.png","image/png",CommunityMediaUnitTest.image("png",1,1))):List.<org.springframework.web.multipart.MultipartFile>of();
                var r=f.s.resubmit(10,media?request():request(Map.of("title","Đã sửa tiêu đề bài viết")),photos,List.of());
                assertEquals(10,r.id());assertEquals("PENDING",r.status());assertEquals(1,f.p.revision());assertNull(f.p.getReviewer());assertNull(f.p.getReviewNote());assertNull(f.p.getReviewedAt());verify(f.auto).enqueue(f.p);verify(f.images).replace(f.p,null,photos);
            });
        }
        for(boolean approved:List.of(false,true))detailed("Xóa bài",approved?"Alternative":"Normal","CommunityService.delete",approved?"Chủ bài xóa bài đã công khai":"Chủ bài xóa bài đang chờ duyệt",
            Map.of("caller","id=1; USER; ACTIVE","postId",10,"post","authorId=1; status="+(approved?"APPROVED":"PENDING"),"dependencies","comment/media/detail/scan repository operations mocked"),
            "Xóa comment, media, ba loại detail và scan theo postId=10; delete(post), flush; phát invalidation post/report",()->{
            var f=new CommunityServiceUnitTest.F();if(approved)f.p.setStatus(PostStatus.APPROVED);var pub=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(pub);f.s.delete(10);
            verify(f.posts).deleteCommentsForPost(10);verify(f.posts).deleteMediaForPost(10);verify(f.posts).deleteRoommateDetailForPost(10);verify(f.posts).deleteRoomTransferDetailForPost(10);verify(f.posts).deleteItemDetailForPost(10);verify(f.scans).deleteForPost(10);verify(f.posts).delete(f.p);verify(f.posts).flush();verify(pub,times(2)).publishEvent(isA(CommunityRealtimeEvent.class));
        });
        for(boolean mine:List.of(false,true))detailed("Xem và tìm kiếm bài",mine?"Alternative":"Normal","CommunityFeedService.one",mine?"Chủ bài xem bài chưa công khai trong mục của tôi":"Khách xem chi tiết bài đã duyệt",
            Map.of("id",10,"mine",mine,"caller",mine?"id=1; USER; ACTIVE":"public viewer","post","id=10; authorId=1; type=ROOMMATE; status="+(mine?"PENDING":"APPROVED"),"title","Community title","content","Community content","price",1000,"location","Tan Xa"),
            "Trả bài id=10; đúng title và status; gọi community.responses([post],"+mine+")",()->{var f=new CommunityFeedServiceUnitTest.F();f.p.setStatus(mine?PostStatus.PENDING:PostStatus.APPROVED);var r=f.s.one(10,mine);assertEquals(10,r.id());assertEquals("Community title",r.title());assertEquals(mine?"PENDING":"APPROVED",r.status());verify(f.community).responses(List.of(f.p),mine);});
        for(boolean reject:List.of(false,true))detailed("Kiểm duyệt bài",reject?"Alternative":"Normal","CommunityService.review",reject?"Nhân viên từ chối bài kèm lý do":"Nhân viên phê duyệt bài đang chờ",
            Map.of("caller","id=2; STAFF; ACTIVE","post","id=10; authorId=1; status=PENDING; revision=0","decision",reject?"REJECT":"APPROVE","revision",0,"note",reject?"Nội dung không phù hợp":""),
            "post.status="+(reject?"REJECTED":"APPROVED")+"; reviewer.id=2; reviewedAt khác null; lưu audit và phát thông báo cho tác giả",()->{
            var f=new CommunityServiceUnitTest.F();when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.STAFF));var pub=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(pub);var r=f.s.review(10,new CommunityReviewRequest(reject?"REJECT":"APPROVE",reject?"Nội dung không phù hợp":"",0));assertEquals(reject?"REJECTED":"APPROVED",r.post().status());assertEquals(2,f.p.getReviewer().getUserId());assertNotNull(f.p.getReviewedAt());verify(f.logs).saveAndFlush(argThat(l->l.getTargetId()==10&&l.getAction().equals(reject?"REJECTED":"APPROVED")));verify(pub).publishEvent(isA(CommunityNotificationEvent.class));
        });
        for(boolean owner:List.of(false,true))detailed("Bình luận",owner?"Alternative":"Normal","CommunityCommentService.create",owner?"Chủ bài tự bình luận, không tự gửi thông báo":"Người khác bình luận và thông báo chủ bài",
            Map.of("caller","id="+(owner?1:2)+"; USER; ACTIVE","post","id=10; authorId=1; status=APPROVED","request.content","Phòng còn trống không?","save fixture","saveAndFlush assigns commentId=20"),
            "comment.id=20; postId=10; authorId="+(owner?1:2)+"; content đúng request; parentId=null; số notification="+(owner?0:1)+"; một realtime event",()->{
            var f=new CommunityCommentServiceUnitTest.F();when(f.auth.getCurrentUser()).thenReturn(user(owner?1:2,UserRole.USER));var pub=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(pub);var r=f.s.create(10,new CommunityCommentRequest("Phòng còn trống không?"));assertEquals(20,r.id());assertEquals(10,r.postId());assertEquals(owner?1:2,r.authorId());assertEquals("Phòng còn trống không?",r.content());assertNull(r.parentId());verify(pub,times(owner?0:1)).publishEvent(isA(CommunityNotificationEvent.class));verify(pub).publishEvent(isA(CommunityRealtimeEvent.class));
        });
        for(boolean child:List.of(false,true))detailed("Phản hồi bình luận",child?"Alternative":"Normal","CommunityCommentService.reply",child?"Trả lời một phản hồi, vẫn gắn vào bình luận gốc":"Trả lời bình luận gốc",
            Map.of("caller","id=3; USER; ACTIVE","post","id=10; authorId=1; status=APPROVED","target","commentId=20; authorId=2; parentId="+(child?19:"null"),"root fixture","commentId=19 exists if replying to a child","request.content","Mình muốn xem phòng vào chiều mai"),
            "response.id=20 (mock save ID); parentId="+(child?19:20)+"; replyToId=20; authorId=3; gửi hai notification tới targetAuthor=2 và postAuthor=1",()->{
            var f=new CommunityCommentServiceUnitTest.F();when(f.auth.getCurrentUser()).thenReturn(user(3,UserRole.USER));f.c.setAuthor(user(2,UserRole.USER));if(child){f.c.setParentCommentId(19);when(f.comments.findByCommentIdAndPost_PostId(19,10)).thenReturn(Optional.of(Comment.builder().commentId(19).post(f.p).author(f.p.getAuthor()).build()));}var pub=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(pub);var r=f.s.reply(10,20,new CommunityCommentRequest("Mình muốn xem phòng vào chiều mai"));assertEquals(child?19:20,r.parentId());assertEquals(20,r.replyToId());assertEquals(3,r.authorId());verify(pub,times(2)).publishEvent(isA(CommunityNotificationEvent.class));
        });
        for(boolean other:List.of(false,true))detailed("Báo cáo vi phạm",other?"Alternative":"Normal","CommunityReportService.submit",other?"Báo cáo lý do khác có mô tả":"Người dùng báo cáo spam thành công",
            Map.of("caller","id=2; USER; ACTIVE","post","id=10; authorId=1; status=APPROVED; title=Community title","reason",other?"OTHER":"SPAM","details",other?"Bài đăng sử dụng thông tin của tôi":"Đăng lặp lại nội dung quảng cáo","attachments","[]","duplicate lookup","[]","save fixture","reportId=30"),
            "receipt.id=30; postTitle=Community title; lưu report OPEN, reporter.id=2, đúng reason/details; phát CommunityReportSubmitted",()->{
            var f=new CommunityReportServiceUnitTest.F();f.actor.setRole(UserRole.USER);var pub=mock(ApplicationEventPublisher.class);f.s.notificationPublisher(pub);String details=other?"Bài đăng sử dụng thông tin của tôi":"Đăng lặp lại nội dung quảng cáo";var reason=other?CommunityReportReason.OTHER:CommunityReportReason.SPAM;var r=f.s.submit(10,new CommunityReportRequest(reason,details),List.of());assertEquals(30,r.id());assertEquals("Community title",r.postTitle());verify(f.reports).saveAndFlush(argThat(x->x.getStatus()==ReportStatus.OPEN&&x.getReporter().getUserId()==2&&x.getReason().equals(details)&&x.getReasonCode().equals(reason.name())));verify(pub).publishEvent(isA(CommunityReportSubmitted.class));
        });
        for(boolean dismiss:List.of(false,true))detailed("Xử lý báo cáo",dismiss?"Alternative":"Normal","CommunityReportService.resolve",dismiss?"Admin bác báo cáo và giữ nguyên bài":"Admin ẩn bài bị báo cáo",
            Map.of("caller","id=2; ADMIN; ACTIVE","post","id=10; status=APPROVED","report","id=30; targetId=10; status=OPEN","action",dismiss?"DISMISS":"HIDE_POST","reason","Đã kiểm tra nội dung và bằng chứng"),
            "report.status="+(dismiss?"DISMISSED":"RESOLVED")+"; post.status="+(dismiss?"APPROVED":"HIDDEN")+"; handler.id=2; lưu lý do, thời gian, audit; phát realtime",()->{
            var f=new CommunityReportServiceUnitTest.F();var r=f.s.resolve(30,new CommunityReportDecision(dismiss?CommunityReportDecision.Action.DISMISS:CommunityReportDecision.Action.HIDE_POST,"Đã kiểm tra nội dung và bằng chứng"));assertEquals(dismiss?ReportStatus.DISMISSED:ReportStatus.RESOLVED,f.r.getStatus());assertEquals(dismiss?PostStatus.APPROVED:PostStatus.HIDDEN,f.p.getStatus());assertEquals(2,f.r.getHandler().getUserId());assertNotNull(f.r.getResolvedAt());assertEquals("Đã kiểm tra nội dung và bằng chứng",r.resolutionNote());verify(f.logs,times(dismiss?1:2)).save(any());
        });
        for(boolean assist:List.of(false,true))detailed("Tự kiểm duyệt AI",assist?"Alternative":"Normal","CommunityAutoModeration.processNext",assist?"ASSIST ghi kết quả sạch, vẫn chờ nhân viên duyệt":"AUTO duyệt bài khi nội dung và media sạch",
            Map.of("mode",assist?"ASSIST":"AUTO","configured",true,"post","id=10; status=PENDING; revision=0","job","id=1; postId=10; revision=0; state=QUEUED; autoEligible=true","media","[]","scanner.scan(context,null)","null = CLEAR","latestPostId","null = no backlog"),
            "job.state=CLEAR; finishedAt khác null; findings=[]; post.status="+(assist?"PENDING":"APPROVED")+"; decision="+(assist?"null":"APPROVED"),()->{
            var f=new CommunityAutoModerationUnitTest.F(assist?CommunityAutoModeration.Mode.ASSIST:CommunityAutoModeration.Mode.AUTO,true);f.s.processNext();assertEquals(State.CLEAR,f.j.getState());assertNotNull(f.j.getFinishedAt());assertEquals("[]",f.j.getFindings());assertEquals(assist?PostStatus.PENDING:PostStatus.APPROVED,f.p.getStatus());assertEquals(assist?null:PostStatus.APPROVED,f.j.getDecision());
        });
        for(boolean uncertain:List.of(false,true))detailed("AI hỗ trợ báo cáo",uncertain?"Alternative":"Normal","CommunityReportAssistant.runNext",uncertain?"Cáo buộc FRAUD cần admin xác minh dù AI thấy bài bình thường":"AI hoàn tất phân tích, gợi ý giữ bài",
            Map.of("enabled",true,"configured",true,"caller","id=2; ADMIN; ACTIVE","post","id=10; status=APPROVED; revision=0; title=Community title; description=Community content; price=1000; location=Tan Xa","report","id=30; postId=10; status=OPEN; reasonCode="+(uncertain?"FRAUD":"INAPPROPRIATE")+"; reason=allegation","job","id=30; state=QUEUED; generation=1","attachments","[]","scanner.assessReport","assessment=NO_VISIBLE_VIOLATION; rule=NO_VISIBLE_VIOLATION; explanation=Test finding; postQuote/postQuote2/reportQuote empty"),
            "job.state=READY; completedChecks=1; totalChecks=1; recommendation="+(uncertain?"ADMIN_REVIEW":"SUGGEST_KEEP")+"; post vẫn APPROVED, report vẫn OPEN; không gọi reports.save",()->{
            try(var f=new CommunityReportAssistantMatrixTest.F(true,true)){if(uncertain)f.r.setReasonCode("FRAUD");when(f.scanner.assessReport(anyString(),any())).thenReturn(CommunityReportAssistantMatrixTest.verdict("NO_VISIBLE_VIOLATION","NO_VISIBLE_VIOLATION","","",""));f.s.runNext();assertEquals(CommunityReportAnalysis.State.READY,f.j.getState());assertEquals(1,f.j.getCompletedChecks());assertEquals(1,f.j.getTotalChecks());assertEquals(uncertain?"ADMIN_REVIEW":"SUGGEST_KEEP",f.j.getRecommendation());assertEquals(PostStatus.APPROVED,f.p.getStatus());assertEquals(ReportStatus.OPEN,f.r.getStatus());verify(f.reports,never()).save(any());}
        });
        for(boolean unread:List.of(false,true))detailed("Thông báo",unread?"Alternative":"Normal","CommunityNotificationService.inbox",unread?"Lọc riêng thông báo chưa đọc":"Mở hộp thông báo của tài khoản",
            Map.of("caller","id=1; USER; ACTIVE","page",0,"unreadOnly",unread,"repository slice","notificationId=30; recipientId=1; postId=10; kind=COMMENT; postTitle=Title; read=false; hasNext=false","unreadCount",3),
            "items.size=1; items[0].notificationId=30; kind=COMMENT; read=false; unreadCount=3; hasNext=false; query đúng recipient=1",()->{
            var f=new CommunityNotificationMatrixTest.F();var slice=new SliceImpl<>(List.of(f.n));when(f.notices.findByRecipient_UserId(eq(1),any())).thenReturn(slice);when(f.notices.findByRecipient_UserIdAndReadFalse(eq(1),any())).thenReturn(slice);when(f.notices.countByRecipient_UserIdAndReadFalse(1)).thenReturn(3L);var r=f.s.inbox(0,unread);assertEquals(1,r.items().size());assertEquals(30,r.items().get(0).notificationId());assertEquals("COMMENT",r.items().get(0).kind());assertFalse(r.items().get(0).read());assertEquals(3,r.unreadCount());assertFalse(r.hasNext());if(unread)verify(f.notices).findByRecipient_UserIdAndReadFalse(eq(1),any());else verify(f.notices).findByRecipient_UserId(eq(1),any());
        });
        for(boolean own:List.of(false,true))detailed("Cập nhật realtime",own?"Alternative":"Normal","CommunityRealtimeService.changed",own?"Thông báo riêng chỉ gửi đúng người nhận":"Thay đổi bình luận gửi tới người xem công khai",
            Map.of("connected clients","one USER id=1; JWT=token; validateToken=true; DB user ACTIVE/USER","event",own?"type=notifications; recipientId=1; postId=null; publicAudience=false":"type=comments; postId=10; publicAudience=true","executor","synchronous mock; SSE transport mocked by unit boundary"),
            "Gửi đúng một sender task cho client hợp lệ; client vẫn còn kết nối; không đóng kết nối",()->{
            try(var f=new CommunityRealtimeMatrixTest.F()){f.s.connect(1,UserRole.USER,"token");clearInvocations(f.sender);f.s.changed(own?CommunityRealtimeEvent.notifications(1):CommunityRealtimeEvent.comments(10));verify(f.sender).execute(any());assertEquals(1,f.clients().size());}
        });
        return cases;
    }
}
