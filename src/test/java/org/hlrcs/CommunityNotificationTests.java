package org.hlrcs;

import org.hlrcs.service.CommunityNotificationEvent;
import org.hlrcs.repository.PostRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties="spring.datasource.url=jdbc:h2:mem:community-notification-test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class CommunityNotificationTests extends RegistrationOtpTestSupport {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PostRepository posts;
    @Autowired ApplicationEventPublisher events;
    @Autowired PlatformTransactionManager transactions;
    private static final String INBOX = "/api/community/notifications";

    @Test
    void reviewCommentsOwnershipAndUnavailableDestinations() throws Exception {
        String author = register(), member = register(), third = register();
        String staff = api("POST", "/api/auth/login", null, Map.of("email","staff@hlrcs.com","password","123456"),200).path("accessToken").asString();
        int post = create(author);
        review(staff, post, "APPROVE");
        var approved = inbox(author).path("items").get(0);
        assertEquals("APPROVED", approved.path("kind").asString());
        int approvedId = approved.path("notificationId").asInt();
        api("PUT", INBOX+"/"+approvedId+"/read", member, null, 404);
        api("GET", INBOX+"/"+approvedId+"/destination", member, null, 404);
        api("GET", INBOX, null, null, 401);
        api("POST", "/api/staff/community/posts/"+post+"/review", staff, Map.of("decision","APPROVE"),409);
        assertEquals(1, inbox(author).path("unreadCount").asInt());

        int comment = api("POST", "/api/community/posts/"+post+"/comments", member, Map.of("content","Xin hỏi bàn còn không?"),201).path("id").asInt();
        assertEquals("COMMENT", inbox(author).path("items").get(0).path("kind").asString());
        int reply = api("POST", "/api/community/posts/"+post+"/comments/"+comment+"/replies", author, Map.of("content","Bàn vẫn còn nhé."),201).path("id").asInt();
        var replyNotice = inbox(member).path("items").get(0);
        assertEquals("REPLY", replyNotice.path("kind").asString());
        int replyNoticeId = replyNotice.path("notificationId").asInt();
        var url = api("GET", INBOX+"/"+replyNoticeId+"/destination",member,null,200).asString();
        assertTrue(url.contains("comment="+reply));
        assertTrue(url.contains("root="+comment));
        assertTrue(url.endsWith("#post-"+post));
        api("POST", "/api/community/posts/"+post+"/comments/"+reply+"/replies",third,Map.of("content","Mình cũng quan tâm."),201);
        assertEquals(3, inbox(author).path("unreadCount").asInt()); // approval, comment, one reply, no duplicate
        api("POST", "/api/community/posts/"+post+"/comments",author,Map.of("content","Liên hệ mình nhé."),201);
        assertEquals(3, inbox(author).path("unreadCount").asInt());
        api("PUT", INBOX+"/read-all",author,null,200);
        assertEquals(0, api("GET",INBOX+"/unread-count",author,null,200).asInt());
        api("PUT",INBOX+"/"+approvedId+"/read",author,null,200);
        api("DELETE","/api/community/posts/"+post+"/comments/"+reply,author,null,200);
        api("GET",INBOX+"/"+replyNoticeId+"/destination",member,null,404);
        api("DELETE","/api/community/posts/"+post,author,null,200);
        api("GET",INBOX+"/"+approvedId+"/destination",author,null,404);
    }

    @Test
    void revisionOutcomesAndEventRollbackAreConsistent() throws Exception {
        String author=register();
        String staff=api("POST","/api/auth/login",null,Map.of("email","staff@hlrcs.com","password","123456"),200).path("accessToken").asString();
        int changes=create(author), rejected=create(author);
        review(staff,changes,"REQUEST_CHANGES");
        review(staff,rejected,"REJECT");
        assertEquals(Set.of("NEED_CHANGES","REJECTED"),inbox(author).path("items").valueStream().map(n->n.path("kind").asString()).collect(java.util.stream.Collectors.toSet()));
        var tx = new TransactionTemplate(transactions);
        int approved=create(author);
        tx.executeWithoutResult(s -> {
            var p=posts.findById(approved).orElseThrow();
            events.publishEvent(new CommunityNotificationEvent(p.getAuthor(),p,null,null,"APPROVED",null,"auto:test"));
            s.setRollbackOnly();
        });
        assertEquals(2,inbox(author).path("unreadCount").asInt());
        tx.executeWithoutResult(s -> {
            var p=posts.findById(approved).orElseThrow();
            var event=new CommunityNotificationEvent(p.getAuthor(),p,null,null,"APPROVED",null,"auto:test");
            events.publishEvent(event); events.publishEvent(event);
        });
        assertEquals(3,inbox(author).path("unreadCount").asInt());
        tx.executeWithoutResult(s -> {
            var p=posts.findById(approved).orElseThrow();
            events.publishEvent(new CommunityNotificationEvent(p.getAuthor(),p,null,null,"HIDDEN","Thông tin sai lệch.","hide:test"));
        });
        assertEquals("HIDDEN",inbox(author).path("items").get(0).path("kind").asString());
    }

    @Test
    void hidingAReportedPostNotifiesAuthorOnceWithoutNotifyingReporters() throws Exception {
        String author = register(), reporter = register(), other = register();
        String staff = api("POST", "/api/auth/login", null, Map.of("email", "staff@hlrcs.com", "password", "123456"), 200).path("accessToken").asString();
        String admin = api("POST", "/api/auth/login", null, Map.of("email", "admin@hlrcs.com", "password", "admin123"), 200).path("accessToken").asString();
        int post = create(author);
        review(staff, post, "APPROVE");
        int reportId = 0;
        for (String member : List.of(reporter, other)) {
            var body = new org.springframework.mock.web.MockMultipartFile("report", "report.json", "application/json",
                    json.writeValueAsBytes(Map.of("reason", "FRAUD", "details", "Yêu cầu chuyển tiền trước khi xem.")));
            var result = mvc.perform(MockMvcRequestBuilders.multipart("/api/community/posts/" + post + "/reports")
                    .file(body).header("Authorization", "Bearer " + member)).andExpect(status().isCreated()).andReturn();
            reportId = json.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data").path("id").asInt();
        }
        api("POST", "/api/admin/community/reports/" + reportId + "/decision", admin,
                Map.of("action", "HIDE_POST", "reason", "Đã xác nhận thông tin không chính xác."), 200);
        var notices = inbox(author).path("items");
        assertEquals(2, notices.size());
        assertEquals("HIDDEN", notices.get(0).path("kind").asString());
        assertEquals(0, inbox(reporter).path("items").size());
        assertEquals(0, inbox(other).path("items").size());
        api("GET", INBOX + "/" + notices.get(0).path("notificationId").asInt() + "/destination", author, null, 200);
        api("GET", "/api/community/posts/feed/" + post, reporter, null, 404);
    }

    @Test
    void inboxPagesAndUnreadFilterRemainScopedToRecipient() throws Exception {
        String author = register(), other = register();
        int post = create(author);
        new TransactionTemplate(transactions).executeWithoutResult(s -> {
            var p = posts.findById(post).orElseThrow();
            for (int i = 0; i < 21; i++)
                events.publishEvent(new CommunityNotificationEvent(p.getAuthor(), p, null, null, "APPROVED", null, "page:" + i));
        });
        var first = inbox(author);
        assertEquals(20, first.path("items").size());
        assertTrue(first.path("hasNext").asBoolean());
        assertEquals(1, api("GET", INBOX + "?page=1", author, null, 200).path("items").size());
        int id = first.path("items").get(0).path("notificationId").asInt();
        api("PUT", INBOX + "/" + id + "/read", author, null, 200);
        var unread = api("GET", INBOX + "?unread=true", author, null, 200);
        assertEquals(20, unread.path("unreadCount").asInt());
        assertFalse(unread.path("hasNext").asBoolean());
        assertEquals(0, inbox(other).path("items").size());
    }

    @Test
    void deletingReadNotificationsPreservesUnreadAndOtherAccounts() throws Exception {
        String author = register(), other = register();
        String staff = api("POST", "/api/auth/login", null, Map.of("email", "staff@hlrcs.com", "password", "123456"), 200).path("accessToken").asString();
        review(staff, create(author), "APPROVE");
        review(staff, create(author), "APPROVE");
        review(staff, create(other), "APPROVE");
        int readId = inbox(author).path("items").get(0).path("notificationId").asInt();
        api("PUT", INBOX + "/" + readId + "/read", author, null, 200);
        api("PUT", INBOX + "/read-all", other, null, 200);
        api("DELETE", INBOX + "/read", null, null, 401);
        assertEquals(1, api("DELETE", INBOX + "/read", author, null, 200).asInt());
        assertEquals(1, inbox(author).path("items").size());
        assertEquals(1, inbox(author).path("unreadCount").asInt());
        assertEquals(1, inbox(other).path("items").size());
        assertEquals(0, api("DELETE", INBOX + "/read", author, null, 200).asInt());
        api("GET", INBOX + "/" + readId + "/destination", author, null, 404);
    }

    private void review(String staff,int post,String decision) throws Exception {
        api("POST","/api/staff/community/posts/"+post+"/review",staff,Map.of("decision",decision,"note","Nội dung cần được kiểm tra lại."),200);
    }
    private int create(String token) throws Exception {
        return api("POST","/api/community/posts",token,Map.of("type","SECOND_HAND","title","Bàn học gỗ còn sử dụng tốt","content","Mình nhượng bàn học tại Tân Xã, có thể kiểm tra trực tiếp.","location","Tân Xã, Hòa Lạc","authorName","Người đăng","authorPhone","0912345678"),201).path("id").asInt();
    }
    private JsonNode inbox(String token) throws Exception { return api("GET",INBOX,token,null,200); }
    private String register() throws Exception {
        String email = "notif-" + UUID.randomUUID() + "@hlrcs.test";
        return api("POST", "/api/auth/register", null, Map.of("email", email, "fullName", "Thành viên",
                "password", "Password@123", "verificationToken", verifyContact(email)), 201).path("accessToken").asString();
    }
    private JsonNode api(String method,String path,String token,Object body,int expected) throws Exception {
        var req=MockMvcRequestBuilders.request(method,java.net.URI.create(path));
        if(token!=null) req.header("Authorization","Bearer "+token);
        if(body!=null) req.contentType("application/json").content(json.writeValueAsString(body));
        return json.readTree(mvc.perform(req).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }
}
