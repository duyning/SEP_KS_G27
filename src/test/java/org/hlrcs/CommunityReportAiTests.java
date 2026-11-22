package org.hlrcs;

import org.hlrcs.entity.CommunityReportAnalysis;
import org.hlrcs.entity.CommunityReportAnalysis.State;
import org.hlrcs.repository.*;
import org.hlrcs.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:community-report-ai;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "community.report-ai.enabled=true", "community.report-ai.poll-ms=3600000"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class CommunityReportAiTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired CommunityReportAssistant assistant;
    @Autowired CommunityReportAnalysisRepository analyses;
    @Autowired PostRepository posts;
    @Autowired ReportRepository reports;
    @Autowired PostMediaRepository media;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean GeminiCommunityScanner scanner;
    private String author, reporter, staff, admin;
    private static final String BASE="/api/admin/community/reports";

    @BeforeEach void actors() throws Exception {
        analyses.deleteAll(); reset(scanner); when(scanner.configured()).thenReturn(true); when(scanner.modelName()).thenReturn("test-model");
        when(scanner.assessReport(anyString(), any())).thenAnswer(call -> clear());
        author=register(); reporter=register(); staff=login("staff@hlrcs.com","123456"); admin=login("admin@hlrcs.com","admin123");
    }
    @Test void queuesAutomaticallyAndOnlySuggestsWithoutChangingBusinessState() throws Exception {
        int post=post();
        media.save(org.hlrcs.entity.PostMedia.builder().post(posts.findById(post).orElseThrow())
                .mediaType(org.hlrcs.entity.enums.MediaType.IMAGE).mediaUrl("test-image").fileName("post.png")
                .contentType("image/png").fileContent(new byte[]{1,2,3}).build());
        media.save(org.hlrcs.entity.PostMedia.builder().post(posts.findById(post).orElseThrow())
                .mediaType(org.hlrcs.entity.enums.MediaType.VIDEO).mediaUrl("test-video").fileName("post.mp4")
                .contentType("video/mp4").fileContent(new byte[]{1,2,3}).build());
        int report=report(post,reporter,"INAPPROPRIATE","Nội dung cần được kiểm tra lại.",true);
        assertEquals(State.QUEUED, analyses.findById(report).orElseThrow().getState());
        api("GET", BASE+"/"+report+"/ai", null, null, 401);
        api("GET", BASE+"/"+report+"/ai", reporter, null, 403);
        api("POST", BASE+"/"+report+"/ai", staff, null, 403);
        api("POST", BASE+"/"+report+"/ai", admin, null, 409);
        assistant.runNext();
        var result=api("GET", BASE+"/"+report+"/ai",admin,null,200);
        assertEquals("SUGGEST_KEEP",result.path("recommendation").asString());
        assertEquals("REPORT_ASSIST_V1",result.path("rulesVersion").asString());
        assertEquals(4, result.path("items").get(0).path("completedChecks").asInt());
        assertEquals(4, result.path("items").get(0).path("findings").size());
        assertEquals("REPORT_EVIDENCE", result.path("items").get(0).path("findings").get(3).path("source").asString());
        assertEquals(org.hlrcs.entity.enums.PostStatus.APPROVED, posts.findById(post).orElseThrow().getStatus());
        assertEquals(org.hlrcs.entity.enums.ReportStatus.OPEN, reports.findById(report).orElseThrow().getStatus());
        assertEquals(4, mockingDetails(scanner).getInvocations().stream().filter(i -> i.getMethod().getName().equals("assessReport")).count());
        var receipt=api("GET","/api/community/reports/mine",reporter,null,200).path("content").get(0);
        assertFalse(receipt.has("recommendation")); assertFalse(receipt.has("ai"));
    }
    @Test void externalFraudClaimIsNeverClearedByNormalLookingPost() throws Exception {
        int report=report(post(),reporter,"FRAUD","Tôi đã chuyển cọc rồi bị chặn liên hệ.",false);
        assistant.runNext();
        assertEquals("ADMIN_REVIEW", api("GET",BASE+"/"+report+"/ai",admin,null,200).path("recommendation").asString());
    }
    @Test void aggregatesAllOpenReportsAndEvidenceOnlyFlagsCannotBecomePostViolations() throws Exception {
        int post=post();
        int first=report(post,reporter,"INAPPROPRIATE","Kiểm tra ảnh bằng chứng này.",true);
        when(scanner.assessReport(anyString(), any())).thenAnswer(call -> call.getArgument(0,String.class).endsWith("REPORT_EVIDENCE")
                ? verdict("VIOLATION","EXPLICIT_SEXUAL", "", "") : clear());
        assistant.runNext();
        assertEquals("ADMIN_REVIEW",api("GET",BASE+"/"+first+"/ai",admin,null,200).path("recommendation").asString());
        int second=report(post,register(),"SPAM","Nội dung lặp lại.",false);
        assertEquals("INCOMPLETE",api("GET",BASE+"/"+first+"/ai",admin,null,200).path("recommendation").asString());
        when(scanner.assessReport(anyString(), any())).thenReturn(verdict("VIOLATION","SPAM","Bàn học gỗ còn sử dụng tốt", ""));
        assistant.runNext();
        var group=api("GET",BASE+"/"+second+"/ai",admin,null,200);
        assertEquals(2,group.path("readyOpen").asInt()); assertEquals("SUGGEST_HIDE",group.path("recommendation").asString());
        assertEquals(org.hlrcs.entity.enums.PostStatus.APPROVED,posts.findById(post).orElseThrow().getStatus());
        assertEquals(org.hlrcs.entity.enums.ReportStatus.OPEN,reports.findById(first).orElseThrow().getStatus());
    }
    @Test void failureAndMissingKeyNeverPreventManualDecision() throws Exception {
        int report=report(post(),reporter,"INAPPROPRIATE","Cần kiểm tra nội dung.",false);
        when(scanner.assessReport(anyString(), any())).thenThrow(new IOException("Simulated provider unavailable"));
        assistant.runNext(); assertEquals(State.FAILED,analyses.findById(report).orElseThrow().getState());
        api("POST",BASE+"/"+report+"/decision",admin,Map.of("action","DISMISS","reason","Đã kiểm tra nội dung phù hợp."),200);
        when(scanner.configured()).thenReturn(false);
        int disabled=report(post(),register(),"FRAUD","Chưa có đủ bằng chứng.",false);
        assertEquals(State.DISABLED,analyses.findById(disabled).orElseThrow().getState());
        api("POST",BASE+"/"+disabled+"/ai",admin,null,400);
        api("POST",BASE+"/"+disabled+"/decision",admin,Map.of("action","DISMISS","reason","Đã kiểm tra và giữ bài viết."),200);
    }
    @Test void inFlightResultCannotOverwriteAdminDecision() throws Exception {
        int post=post(), report=report(post,reporter,"INAPPROPRIATE","Cần kiểm tra lại nội dung.",false);
        var started=new CountDownLatch(1); var release=new CountDownLatch(1);
        when(scanner.assessReport(anyString(), any())).thenAnswer(call -> { started.countDown(); assertTrue(release.await(10,TimeUnit.SECONDS)); return clear(); });
        var executor=Executors.newSingleThreadExecutor();
        try {
            var task=executor.submit(assistant::runNext); assertTrue(started.await(10,TimeUnit.SECONDS));
            api("POST",BASE+"/"+report+"/decision",admin,Map.of("action","HIDE_POST","reason","Admin đã kiểm tra và xác nhận vi phạm."),200);
            release.countDown(); task.get(10,TimeUnit.SECONDS);
            assertEquals(State.SKIPPED,analyses.findById(report).orElseThrow().getState());
            assertEquals(org.hlrcs.entity.enums.PostStatus.HIDDEN,posts.findById(post).orElseThrow().getStatus());
            assertEquals("CLOSED",api("GET",BASE+"/"+report+"/ai",admin,null,200).path("recommendation").asString());
        } finally { release.countDown(); executor.shutdownNow(); }
    }
    @Test void retryCooldownAndChangedInputInvalidateOldResults() throws Exception {
        int post=post(), report=report(post,reporter,"INAPPROPRIATE","Cần kiểm tra lại nội dung.",false);
        assistant.runNext();
        new TransactionTemplate(transactions).executeWithoutResult(s -> posts.findById(post).orElseThrow().setDescription("Nội dung bài đã được thay đổi trong dữ liệu kiểm thử."));
        assertEquals("STALE",api("GET",BASE+"/"+report+"/ai",admin,null,200).path("items").get(0).path("state").asString());
        api("POST",BASE+"/"+report+"/ai",admin,null,409);
        new TransactionTemplate(transactions).executeWithoutResult(s -> analyses.findById(report).orElseThrow().setRequestedAt(LocalDateTime.now().minusMinutes(2)));
        api("POST",BASE+"/"+report+"/ai",admin,null,200); assistant.runNext();
        assertEquals(State.READY,analyses.findById(report).orElseThrow().getState());
    }
    @Test void policyRejectsHallucinatedQuotesAndUncertainEvidence() throws Exception {
        var mismatch=CommunityReportAiPolicy.validate(verdict("VIOLATION","SPAM","Câu không có trong bài", ""),"POST_TEXT",null,"Bài gốc","Báo cáo",false);
        assertEquals("NEEDS_REVIEW",mismatch.assessment());
        var nakedEvidence=CommunityReportAiPolicy.validate(verdict("VIOLATION","EXPLICIT_SEXUAL","", ""),"REPORT_EVIDENCE",1,"Bài gốc","Báo cáo",false);
        assertEquals("ADMIN_REVIEW",CommunityReportAiPolicy.recommendation(List.of(nakedEvidence)));
        assertThrows(IOException.class,() -> CommunityReportAiPolicy.validate(verdict("VIOLATION","UNKNOWN","", ""),"POST_TEXT",null,"Bài gốc","Báo cáo",false));
        var contradiction=CommunityReportAiPolicy.validate(verdict("VIOLATION","DIRECT_CONTRADICTION","Bài gốc", ""),"POST_TEXT",null,"Bài gốc","Báo cáo",false);
        assertEquals("NEEDS_REVIEW",contradiction.assessment());
    }
    private JsonNode clear() { return verdict("NO_VISIBLE_VIOLATION","NO_VISIBLE_VIOLATION","", ""); }
    private JsonNode verdict(String assessment,String rule,String quote,String quote2) {
        return json.createObjectNode().put("assessment",assessment).put("rule",rule).put("explanation","Nhận xét dựa trên dữ liệu được cung cấp.")
                .put("postQuote",quote).put("postQuote2",quote2).put("reportQuote","");
    }
    private String login(String email,String password) throws Exception { return api("POST","/api/auth/login",null,Map.of("email",email,"password",password),200).path("accessToken").asString(); }
    private String register() throws Exception { return api("POST","/api/auth/register",null,Map.of("email","report-ai-"+UUID.randomUUID()+"@test.local","fullName","Thành viên","password","Password@123"),201).path("accessToken").asString(); }
    private int post() throws Exception {
        int id=api("POST","/api/community/posts",author,Map.of("type","SECOND_HAND","title","Bàn học gỗ còn sử dụng tốt","content","Mình nhượng bàn học tại Tân Xã, có thể kiểm tra trực tiếp.","location","Tân Xã","authorName","Người đăng","authorPhone","0912345678"),201).path("id").asInt();
        api("POST","/api/staff/community/posts/"+id+"/review",staff,Map.of("decision","APPROVE"),200); return id;
    }
    private int report(int post,String token,String reason,String details,boolean proof) throws Exception {
        var body=new MockMultipartFile("report","report.json","application/json",json.writeValueAsBytes(Map.of("reason",reason,"details",details)));
        var req=MockMvcRequestBuilders.multipart("/api/community/posts/"+post+"/reports").file(body).header("Authorization","Bearer "+token);
        if(proof) req.file(new MockMultipartFile("evidence","proof.png","image/png",Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH3sAAAAASUVORK5CYII=")));
        return json.readTree(mvc.perform(req).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data").path("id").asInt();
    }
    private JsonNode api(String method,String path,String token,Object body,int expected) throws Exception {
        var req=MockMvcRequestBuilders.request(method,java.net.URI.create(path)); if(token!=null) req.header("Authorization","Bearer "+token);
        if(body!=null) req.contentType("application/json").content(json.writeValueAsString(body));
        return json.readTree(mvc.perform(req).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }
}
