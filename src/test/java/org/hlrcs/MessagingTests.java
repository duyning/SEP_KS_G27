package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.service.MessagingChanged;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import tools.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:messaging-test;MODE=MySQL;DB_CLOSE_DELAY=-1","community.ai.mode=OFF","community.report-ai.enabled=false"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class MessagingTests {
    static final String BASE="/api/messaging/conversations";
    @Autowired MockMvc mvc; @Autowired ObjectMapper json;
    @Autowired UserRepository users; @Autowired PostRepository posts;
    @Autowired DirectMessageRepository messages; @Autowired DirectConversationRepository conversations;
    @Autowired DirectMessageAttachmentRepository attachments;
    @Autowired JdbcTemplate jdbc;
    String member,host,admin;Integer memberId,hostId;
    @BeforeEach void actors() throws Exception {
        jdbc.update("update users set status='ACTIVE'");attachments.deleteAll();jdbc.update("update messaging_messages set reply_to_id=null");messages.deleteAll();conversations.deleteAll();
        member=login("user@hlrcs.com","123456");host=login("host@hlrcs.com","123456");admin=login("admin@hlrcs.com","admin123");
        memberId=users.findByEmail("user@hlrcs.com").orElseThrow().getUserId();hostId=users.findByEmail("host@hlrcs.com").orElseThrow().getUserId();
    }
    @Test void canonicalConversationAndPrivateAccess() throws Exception {
        api("GET",BASE,null,null,401);
        long id=open(member,hostId,null);
        assertEquals(id,open(host,memberId,null));assertEquals(1,conversations.count());
        api("GET",BASE+"/"+id+"/messages",admin,null,404);
        api("POST",BASE+"/"+id+"/messages",admin,payload("Spoofed",null),404);
        api("PUT",BASE+"/"+id+"/read",admin,Map.of("through",0),404);
        assertTrue(api("GET",BASE,admin,null,200).path("items").isEmpty());
        api("POST",BASE,member,Map.of("recipientId",memberId),400);
        api("POST",BASE,member,Map.of("recipientId",999999),404);
    }
    @Test void unreadAndReadReceiptsAreMonotonicAndPerMember() throws Exception {
        long id=open(member,hostId,null);
        var one=send(id,member,"Xin chào",null);send(id,member,"Bàn còn không bạn?",null);
        assertEquals(2,api("GET",BASE,host,null,200).path("unreadCount").asInt());
        assertEquals(0,api("GET",BASE,member,null,200).path("unreadCount").asInt());
        var partial=api("PUT",BASE+"/"+id+"/read",host,Map.of("through",one.path("sequence").asLong()),200);
        assertEquals(1,partial.path("unreadCount").asInt());
        api("PUT",BASE+"/"+id+"/read",host,Map.of("through",0),200);
        assertEquals(1,api("GET",BASE+"/"+id+"/messages",member,null,200).path("conversation").path("peerReadSequence").asInt());
        api("PUT",BASE+"/"+id+"/read",host,Map.of("through",3),400);
        api("PUT",BASE+"/"+id+"/read",host,Map.of("through",2),200);
        assertEquals(0,api("GET",BASE,host,null,200).path("unreadCount").asInt());
        send(id,host,"Mình còn nhé",null);
        assertEquals(1,api("GET",BASE,member,null,200).path("unreadCount").asInt());
    }
    @Test void retriesDoNotDuplicateMessagesAndConflictOnDifferentPayload() throws Exception {
        long id=open(member,hostId,null);var body=payload("  Hello  ",null);
        var first=api("POST",BASE+"/"+id+"/messages",member,body,200);
        var retry=api("POST",BASE+"/"+id+"/messages",member,body,200);
        assertEquals(first.path("id"),retry.path("id"));assertEquals(1,messages.count());
        var changed=new HashMap<String,Object>(body);changed.put("content","Different");
        api("POST",BASE+"/"+id+"/messages",member,changed,409);
        assertEquals(1,api("GET",BASE,host,null,200).path("unreadCount").asInt());
    }
    @Test void communityContextChecksAuthorVisibilityAndDoesNotLeakHiddenPosts() throws Exception {
        var post=post(PostStatus.APPROVED,hostId);var context=Map.of("kind","COMMUNITY_POST","referenceId",post.getPostId());
        long id=open(member,hostId,context);send(id,member,"Mình hỏi về bài này",context);
        var history=api("GET",BASE+"/"+id+"/messages",member,null,200);
        assertTrue(history.path("items").get(0).path("context").path("available").asBoolean());
        assertEquals("Thỏa thuận",history.path("items").get(0).path("context").path("subtitle").asString());
        assertTrue(history.path("items").get(0).path("context").path("url").asString().contains("#post-"+post.getPostId()));
        var third=post(PostStatus.APPROVED,users.findByEmail("staff@hlrcs.com").orElseThrow().getUserId());
        api("POST",BASE+"/"+id+"/messages",member,payload("Invalid context",Map.of("kind","COMMUNITY_POST","referenceId",third.getPostId())),400);
        post.setStatus(PostStatus.HIDDEN);posts.save(post);
        var unavailable=api("GET",BASE+"/"+id+"/messages",member,null,200).path("items").get(0).path("context");
        assertFalse(unavailable.path("available").asBoolean());assertTrue(unavailable.path("url").isNull());
        assertTrue(unavailable.path("imageId").isNull());assertTrue(unavailable.path("subtitle").isNull());
        assertFalse(unavailable.path("title").asString().contains(post.getTitle()));
        assertTrue(api("GET",BASE+"/"+id+"/messages",host,null,200).path("items").get(0).path("context").path("available").asBoolean());
        api("POST",BASE+"/"+id+"/messages",member,payload("No longer public",context),400);
        posts.delete(post);
        assertFalse(api("GET",BASE+"/"+id+"/messages",host,null,200).path("items").get(0).path("context").path("available").asBoolean());
        assertEquals(1,messages.count());
    }
    @Test void validationAndInactiveAccountsAreEnforced() throws Exception {
        long id=open(member,hostId,null);
        for(String text:List.of(" ","x".repeat(2001),"text\u0000"))api("POST",BASE+"/"+id+"/messages",member,payload(text,null),400);
        api("POST",BASE+"/"+id+"/messages",member,Map.of("clientMessageId","bad","content","Hello"),400);
        api("POST",BASE+"/"+id+"/messages",member,payload("Hello",Map.of("kind","PROPERTY","referenceId",1)),400);
        api("GET",BASE+"/"+id+"/messages?before=0",member,null,400);
        api("GET",BASE+"?page=-1",member,null,400);
        jdbc.update("update users set status='INACTIVE' where user_id=?",hostId);
        api("POST",BASE+"/"+id+"/messages",member,payload("Hello",null),403);
        api("POST",BASE,member,Map.of("recipientId",hostId),404);
        api("GET",BASE,host,null,401);
        assertEquals(0,messages.count());
    }
    @Test void historyPaginatesWithoutGapsAndSearchFiltersPeer() throws Exception {
        long id=open(member,hostId,null);
        for(int i=1;i<=55;i++)send(id,member,"Tin nhắn "+i,null);
        var recent=api("GET",BASE+"/"+id+"/messages",host,null,200);
        assertEquals(50,recent.path("items").size());assertTrue(recent.path("hasMore").asBoolean());
        assertEquals(6,recent.path("items").get(0).path("sequence").asInt());
        var older=api("GET",BASE+"/"+id+"/messages?before=6",host,null,200);
        assertEquals(5,older.path("items").size());assertFalse(older.path("hasMore").asBoolean());
        assertEquals(1,older.path("items").get(0).path("sequence").asInt());
        assertTrue(api("GET",BASE+"?q=no-such-peer",member,null,200).path("items").isEmpty());
        assertTrue(api("GET",BASE+"?q=%25",member,null,200).path("items").isEmpty());
    }
    @Test void simultaneousOpenAndRetryHaveOneConversationAndMessage() throws Exception {
        var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
        try{
            var a=pool.submit(()->{start.await();return open(member,hostId,null);});
            var b=pool.submit(()->{start.await();return open(host,memberId,null);});
            start.countDown();long id=a.get(15,TimeUnit.SECONDS);assertEquals(id,b.get(15,TimeUnit.SECONDS));
            var payload=payload("Concurrent retry",null);var sendStart=new CountDownLatch(1);
            var x=pool.submit(()->{sendStart.await();return api("POST",BASE+"/"+id+"/messages",member,payload,200);});
            var y=pool.submit(()->{sendStart.await();return api("POST",BASE+"/"+id+"/messages",member,payload,200);});
            sendStart.countDown();assertEquals(x.get(15,TimeUnit.SECONDS).path("id"),y.get(15,TimeUnit.SECONDS).path("id"));
            assertEquals(1,conversations.count());assertEquals(1,messages.count());
        }finally{pool.shutdownNow();}
    }
    @Test void realtimeTargetsOnlyParticipants(){
        var event=new MessagingChanged(7L,1,2);
        assertTrue(event.visibleTo(1));assertTrue(event.visibleTo(2));assertFalse(event.visibleTo(3));assertFalse(event.visibleTo(null));
    }
    @Test void repliesStayInsideTheConversationAndAreIncludedInHistory() throws Exception {
        long id=open(member,hostId,null);var first=send(id,host,"Bàn vẫn còn nhé",null);
        var body=new HashMap<>(payload("Mình lấy nhé",null));body.put("replyToId",first.path("id").asLong());
        var saved=api("POST",BASE+"/"+id+"/messages",member,body,200);
        assertEquals(first.path("id"),saved.path("replyTo").path("id"));
        assertEquals("Bàn vẫn còn nhé",saved.path("replyTo").path("content").asString());
        assertEquals(saved.path("id"),api("POST",BASE+"/"+id+"/messages",member,body,200).path("id"));
        assertEquals(first.path("id"),api("GET",BASE+"/"+id+"/messages",host,null,200).path("items").get(1).path("replyTo").path("id"));
        long another=open(admin,hostId,null);var foreign=send(another,admin,"Tin ở hội thoại khác",null);
        api("POST",BASE+"/"+id+"/messages",member,Map.of("clientMessageId",UUID.randomUUID().toString(),"content","Reply sai","replyToId",foreign.path("id").asLong()),400);
        body.put("replyToId",foreign.path("id").asLong());api("POST",BASE+"/"+id+"/messages",member,body,409);
    }
    @Test void imageVideoMessagesArePrivateAtomicAndIdempotent() throws Exception {
        long id=open(member,hostId,null);var photo=png(0xff003322);var clip=video();
        var body=payload("",null);
        var imageFile=new org.springframework.mock.web.MockMultipartFile("files","ban.png","image/png",photo);
        var videoFile=new org.springframework.mock.web.MockMultipartFile("files","ban.mp4","video/mp4",clip);
        var saved=upload(id,member,body,200,imageFile,videoFile);
        assertEquals(2,saved.path("attachments").size());assertEquals("",saved.path("content").asString());
        long photoId=saved.path("attachments").get(0).path("id").asLong(),videoId=saved.path("attachments").get(1).path("id").asLong();
        assertEquals("IMAGE",saved.path("attachments").get(0).path("type").asString());
        assertFalse(saved.path("attachments").get(0).has("digest"));assertFalse(saved.path("attachments").get(0).has("content"));
        var download=BASE+"/"+id+"/attachments/"+photoId;
        mvc.perform(MockMvcRequestBuilders.get(download).header("Authorization","Bearer "+host)).andExpect(status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().bytes(photo))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Cache-Control","private, no-store"));
        mvc.perform(MockMvcRequestBuilders.get(BASE+"/"+id+"/attachments/"+videoId).header("Authorization","Bearer "+host).header("Range","bytes=0-15"))
            .andExpect(status().isPartialContent()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().bytes(Arrays.copyOf(clip,16)));
        mvc.perform(MockMvcRequestBuilders.get(download)).andExpect(status().isUnauthorized());
        mvc.perform(MockMvcRequestBuilders.get(download).header("Authorization","Bearer "+admin)).andExpect(status().isNotFound());
        long other=open(admin,hostId,null);
        mvc.perform(MockMvcRequestBuilders.get(BASE+"/"+other+"/attachments/"+photoId).header("Authorization","Bearer "+host)).andExpect(status().isNotFound());
        assertEquals(saved.path("id"),upload(id,member,body,200,imageFile,videoFile).path("id"));assertEquals(2,attachments.count());assertEquals(1,messages.count());
        upload(id,member,body,409,new org.springframework.mock.web.MockMultipartFile("files","ban.png","image/png",png(0xff118833)),videoFile);
        var reply=api("POST",BASE+"/"+id+"/messages",host,Map.of("clientMessageId",UUID.randomUUID().toString(),"content","Mình xem rồi","replyToId",saved.path("id").asLong()),200);
        assertEquals("Tệp đính kèm",reply.path("replyTo").path("content").asString());
    }
    @Test void invalidAttachmentsAndLimitsNeverCreatePartialMessages() throws Exception {
        long id=open(member,hostId,null);var valid=new org.springframework.mock.web.MockMultipartFile("files","valid.png","image/png",png(0xff003322));
        for(var bad:List.of(new org.springframework.mock.web.MockMultipartFile("files","fake.png","image/png",new byte[]{1,2}),
                new org.springframework.mock.web.MockMultipartFile("files","fake.mp4","video/mp4",new byte[]{1,2}),
                new org.springframework.mock.web.MockMultipartFile("files","x.svg","image/svg+xml","<svg/>".getBytes()),
                new org.springframework.mock.web.MockMultipartFile("files","big.png","image/png",new byte[5*1024*1024+1])))
            upload(id,member,payload("Ảnh của bàn",null),400,valid,bad);
        upload(id,member,payload("",null),400,valid,valid,valid,valid,valid,valid,valid);
        var clip=new org.springframework.mock.web.MockMultipartFile("files","clip.mp4","video/mp4",video());
        upload(id,member,payload("",null),400,clip,clip);
        assertEquals(0,messages.count());assertEquals(0,attachments.count());
    }
    byte[] png(int color)throws Exception{var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);image.setRGB(0,0,color);var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",bytes);return bytes.toByteArray();}
    byte[] video()throws Exception{
        var channel=org.jcodec.common.io.ByteBufferSeekableByteChannel.writeToByteBuffer(java.nio.ByteBuffer.allocate(1024*1024));
        var encoder=org.jcodec.api.SequenceEncoder.createWithFps(channel,org.jcodec.common.model.Rational.R(1,1));
        encoder.encodeNativeFrame(org.jcodec.common.model.Picture.create(32,32,org.jcodec.common.model.ColorSpace.RGB));encoder.finish();
        var buffer=channel.getContents();byte[] bytes=new byte[buffer.remaining()];buffer.get(bytes);return bytes;
    }
    JsonNode upload(long id,String token,Object details,int expected,org.springframework.mock.web.MockMultipartFile... files)throws Exception{
        var request=MockMvcRequestBuilders.multipart(BASE+"/"+id+"/messages")
            .file(new org.springframework.mock.web.MockMultipartFile("details","details.json","application/json",json.writeValueAsBytes(details))).header("Authorization","Bearer "+token);
        for(var file:files)request.file(file);
        return json.readTree(mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }
    Post post(PostStatus status,Integer author){return posts.save(Post.builder().author(users.findById(author).orElseThrow()).postType(PostType.PASS_ITEM).title("Bàn học dùng để kiểm tra chat").description("Bàn gỗ còn tốt, có thể xem trực tiếp tại Tân Xã.").status(status).build());}
    long open(String token,Integer recipient,Object context)throws Exception{
        var body=new HashMap<String,Object>();body.put("recipientId",recipient);if(context!=null)body.put("context",context);
        return api("POST",BASE,token,body,200).path("conversation").path("id").asLong();
    }
    Map<String,Object> payload(String content,Object context){var body=new HashMap<String,Object>();body.put("clientMessageId",UUID.randomUUID().toString());body.put("content",content);if(context!=null)body.put("context",context);return body;}
    JsonNode send(long id,String token,String content,Object context)throws Exception{return api("POST",BASE+"/"+id+"/messages",token,payload(content,context),200);}
    String login(String email,String password)throws Exception{return api("POST","/api/auth/login",null,Map.of("email",email,"password",password),200).path("accessToken").asString();}
    JsonNode api(String method,String path,String token,Object body,int expected)throws Exception{
        var req=MockMvcRequestBuilders.request(method,java.net.URI.create(path));if(token!=null)req.header("Authorization","Bearer "+token);
        if(body!=null)req.contentType("application/json").content(json.writeValueAsBytes(body));
        return json.readTree(mvc.perform(req).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }
}
