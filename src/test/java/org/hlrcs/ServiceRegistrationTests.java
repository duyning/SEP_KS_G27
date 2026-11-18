package org.hlrcs;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ServiceRegistrationTests {
    @Autowired Environment environment;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired ServiceRegistrationRepository registrations;
    @Autowired ServiceCategoryRepository categories;
    @Autowired ServiceDocumentRepository documents;
    @Autowired UserCapabilityRepository capabilities;
    @Autowired CapabilityRepository capabilityTypes;
    @Autowired ServiceRepository listings;
    @Autowired ModerationLogRepository logs;
    @Autowired ServiceRatingRepository ratings;
    @Autowired ServiceComplaintRepository complaints;
    private final HttpClient client = HttpClient.newHttpClient();

    private User account() {
        return account(UserRole.USER);
    }
    private User account(UserRole role) {
        return users.save(User.builder().email("service-" + UUID.randomUUID() + "@test.local")
                .fullName("Người đăng ký").passwordHash(encoder.encode("Test@123456"))
                .role(role).status(UserStatus.ACTIVE).build());
    }
    private URI uri(String path) { return URI.create("http://localhost:" + environment.getProperty("local.server.port") + path); }
    private String token(User user) throws Exception {
        var response = client.send(HttpRequest.newBuilder(uri("/api/auth/login")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("email", user.getEmail(), "password", "Test@123456")))).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), response.body());
        return json.readTree(response.body()).path("data").path("accessToken").asString();
    }
    private Map<String, Object> details() {
        return new HashMap<>(Map.of("applicantName", "Nguyễn Văn An", "categoryId", categories.findAll().get(0).getCategoryId(),
                "serviceName", "Dịch vụ chuyển trọ", "description", "Dịch vụ chuyển trọ sinh viên tại Hòa Lạc.",
                "pricingType", "FIXED", "price", 150000, "serviceArea", "Tân Xã, Thạch Hòa", "contactPhone", "0987654321", "contactEmail", "contact@example.com"));
    }
    private HttpResponse<String> get(String token, String path) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/service-registrations" + path));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> submit(String token, Map<String, Object> data, String fileContent, int count) throws Exception {
        String boundary = "ServiceTestBoundary";
        var body = new StringBuilder("--" + boundary + "\r\nContent-Disposition: form-data; name=\"details\"\r\nContent-Type: application/json\r\n\r\n" + json.writeValueAsString(data) + "\r\n");
        for (int i = 0; i < count; i++) body.append("--").append(boundary).append("\r\nContent-Disposition: form-data; name=\"documents\"; filename=\"license.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").append(fileContent).append("\r\n");
        body.append("--").append(boundary).append("--\r\n");
        var request = HttpRequest.newBuilder(uri("/api/service-registrations")).header("Content-Type", "multipart/form-data; boundary=" + boundary);
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.POST(HttpRequest.BodyPublishers.ofString(body.toString())).build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> api(String token, String method, String path, Object data) throws Exception {
        var builder = HttpRequest.newBuilder(uri(path));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (data != null) builder.header("Content-Type", "application/json");
        return client.send(builder.method(method, data == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data))).build(), HttpResponse.BodyHandlers.ofString());
    }
    private int application(User owner) throws Exception {
        return application(owner, details());
    }
    private int application(User owner, Map<String, Object> details) throws Exception {
        var result = submit(token(owner), details, "%PDF-1.4\nverification document", 1);
        assertEquals(201, result.statusCode(), result.body());
        return json.readTree(result.body()).path("data").path("registrationId").asInt();
    }
    private HttpResponse<String> review(String staff, int id, String cap, String listing, String reason) throws Exception {
        return reviewRevision(staff, id, cap, listing, reason, 0);
    }
    private HttpResponse<String> reviewRevision(String staff, int id, String cap, String listing, String reason, int revision) throws Exception {
        return api(staff, "POST", "/api/staff/service-applications/" + id + "/review", Map.of("capabilityDecision", cap, "listingDecision", listing, "reason", reason, "revision", revision));
    }
    private HttpResponse<String> serviceMultipart(String token, String path, Object details, boolean document, byte[] image, byte[]... moreImages) throws Exception {
        String boundary="ServiceManagementBoundary";
        var bytes=new java.io.ByteArrayOutputStream();
        bytes.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"details\"\r\nContent-Type: application/json\r\n\r\n"+json.writeValueAsString(details)+"\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        if(document)bytes.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"documents\"; filename=\"proof.pdf\"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\nproof\r\n").getBytes());
        var images = new ArrayList<byte[]>(); if (image != null) images.add(image); images.addAll(Arrays.asList(moreImages));
        for(var photo : images){bytes.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"image\"; filename=\"cover.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes());bytes.write(photo);bytes.write("\r\n".getBytes());}
        bytes.write(("--"+boundary+"--\r\n").getBytes());
        return client.send(HttpRequest.newBuilder(uri(path)).header("Authorization","Bearer "+token).header("Content-Type","multipart/form-data; boundary="+boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes.toByteArray())).build(),HttpResponse.BodyHandlers.ofString());
    }
    private byte[] cover() { return Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTbkAAAAASUVORK5CYII="); }
    @Test void pendingApplicationsCanBeCancelledOnlyByOwnerWithFreshRevision() throws Exception {
        var owner = account(); var own = token(owner); var staff = token(account(UserRole.STAFF));
        int id = application(owner); String path = "/api/service-registrations/" + id + "/cancel";
        assertEquals(401, api(null, "POST", path, Map.of("revision", 0)).statusCode());
        assertEquals(404, api(token(account()), "POST", path, Map.of("revision", 0)).statusCode());
        assertEquals(404, api(staff, "POST", path, Map.of("revision", 0)).statusCode());
        assertEquals(400, api(own, "POST", path, Map.of()).statusCode());
        assertEquals(409, api(own, "POST", path, Map.of("revision", 1)).statusCode());
        var cancelled = api(own, "POST", path, Map.of("revision", 0));
        assertEquals(200, cancelled.statusCode(), cancelled.body());
        assertEquals("CANCELLED", json.readTree(cancelled.body()).path("data").path("status").asString());
        assertEquals(1, registrations.findById(id).orElseThrow().getRevision());
        assertEquals(409, api(own, "POST", path, Map.of("revision", 1)).statusCode());
        assertEquals(409, review(staff, id, "APPROVE", "APPROVE", "Hồ sơ đã được xác minh đầy đủ.").statusCode());
        assertTrue(json.readTree(get(own, "/current").body()).path("data").path("canRegister").asBoolean());
        assertFalse(listings.existsByRegistration_RegistrationId(id));
        assertTrue(capabilities.findByUser_UserId(owner.getUserId()).isEmpty());
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION", id).stream().filter(l -> "CANCELLED".equals(l.getAction())).count());
        int next = application(owner);
        assertEquals(200, review(staff, next, "APPROVE", "APPROVE", "Hồ sơ đã được xác minh đầy đủ.").statusCode());
        assertEquals(409, api(own, "POST", "/api/service-registrations/" + next + "/cancel", Map.of("revision", 1)).statusCode());
        int serviceId = listings.findByRegistration_RegistrationId(next).orElseThrow().getServiceId();
        for (String operation : List.of("UPDATE", "DELETE")) {
            var proposal = Map.of("operation", operation, "serviceRevision", 1, "details", details(), "note", "Yêu cầu thay đổi dịch vụ để kiểm tra hủy.");
            var change = serviceMultipart(own, "/api/service-registrations/services/" + serviceId + "/changes", proposal, false, null);
            assertEquals(200, change.statusCode(), change.body());
            int changeId = json.readTree(change.body()).path("data").path("registrationId").asInt();
            assertEquals(200, api(own, "POST", "/api/service-registrations/" + changeId + "/cancel", Map.of("revision", 0)).statusCode());
            assertEquals(200, api(null, "GET", "/api/services/" + serviceId, null).statusCode());
            assertEquals(1, listings.findById(serviceId).orElseThrow().getRevision());
            assertEquals(next, listings.findById(serviceId).orElseThrow().getRegistration().getRegistrationId());
        }
    }

    @Test void cancellationAndReviewCannotBothSucceed() throws Exception {
        var owner = account(); String own = token(owner), staff = token(account(UserRole.STAFF)); int id = application(owner);
        var cancel = java.util.concurrent.CompletableFuture.supplyAsync(() -> { try {
            return api(own, "POST", "/api/service-registrations/" + id + "/cancel", Map.of("revision", 0)).statusCode();
        } catch (Exception e) { throw new RuntimeException(e); } });
        var approve = java.util.concurrent.CompletableFuture.supplyAsync(() -> { try {
            return review(staff, id, "APPROVE", "APPROVE", "Hồ sơ đã được xác minh đầy đủ.").statusCode();
        } catch (Exception e) { throw new RuntimeException(e); } });
        var codes = new ArrayList<>(List.of(cancel.get(), approve.get())); codes.sort(Integer::compareTo);
        assertEquals(List.of(200, 409), codes);
        assertEquals(registrations.findById(id).orElseThrow().getStatus() == RegistrationStatus.APPROVED,
                listings.existsByRegistration_RegistrationId(id));
    }

    @Test void galleriesArePrivateAtomicAndPublishedOnlyAfterApproval() throws Exception {
        var owner = account(); String own = token(owner), staff = token(account(UserRole.STAFF)), outsider = token(account());
        String base = "/api/service-registrations";
        assertEquals(400, serviceMultipart(own, base, details(), true, cover(), cover(), cover(), cover(), cover(), cover()).statusCode());
        assertEquals(400, serviceMultipart(own, base, details(), true, cover(), "invalid".getBytes()).statusCode());
        assertEquals(0, registrations.findByUser_UserIdOrderByRegistrationIdDesc(owner.getUserId()).size());
        var response = serviceMultipart(own, base, details(), true, cover(), cover(), cover());
        assertEquals(201, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data"); int app = data.path("registrationId").asInt();
        assertEquals(3, data.path("imageCount").asInt());
        assertEquals(200, api(own,"GET",base+"/"+app+"/image?index=2",null).statusCode());
        assertEquals(200, api(staff,"GET",base+"/"+app+"/image?index=1",null).statusCode());
        assertEquals(404, api(outsider,"GET",base+"/"+app+"/image?index=1",null).statusCode());
        assertEquals(404, api(own,"GET",base+"/"+app+"/image?index=-1",null).statusCode());
        assertEquals(400, review(staff,app,"REJECT","REJECT","").statusCode());
        var approved = review(staff,app,"APPROVE","APPROVE","");
        assertEquals(200, approved.statusCode(), approved.body());
        assertEquals("Đã kiểm tra và duyệt thành công.", json.readTree(approved.body()).path("data").path("application").path("reasonNote").asString());
        assertEquals("Đã kiểm tra và duyệt thành công.", registrations.findById(app).orElseThrow().getReasonNote());
        assertTrue(json.readTree(approved.body()).path("data").path("history").get(0).path("reason").asString().contains("Đã kiểm tra và duyệt thành công."));
        int id = listings.findByRegistration_RegistrationId(app).orElseThrow().getServiceId();
        String publicPath = "/api/services/"+id;
        assertEquals(3, json.readTree(api(null,"GET",publicPath,null).body()).path("data").path("imageUrls").size());
        assertEquals(200, api(null,"GET",publicPath+"/image?index=2",null).statusCode());
        assertEquals(404, api(null,"GET",publicPath+"/image?index=3",null).statusCode());
        var edit = Map.of("operation","UPDATE","serviceRevision",1,"details",details(),"note","Thay thế bộ ảnh dịch vụ đã đăng ký.");
        var changed = serviceMultipart(own,base+"/services/"+id+"/changes",edit,false,cover(),cover());
        assertEquals(200, changed.statusCode(), changed.body());
        int changeId = json.readTree(changed.body()).path("data").path("registrationId").asInt();
        assertEquals(200, api(null,"GET",publicPath+"/image?index=2",null).statusCode());
        assertEquals(200, review(staff,changeId,"APPROVE","APPROVE","Bộ ảnh thay thế đã được kiểm tra.").statusCode());
        assertEquals(404, api(null,"GET",publicPath+"/image?index=2",null).statusCode());
        assertEquals(200, api(null,"GET",publicPath+"/image?index=1",null).statusCode());
        var unchanged = serviceMultipart(own,base+"/services/"+id+"/changes",Map.of("operation","UPDATE","serviceRevision",2,"details",details(),"note","Chỉ sửa thông tin và giữ nguyên bộ ảnh."),false,null);
        assertEquals(200, unchanged.statusCode(), unchanged.body());
        assertEquals(2, json.readTree(unchanged.body()).path("data").path("imageCount").asInt());
        int pendingId = json.readTree(unchanged.body()).path("data").path("registrationId").asInt();
        assertEquals(200, supplement(staff,pendingId,0).statusCode());
        int fileId = documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(pendingId).get(0).getDocumentId();
        var resubmitted = resubmit(own,pendingId,1,List.of(fileId),"",0);
        assertEquals(200, resubmitted.statusCode(), resubmitted.body());
        assertEquals(2, json.readTree(resubmitted.body()).path("data").path("imageCount").asInt());
    }
    @Test void changesSerializeRetainSupplementFlowAndCannotReactivateRevokedCapability() throws Exception {
        var owner=account();String own=token(owner), staff=token(account(UserRole.STAFF));int app=application(owner);
        assertEquals(200,review(staff,app,"APPROVE","APPROVE","Hồ sơ đã được xác minh đầy đủ.").statusCode());
        int id=listings.findByRegistration_RegistrationId(app).orElseThrow().getServiceId();
        String path="/api/service-registrations/services/"+id+"/changes";
        var edit=Map.of("operation","UPDATE","serviceRevision",1,"details",details(),"note","Bổ sung ảnh và thông tin dịch vụ hiện tại.");
        java.util.function.Supplier<HttpResponse<String>> action=()->{try{return serviceMultipart(own,path,edit,false,cover());}catch(Exception e){throw new RuntimeException(e);}};
        var a=java.util.concurrent.CompletableFuture.supplyAsync(action);var b=java.util.concurrent.CompletableFuture.supplyAsync(action);
        var results=List.of(a.get(),b.get());var codes=new ArrayList<>(results.stream().map(HttpResponse::statusCode).toList());codes.sort(Integer::compareTo);assertEquals(List.of(200,409),codes);
        int changeId=json.readTree(results.stream().filter(r->r.statusCode()==200).findFirst().orElseThrow().body()).path("data").path("registrationId").asInt();
        assertEquals(200,supplement(staff,changeId,0).statusCode());
        int file=documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(changeId).get(0).getDocumentId();
        assertEquals(200,resubmit(own,changeId,1,List.of(file),"",0).statusCode());
        assertEquals(200,reviewRevision(staff,changeId,"APPROVE","APPROVE","Phần bổ sung ảnh và dữ liệu hợp lệ.",2).statusCode());
        assertEquals(200,api(null,"GET","/api/services/"+id+"/image",null).statusCode());
        var deletion=serviceMultipart(own,path,Map.of("operation","DELETE","serviceRevision",2,"note","Ngừng dịch vụ theo nhu cầu hiện tại."),false,null);
        assertEquals(200,deletion.statusCode());int deletionId=json.readTree(deletion.body()).path("data").path("registrationId").asInt();
        var cap=capabilities.findByUser_UserId(owner.getUserId()).get(0);cap.setStatus("INACTIVE");capabilities.save(cap);
        assertEquals(409,review(staff,deletionId,"APPROVE","APPROVE","Không được tự cấp lại quyền đã ngừng.").statusCode());
        assertEquals("ACTIVE",listings.findById(id).orElseThrow().getStatus());
        assertEquals(200,review(staff,deletionId,"APPROVE","REJECT","Từ chối yêu cầu do quyền cung cấp đã ngừng.").statusCode());
        assertEquals("INACTIVE",capabilities.findByUser_UserId(owner.getUserId()).get(0).getStatus());
        assertEquals(404,api(null,"GET","/api/services/"+id+"/image",null).statusCode());
    }
    @Test void providerCanPublishMultipleServicesAndChangesRequireApprovalIncludingDeletionAndImages() throws Exception {
        var owner=account();String own=token(owner), staff=token(account(UserRole.STAFF));
        var original=details();
        var first=serviceMultipart(own,"/api/service-registrations",original,true,cover());
        assertEquals(201,first.statusCode(),first.body());int app=json.readTree(first.body()).path("data").path("registrationId").asInt();
        assertEquals(401,api(null,"GET","/api/service-registrations/"+app+"/image",null).statusCode());
        assertEquals(200,api(staff,"GET","/api/service-registrations/"+app+"/image",null).statusCode());
        assertEquals(200,review(staff,app,"APPROVE","APPROVE","Ảnh và hồ sơ đã được xác minh.").statusCode());
        int id=listings.findByRegistration_RegistrationId(app).orElseThrow().getServiceId();
        assertEquals(200,api(null,"GET","/api/services/"+id+"/image",null).statusCode());
        var more=details();more.put("serviceName","Giặt là thứ hai");
        var second=serviceMultipart(own,"/api/service-registrations",more,true,cover());assertEquals(201,second.statusCode(),second.body());
        int secondApp=json.readTree(second.body()).path("data").path("registrationId").asInt();
        assertEquals(200,review(staff,secondApp,"APPROVE","APPROVE","Dịch vụ thứ hai đạt điều kiện công khai.").statusCode());
        assertEquals(2,listings.findByProvider_UserIdOrderByServiceIdDesc(owner.getUserId()).size());
        assertEquals("Nguyễn Văn An", json.readTree(api(null,"GET","/api/services/"+id,null).body()).path("data").path("providerName").asString());
        var edited=details();edited.put("serviceName","Dịch vụ đã sửa");edited.put("applicantName","Hoàng Anh");
        var request=Map.of("operation","UPDATE","serviceRevision",1,"details",edited,"note","Đổi tên và thay ảnh đại diện dịch vụ.");
        String path="/api/service-registrations/services/"+id+"/changes";
        assertEquals(404,serviceMultipart(token(account()),path,request,false,null).statusCode());
        assertEquals(400,serviceMultipart(own,path,request,false,"fake png".getBytes()).statusCode());
        assertEquals(1,listings.findById(id).orElseThrow().getRevision());
        var change=serviceMultipart(own,path,request,false,cover());assertEquals(200,change.statusCode(),change.body());
        int changeId=json.readTree(change.body()).path("data").path("registrationId").asInt();
        assertEquals(409,serviceMultipart(own,path,request,false,cover()).statusCode());
        assertEquals("Nguyễn Văn An", json.readTree(api(null,"GET","/api/services/"+id,null).body()).path("data").path("providerName").asString());
        assertTrue(api(null,"GET","/api/services/"+id,null).body().contains("Dịch vụ chuyển trọ"));
        assertEquals(200,review(staff,changeId,"APPROVE","REJECT","Nội dung thay đổi chưa đạt yêu cầu.").statusCode());
        assertEquals("Nguyễn Văn An", json.readTree(api(null,"GET","/api/services/"+id,null).body()).path("data").path("providerName").asString());
        assertTrue(api(null,"GET","/api/services/"+id,null).body().contains("Dịch vụ chuyển trọ"));
        change=serviceMultipart(own,path,request,false,cover());assertEquals(200,change.statusCode());
        changeId=json.readTree(change.body()).path("data").path("registrationId").asInt();
        assertEquals(200,review(staff,changeId,"APPROVE","APPROVE","Nội dung thay đổi đã được kiểm tra.").statusCode());
        assertTrue(api(null,"GET","/api/services/"+id,null).body().contains("Dịch vụ đã sửa"));
        assertEquals("Hoàng Anh", json.readTree(api(null,"GET","/api/services/"+id,null).body()).path("data").path("providerName").asString());
        var publicRows = json.readTree(api(null,"GET","/api/services",null).body()).path("data");
        boolean foundUpdatedProvider = false;
        for (var publicRow : publicRows) if (publicRow.path("serviceId").asInt() == id) {
            assertEquals("Hoàng Anh", publicRow.path("providerName").asString());
            foundUpdatedProvider = true;
        }
        assertTrue(foundUpdatedProvider);
        assertEquals(409,serviceMultipart(own,path,request,false,null).statusCode());
        var remove=Map.of("operation","DELETE","serviceRevision",2,"note","Ngừng cung cấp dịch vụ này tại khu vực.");
        var deletion=serviceMultipart(own,path,remove,false,null);assertEquals(200,deletion.statusCode(),deletion.body());
        int deleteId=json.readTree(deletion.body()).path("data").path("registrationId").asInt();
        assertEquals(200,api(null,"GET","/api/services/"+id,null).statusCode());
        assertEquals(200,review(staff,deleteId,"APPROVE","APPROVE","Duyệt ngừng công khai dịch vụ theo yêu cầu.").statusCode());
        assertEquals(404,api(null,"GET","/api/services/"+id,null).statusCode());
        assertEquals(404,api(null,"GET","/api/services/"+id+"/image",null).statusCode());
        assertEquals("DELETED",listings.findById(id).orElseThrow().getStatus());
        assertEquals(1,capabilities.findByUser_UserIdAndStatus(owner.getUserId(),"ACTIVE").size());
        assertTrue(api(own,"GET","/api/service-registrations/mine",null).body().contains("Dịch vụ đã sửa"));
        assertEquals(0,json.readTree(api(token(account()),"GET","/api/service-registrations/mine",null).body()).path("data").size());
    }
    private HttpResponse<String> supplement(String staff, int id, int revision) throws Exception {
        return api(staff, "POST", "/api/staff/service-applications/" + id + "/supplement-request", Map.of("reason", "Vui lòng bổ sung giấy phép và sửa mô tả dịch vụ.", "revision", revision));
    }
    private HttpResponse<String> resubmit(String token, int id, int revision, List<Integer> keep, String content, int count) throws Exception {
        var data = Map.of("details", details(), "revision", revision, "retainedDocumentIds", keep, "note", "Đã sửa thông tin và bổ sung tài liệu cần thiết.");
        String boundary = "SupplementBoundary";
        var body = new StringBuilder("--" + boundary + "\r\nContent-Disposition: form-data; name=\"details\"\r\nContent-Type: application/json\r\n\r\n" + json.writeValueAsString(data) + "\r\n");
        for(int i=0;i<count;i++) body.append("--").append(boundary).append("\r\nContent-Disposition: form-data; name=\"documents\"; filename=\"new.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").append(content).append("\r\n");
        body.append("--").append(boundary).append("--\r\n");
        var request = HttpRequest.newBuilder(uri("/api/service-registrations/" + id + "/resubmit")).header("Content-Type", "multipart/form-data; boundary=" + boundary);
        if(token!=null)request.header("Authorization", "Bearer " + token);
        return client.send(request.POST(HttpRequest.BodyPublishers.ofString(body.toString())).build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void supplementRoundTripKeepsIdentityPrivateFilesAndRequiresFreshReview() throws Exception {
        var owner=account(); String ownerToken=token(owner); int id=application(owner);
        String staff=token(account(UserRole.STAFF)), admin=token(account(UserRole.ADMIN));
        int oldFile=documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id).get(0).getDocumentId();
        assertEquals(200,supplement(staff,id,0).statusCode());
        assertEquals(409,supplement(admin,id,0).statusCode());
        var current=json.readTree(get(ownerToken,"/current").body()).path("data").path("registration");
        assertEquals("NEEDS_SUPPLEMENT",current.path("status").asString());
        assertTrue(current.path("requestedChanges").asString().contains("giấy phép"));
        assertFalse(current.path("capabilityActive").asBoolean());assertFalse(current.path("publicEligible").asBoolean());
        assertEquals(200,resubmit(ownerToken,id,1,List.of(oldFile),"%PDF-1.4\nnew",1).statusCode());
        assertEquals(1,registrations.findByUser_UserIdOrderByRegistrationIdDesc(owner.getUserId()).size());
        assertEquals(2,documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id).size());
        assertEquals(409,resubmit(ownerToken,id,1,List.of(oldFile),"%PDF-1.4\nnew",1).statusCode());
        assertEquals(409,reviewRevision(staff,id,"APPROVE","APPROVE","Màn hình cũ không được duyệt phiên bản mới.",0).statusCode());
        assertTrue(capabilities.findByUser_UserId(owner.getUserId()).isEmpty());
        assertFalse(listings.existsByRegistration_RegistrationId(id));
        assertEquals(200,supplement(admin,id,2).statusCode());
        assertEquals(200,resubmit(ownerToken,id,3,List.of(),"%PDF-1.4\nreplacement",1).statusCode());
        assertEquals(404,get(ownerToken,"/documents/"+oldFile).statusCode());
        assertEquals(200,reviewRevision(admin,id,"APPROVE","APPROVE","Thông tin bổ sung đã được xác minh đầy đủ.",4).statusCode());
        var receipt=json.readTree(get(ownerToken,"/current").body()).path("data").path("registration");
        assertEquals(5,receipt.path("revision").asInt());assertTrue(receipt.path("publicEligible").asBoolean());
        assertEquals(200,api(null,"GET","/api/services/"+receipt.path("serviceId").asInt(),null).statusCode());
        assertEquals(5,logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION",id).size());
    }
    @Test void supplementGuardsOwnershipFilesRollbackAndConcurrentResubmissions() throws Exception {
        var owner=account();String own=token(owner);int id=application(owner);String staff=token(account(UserRole.STAFF));
        int file=documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id).get(0).getDocumentId();
        var other=account();String foreign=token(other);int otherId=application(other);
        int foreignFile=documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(otherId).get(0).getDocumentId();
        assertEquals(403,supplement(own,id,0).statusCode());
        assertEquals(200,supplement(staff,id,0).statusCode());
        assertEquals(401,resubmit(null,id,1,List.of(file),"",0).statusCode());
        assertEquals(404,resubmit(foreign,id,1,List.of(file),"",0).statusCode());
        assertEquals(400,resubmit(own,id,1,List.of(foreignFile),"",0).statusCode());
        assertEquals(400,resubmit(own,id,1,List.of(file,file),"",0).statusCode());

        assertEquals(400,resubmit(own,id,1,List.of(file),"%PDF-1.4\nfile",5).statusCode());
        assertEquals(400,resubmit(own,id,1,List.of(),"fake pdf",1).statusCode());
        assertTrue(documents.existsById(file));
        assertEquals(1,registrations.findById(id).orElseThrow().getRevision());
        assertEquals(RegistrationStatus.NEEDS_SUPPLEMENT,registrations.findById(id).orElseThrow().getStatus());
        java.util.function.Supplier<Integer> action=()->{try{return resubmit(own,id,1,List.of(file),"",0).statusCode();}catch(Exception e){throw new RuntimeException(e);}};
        var first=java.util.concurrent.CompletableFuture.supplyAsync(action);var second=java.util.concurrent.CompletableFuture.supplyAsync(action);
        var codes=new ArrayList<>(List.of(first.get(),second.get()));codes.sort(Integer::compareTo);assertEquals(List.of(200,409),codes);
        assertEquals(404,get(foreign,"/documents/"+file).statusCode());
        assertTrue(capabilities.findByUser_UserId(owner.getUserId()).isEmpty());
        assertEquals(200,reviewRevision(staff,id,"REJECT","REJECT","Tài liệu bổ sung vẫn chưa đáp ứng yêu cầu.",2).statusCode());
        assertEquals(409,resubmit(own,id,3,List.of(file),"",0).statusCode());
        assertFalse(listings.existsByRegistration_RegistrationId(id));
    }
    @Test void supplementAndFinalReviewRaceCannotBothSucceed() throws Exception {
        var owner=account();int id=application(owner);String staff=token(account(UserRole.STAFF));
        assertEquals(400,api(staff,"POST","/api/staff/service-applications/"+id+"/supplement-request",Map.of("reason","          ","revision",0)).statusCode());
        assertEquals(400,api(staff,"POST","/api/staff/service-applications/"+id+"/review",Map.of("reason","Đã xem hồ sơ đầy đủ.","capabilityDecision","APPROVE","listingDecision","APPROVE")).statusCode());
        var first=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{return supplement(staff,id,0).statusCode();}catch(Exception e){throw new RuntimeException(e);}});
        var second=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{return review(staff,id,"APPROVE","APPROVE","Hồ sơ đã được xác minh đầy đủ.").statusCode();}catch(Exception e){throw new RuntimeException(e);}});
        var codes=new ArrayList<>(List.of(first.get(),second.get()));codes.sort(Integer::compareTo);assertEquals(List.of(200,409),codes);
        assertEquals(1,logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION",id).size());
        var row=registrations.findById(id).orElseThrow();
        assertEquals(row.getStatus()==RegistrationStatus.APPROVED,listings.existsByRegistration_RegistrationId(id));
        assertEquals(row.getStatus()==RegistrationStatus.APPROVED,!capabilities.findByUser_UserId(owner.getUserId()).isEmpty());
    }
    @Test void everyStaffAndAdminCanReadAndReviewWithoutAssignment() throws Exception {
        var owner = account(); int id = application(owner); String admin = token(account(UserRole.ADMIN));
        var staff = account(UserRole.STAFF); String staffToken = token(staff);
        String path = "/api/staff/service-applications/" + id;
        assertEquals(200, api(staffToken, "GET", path, null).statusCode());
        assertEquals(200, api(admin, "GET", path, null).statusCode());
        assertFalse(api(null, "GET", "/api/services", null).body().contains("registrationId"));
        var detail = json.readTree(api(staffToken, "GET", path, null).body()).path("data");
        assertTrue(detail.path("application").path("assignedStaffId").isNull());
        int fileId = detail.path("application").path("documents").get(0).path("documentId").asInt();
        var file = api(staffToken, "GET", path + "/files/" + fileId, null);
        assertEquals(200, file.statusCode()); assertTrue(file.body().startsWith("%PDF-"));
        assertEquals("private, no-store", file.headers().firstValue("Cache-Control").orElse(""));
        String otherStaff = token(account(UserRole.STAFF));
        assertEquals(200, api(otherStaff, "GET", path + "/files/" + fileId, null).statusCode());
        assertTrue(api(otherStaff, "GET", "/api/staff/service-applications", null).body().contains("\"registrationId\":" + id + ","));
        assertTrue(api(otherStaff, "GET", "/api/staff/dashboard", null).body().contains("SERVICE-" + id));
        assertEquals(403, api(token(owner), "GET", path, null).statusCode());
        var result = review(staffToken, id, "APPROVE", "APPROVE", "Thông tin và tài liệu đã được xác minh.");
        assertEquals(200, result.statusCode(), result.body());
        var reviewed = json.readTree(result.body()).path("data").path("application");
        assertEquals("APPROVED", reviewed.path("status").asString());
        assertFalse(reviewed.path("reviewedAt").isNull());
        assertEquals(1, capabilities.findByUser_UserIdAndStatus(owner.getUserId(), "ACTIVE").size());
        var published = listings.findAll().stream().filter(s -> s.getRegistration() != null && s.getRegistration().getRegistrationId().equals(id)).findFirst().orElseThrow();
        var publicResult = api(null, "GET", "/api/services/" + published.getServiceId(), null);
        assertEquals(200, publicResult.statusCode(), publicResult.body());
        assertTrue(publicResult.body().contains("Tân Xã")); assertFalse(publicResult.body().contains("documents"));
        assertEquals(409, review(staffToken, id, "APPROVE", "APPROVE", "Yêu cầu trùng không được ghi thêm.").statusCode());
        assertEquals(409, review(admin, id, "REJECT", "REJECT", "Admin không thể ghi đè hồ sơ đã duyệt.").statusCode());
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION", id).size());
        var cap = capabilities.findByUser_UserId(owner.getUserId()).get(0); cap.setStatus("INACTIVE"); capabilities.save(cap);
        assertEquals(404, api(null, "GET", "/api/services/" + published.getServiceId(), null).statusCode());
    }
    @Test void capabilityAndListingDecisionsAreIndependentAndRejectionsDoNotPublish() throws Exception {
        var staff = account(UserRole.STAFF); String staffToken = token(staff);
        var rejected = account(); int rejectedId = application(rejected);
        assertEquals(200, review(staffToken, rejectedId, "REJECT", "REJECT", "Tài liệu không xác minh được người đăng ký.").statusCode());
        assertTrue(capabilities.findByUser_UserId(rejected.getUserId()).isEmpty());
        assertFalse(listings.existsByRegistration_RegistrationId(rejectedId));
        var provider = account(); int providerId = application(provider);
        assertEquals(200, review(staffToken, providerId, "APPROVE", "REJECT", "Đủ điều kiện cung cấp dịch vụ, nội dung giá chưa phù hợp.").statusCode());
        assertEquals(1, capabilities.findByUser_UserIdAndStatus(provider.getUserId(), "ACTIVE").size());
        assertFalse(listings.existsByRegistration_RegistrationId(providerId));
        var current = json.readTree(get(token(provider), "/current").body()).path("data").path("registration");
        assertEquals("APPROVE", current.path("capabilityDecision").asString());
        assertEquals("REJECT", current.path("listingDecision").asString());
        assertTrue(current.path("capabilityActive").asBoolean());
        assertTrue(current.path("serviceId").isNull());
        assertFalse(current.path("publicEligible").asBoolean());
    }
    @Test void reviewRejectsUnauthorizedInvalidAndSelfReviewButAdminInheritsStaffReview() throws Exception {
        var owner = account(); int id = application(owner);
        String admin = token(account(UserRole.ADMIN)); var staff = account(UserRole.STAFF); String staffToken = token(staff);
        assertEquals(401, api(null, "GET", "/api/staff/service-applications", null).statusCode());
        assertEquals(403, review(token(owner), id, "APPROVE", "APPROVE", "Người dùng không có quyền xét duyệt.").statusCode());
        assertEquals(403, review(token(account(UserRole.ROOM_HOST)), id, "APPROVE", "APPROVE", "Role Host không có quyền xét duyệt.").statusCode());
        assertEquals(400, review(staffToken, id, "REJECT", "REJECT", " ").statusCode());
        assertEquals(400, review(staffToken, id, "REJECT", "APPROVE", "Không được công khai khi từ chối quyền.").statusCode());
        assertEquals(400, review(staffToken, id, "OTHER", "REJECT", "Quyết định không thuộc giá trị cho phép.").statusCode());
        assertTrue(capabilities.findByUser_UserId(owner.getUserId()).isEmpty());
        assertEquals(200, review(admin, id, "REJECT", "REJECT", "Admin được kế thừa quyền xét duyệt của Staff.").statusCode());
        int self = application(staff);
        assertEquals(403, review(staffToken, self, "APPROVE", "APPROVE", "Không thể duyệt hồ sơ của chính mình.").statusCode());
        assertEquals(200, review(admin, self, "REJECT", "REJECT", "Admin khác có thể duyệt hồ sơ nhân viên.").statusCode());
    }
    @Test void concurrentReviewsDoNotDuplicateCapabilityListingOrAudit() throws Exception {
        var owner = account(); int id = application(owner); var staff = account(UserRole.STAFF); String staffToken = token(staff);
        String admin = token(account(UserRole.ADMIN));
        java.util.function.Supplier<Integer> action = () -> {
            try { return review(staffToken, id, "APPROVE", "APPROVE", "Đã kiểm tra giấy tờ và nội dung dịch vụ.").statusCode(); }
            catch (Exception error) { throw new RuntimeException(error); }
        };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var second = java.util.concurrent.CompletableFuture.supplyAsync(() -> {
            try { return review(admin, id, "APPROVE", "APPROVE", "Admin duyệt đồng thời với nhân viên.").statusCode(); }
            catch (Exception error) { throw new RuntimeException(error); }
        });
        var codes = new ArrayList<>(List.of(first.get(), second.get())); codes.sort(Integer::compareTo);
        assertEquals(List.of(200, 409), codes);
        assertEquals(1, capabilities.findByUser_UserId(owner.getUserId()).size());
        assertTrue(listings.existsByRegistration_RegistrationId(id));
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION", id).size());
    }
    @Test void serviceOwnerCapabilityDoesNotReplaceAnyAccountRoleAndOwnerSeesPublicationResult() throws Exception {
        String admin = token(account(UserRole.ADMIN));
        for (var role : UserRole.values()) {
            var values = details();
            String pricingType = role == UserRole.STAFF ? "NEGOTIABLE" : role == UserRole.ROOM_HOST ? "FROM" : "FIXED";
            values.put("pricingType", pricingType); if (pricingType.equals("NEGOTIABLE")) values.remove("price");
            var owner = account(role); int applicationId = application(owner, values); String ownerToken = token(owner);
            var before = json.readTree(api(ownerToken, "GET", "/api/auth/me", null).body()).path("data");
            assertEquals(role.name(), before.path("role").asString());
            assertEquals(0, before.path("capabilities").size());
            var approved = review(admin, applicationId, "APPROVE", "APPROVE", "Hồ sơ đủ điều kiện cấp quyền Service Owner.");
            assertEquals(200, approved.statusCode(), approved.body());
            assertEquals(role, users.findById(owner.getUserId()).orElseThrow().getRole());
            var after = json.readTree(api(ownerToken, "GET", "/api/auth/me", null).body()).path("data");
            assertEquals(role.name(), after.path("role").asString());
            assertTrue(after.path("capabilities").toString().contains("MANAGE_SERVICE"));
            var receipt = json.readTree(get(ownerToken, "/current").body()).path("data").path("registration");
            assertEquals(owner.getUserId(), receipt.path("providerId").asInt());
            assertTrue(receipt.path("serviceId").asInt() > 0);
            assertTrue(receipt.path("capabilityActive").asBoolean());
            assertTrue(receipt.path("publicEligible").asBoolean());
            assertEquals("ACTIVE", receipt.path("serviceState").asString());
            assertEquals("APPROVE", receipt.path("listingDecision").asString());
            assertFalse(receipt.path("reviewedAt").isNull());
            var publicListing = json.readTree(api(null, "GET", "/api/services/" + receipt.path("serviceId").asInt(), null).body()).path("data");
            assertEquals(pricingType.equals("NEGOTIABLE") ? "Thỏa thuận" : pricingType.equals("FROM") ? "Từ 150.000 VNĐ" : "150.000 VNĐ", publicListing.path("pricingLabel").asString());
        }
    }
    @Test void publicCatalogueFiltersDatabaseCategoriesAndOmitsEveryIneligibleState() throws Exception {
        String reviewer = token(account(UserRole.STAFF));
        var categoryRows = json.readTree(api(null, "GET", "/api/services/categories", null).body()).path("data");
        assertTrue(categoryRows.size() >= 4);
        var category = categories.save(ServiceCategory.builder().name("Danh mục kiểm thử " + UUID.randomUUID()).build());
        assertEquals(0, json.readTree(api(null, "GET", "/api/services?categoryId=" + category.getCategoryId(), null).body()).path("data").size());
        var owner = account(); var values = details(); values.put("categoryId", category.getCategoryId()); values.put("pricingType", "FROM");
        var submitted = submit(token(owner), values, "%PDF-1.4\ntest document", 1);
        int id = json.readTree(submitted.body()).path("data").path("registrationId").asInt();
        assertEquals(200, review(reviewer, id, "APPROVE", "APPROVE", "Dịch vụ đã được xác minh trước khi công khai.").statusCode());
        var published = listings.findByRegistration_RegistrationId(id).orElseThrow(); int serviceId = published.getServiceId();
        var filtered = api(null, "GET", "/api/services?categoryId=" + category.getCategoryId(), null);
        assertEquals(200, filtered.statusCode(), filtered.body());
        var publicRow = json.readTree(filtered.body()).path("data").get(0);
        assertEquals(1, json.readTree(filtered.body()).path("data").size());
        assertEquals(serviceId, publicRow.path("serviceId").asInt());
        assertEquals(owner.getUserId(), publicRow.path("providerId").asInt());
        assertEquals("Từ 150.000 VNĐ", publicRow.path("pricingLabel").asString());
        assertEquals("0987654321", publicRow.path("contactPhone").asString());
        assertEquals("contact@example.com", publicRow.path("contactEmail").asString());
        assertTrue(publicRow.path("publicEligible").asBoolean());
        assertFalse(filtered.body().contains("documents"));
        for (String invalid : List.of("0", "-1", "abc", "2147483648")) assertEquals(400, api(null, "GET", "/api/services?categoryId=" + invalid, null).statusCode());
        assertEquals(400, api(null, "GET", "/api/services/invalid", null).statusCode());
        published.setStatus("INACTIVE"); listings.save(published);
        assertEquals(404, api(null, "GET", "/api/services/" + serviceId, null).statusCode());
        assertFalse(json.readTree(get(token(owner), "/current").body()).path("data").path("registration").path("publicEligible").asBoolean());
        published.setStatus("ACTIVE"); listings.save(published);
        owner.setStatus(UserStatus.INACTIVE); users.save(owner);
        assertEquals(404, api(null, "GET", "/api/services/" + serviceId, null).statusCode());
        owner.setStatus(UserStatus.ACTIVE); users.save(owner);
        var registration = registrations.findById(id).orElseThrow(); registration.setListingDecision("REJECT"); registrations.save(registration);
        assertEquals(404, api(null, "GET", "/api/services/" + serviceId, null).statusCode());
        assertEquals(0, json.readTree(api(null, "GET", "/api/services?categoryId=" + category.getCategoryId(), null).body()).path("data").size());
    }
    @Test void submissionPersistsFullProfileAndPrivateDocumentsWithoutGrantingCapability() throws Exception {
        var applicant = account(); String auth = token(applicant);
        assertTrue(json.readTree(get(auth, "/categories").body()).path("data").size() >= 4);
        assertTrue(json.readTree(get(auth, "/current").body()).path("data").path("canRegister").asBoolean());
        var response = submit(auth, details(), "%PDF-1.4\nverification document", 1);
        assertEquals(201, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals(applicant.getUserId(), data.path("applicantId").asInt());
        assertEquals("PENDING", data.path("status").asString());
        assertEquals("FIXED", data.path("pricingType").asString());
        assertEquals(150000, data.path("price").asInt());
        assertEquals("Tân Xã, Thạch Hòa", data.path("serviceArea").asString());
        assertEquals("Nguyễn Văn An", data.path("applicantName").asString());
        assertEquals("0987654321", data.path("contactPhone").asString());
        assertNotNull(registrations.findById(data.path("registrationId").asInt()).orElseThrow().getCreatedAt());
        assertTrue(capabilities.findByUser_UserId(applicant.getUserId()).isEmpty());
        int fileId = data.path("documents").get(0).path("documentId").asInt();
        assertTrue(get(auth, "/documents/" + fileId).body().startsWith("%PDF-1.4"));
        assertEquals(404, get(token(account()), "/documents/" + fileId).statusCode());
        assertEquals(401, get(null, "/documents/" + fileId).statusCode());
        var current = json.readTree(get(auth, "/current").body()).path("data");
        assertFalse(current.path("canRegister").asBoolean());
        assertEquals("PENDING", current.path("registration").path("status").asString());
        assertEquals(409, submit(auth, details(), "%PDF-1.4\nfile", 1).statusCode());
    }
    @Test void submissionAllowsNoVerificationDocuments() throws Exception {
        String auth = token(account());
        var response = submit(auth, details(), "", 0);
        assertEquals(201, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals(0, data.path("documents").size());
        int id = data.path("registrationId").asInt();
        var row = registrations.findById(id).orElseThrow();
        row.setStatus(RegistrationStatus.NEEDS_SUPPLEMENT);
        registrations.save(row);
        var result = resubmit(auth, id, row.getRevision(), List.of(), "", 0);
        assertEquals(200, result.statusCode(), result.body());
        assertEquals(0, json.readTree(result.body()).path("data").path("documents").size());
        assertEquals(200, reviewRevision(token(account(UserRole.STAFF)), id, "APPROVE", "APPROVE", "", 1).statusCode());
    }
    @Test void invalidSubmissionsRollbackTheWholeProfile() throws Exception {
        var applicant = account(); String auth = token(applicant);
        assertEquals(401, submit(null, details(), "%PDF-1.4\nfile", 1).statusCode());
        assertEquals(400, submit(auth, details(), "fake pdf", 1).statusCode());
        assertEquals(400, submit(auth, details(), "%PDF-1.4\nfile", 6).statusCode());
        for (var invalid : List.of(Map.entry("price", (Object)(-1)), Map.entry("price", (Object)0), Map.entry("pricingType", (Object)"INVALID"),
                Map.entry("categoryId", (Object)Integer.MAX_VALUE), Map.entry("contactPhone", (Object)"123"), Map.entry("description", (Object)"  "),
                Map.entry("serviceName", (Object)"  "), Map.entry("contactEmail", (Object)"invalid"))) {
            var value = details(); value.put(invalid.getKey(), invalid.getValue());
            assertEquals(400, submit(auth, value, "%PDF-1.4\nfile", 1).statusCode(), invalid.getKey());
        }
        assertTrue(registrations.findByUser_UserIdOrderByRegistrationIdDesc(applicant.getUserId()).isEmpty());
    }
    @Test void existingCapabilityAllowsMoreServicesWhileSupplementBlocksUnapprovedApplicant() throws Exception {
        var applicant = account(); String auth = token(applicant);
        capabilities.save(UserCapability.builder().user(applicant).capability(capabilityTypes.findByCode("MANAGE_SERVICE").orElseThrow()).status("ACTIVE").build());
        assertEquals(201, submit(auth, details(), "%PDF-1.4\nfile", 1).statusCode());
        var other = account(); String otherAuth = token(other);
        var previous = registrations.save(ServiceRegistration.builder().user(other).category(categories.findAll().get(0))
                .serviceName("Hồ sơ trước").status(RegistrationStatus.NEEDS_SUPPLEMENT).build());
        assertEquals(409, submit(otherAuth, details(), "%PDF-1.4\nfile", 1).statusCode());
        previous.setStatus(RegistrationStatus.REJECTED); registrations.save(previous);
        var value = details(); value.put("pricingType", "NEGOTIABLE"); value.remove("price");
        assertEquals(201, submit(otherAuth, value, "%PDF-1.4\nfile", 1).statusCode());
    }
    @Test void concurrentRequestsCreateOnlyOnePendingProfile() throws Exception {
        var applicant = account(); String auth = token(applicant); var value = details();
        java.util.function.Supplier<Integer> action = () -> {
            try { return submit(auth, value, "%PDF-1.4\nfile", 1).statusCode(); }
            catch (Exception error) { throw new RuntimeException(error); }
        };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var second = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var codes = new ArrayList<>(List.of(first.get(), second.get())); codes.sort(Integer::compareTo);
        assertEquals(List.of(201, 409), codes);
        assertEquals(1, registrations.findByUser_UserIdOrderByRegistrationIdDesc(applicant.getUserId()).size());
    }

    private int publicListing(User owner, String staff) throws Exception {
        int id = application(owner);
        assertEquals(200, review(staff, id, "APPROVE", "APPROVE", "").statusCode());
        return listings.findByRegistration_RegistrationId(id).orElseThrow().getServiceId();
    }
    private HttpResponse<String> rate(String who, int id, int stars, byte[] image) throws Exception {
        return serviceMultipart(who, "/api/services/" + id + "/ratings", Map.of("stars", stars, "content", "Đánh giá trải nghiệm dịch vụ thực tế."), false, image);
    }
    private HttpResponse<String> report(String who, int id, byte[] image) throws Exception {
        return serviceMultipart(who, "/api/service-complaints", Map.of("serviceId", id, "content", "Đã chuyển khoản nhưng không được cung cấp dịch vụ."), false, image);
    }
    private HttpResponse<String> decide(String who, int id, int revision, String action) throws Exception {
        return api(who, "POST", "/api/staff/service-complaints/" + id + "/review", Map.of("revision", revision, "action", action, "content", "Vui lòng kiểm tra và trình báo lại giao dịch này."));
    }
    @Test void ratingsSupportZeroStarsFilteringOnePerUserAndOwnerReply() throws Exception {
        var owner = account(); String own = token(owner), staff = token(account(UserRole.STAFF)), customer = token(account());
        int id = publicListing(owner, staff); String path = "/api/services/" + id + "/ratings";
        assertEquals(401, api(null, "POST", path, null).statusCode());
        assertEquals(403, rate(own, id, 5, null).statusCode());
        assertEquals(400, rate(customer, id, -1, null).statusCode());
        assertEquals(400, rate(customer, id, 6, null).statusCode());
        assertEquals(400, serviceMultipart(customer, path, Map.of("stars", 5.9, "content", "Nội dung đánh giá"), false, null).statusCode());
        assertEquals(400, serviceMultipart(customer, path, Map.of("stars", 2.5, "content", "Nội dung đánh giá"), false, null).statusCode());
        assertEquals(400, rate(customer, id, 0, "not an image".getBytes()).statusCode());
        var created = rate(customer, id, 0, cover()); assertEquals(201, created.statusCode(), created.body());
        var rating = json.readTree(created.body()).path("data"); int ratingId = rating.path("ratingId").asInt();
        assertEquals(409, rate(customer, id, 5, null).statusCode());
        assertEquals(201, rate(token(account()), id, 5, null).statusCode());
        var all = json.readTree(api(null, "GET", path, null).body()).path("data");
        assertEquals(2, all.path("total").asInt()); assertEquals(2.5, all.path("average").asDouble());
        assertEquals(1, all.path("counts").get(0).asInt()); assertEquals(1, all.path("counts").get(5).asInt());
        var filtered = json.readTree(api(customer, "GET", path + "?stars=0", null).body()).path("data");
        assertEquals(1, filtered.path("filteredTotal").asInt()); assertEquals(ratingId, filtered.path("mine").path("ratingId").asInt());
        assertEquals(0, filtered.path("items").get(0).path("stars").asInt());
        assertEquals(400, api(null, "GET", path + "?stars=6", null).statusCode());
        assertEquals(400, api(null, "GET", path + "?page=-1", null).statusCode());
        assertEquals(200, api(null, "GET", rating.path("imageUrls").get(0).asString(), null).statusCode());
        assertEquals(404, api(null, "GET", path + "/" + ratingId + "/images/1", null).statusCode());
        String replyPath = "/api/service-ratings/" + ratingId + "/reply";
        assertEquals(403, api(customer, "POST", replyPath, Map.of("content", "Phản hồi giả mạo")).statusCode());
        assertEquals(403, api(staff, "POST", replyPath, Map.of("content", "Phản hồi giả mạo")).statusCode());
        assertEquals(200, api(own, "POST", replyPath, Map.of("content", "Chúng tôi sẽ kiểm tra lại và liên hệ hỗ trợ.")).statusCode());
        assertEquals(409, api(own, "POST", replyPath, Map.of("content", "Gửi lại lần nữa")).statusCode());
        assertTrue(api(null, "GET", path, null).body().contains("Chúng tôi sẽ kiểm tra lại"));
    }
    @Test void concurrentRatingsPersistOnlyOnceAndImagesAreValidated() throws Exception {
        String staff = token(account(UserRole.STAFF)), customer = token(account());
        int id = publicListing(account(), staff); String path = "/api/services/" + id + "/ratings";
        assertEquals(400, serviceMultipart(customer, path, Map.of("stars", 5, "content", "   "), false, null).statusCode());
        assertEquals(400, serviceMultipart(customer, path, Map.of("stars", 5, "content", "Nội dung đánh giá"), false, cover(), cover(), cover(), cover(), cover(), cover()).statusCode());
        assertEquals(400, rate(customer, id, 5, new byte[5 * 1024 * 1024 + 1]).statusCode());
        java.util.function.Supplier<Integer> action = () -> { try { return rate(customer, id, 4, null).statusCode(); } catch (Exception e) { throw new RuntimeException(e); } };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(action); var second = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var codes = new ArrayList<>(List.of(first.get(), second.get())); codes.sort(Integer::compareTo);
        assertEquals(List.of(201, 409), codes);
        assertEquals(1, json.readTree(api(null, "GET", path, null).body()).path("data").path("total").asInt());
    }
    @Test void complaintEvidenceIsPrivateAndExplanationReturnsToStaffWithHistory() throws Exception {
        var owner = account(); String own = token(owner), customer = token(account()), outsider = token(account()), staff = token(account(UserRole.STAFF)), admin = token(account(UserRole.ADMIN));
        int id = publicListing(owner, staff);
        assertEquals(401, api(null, "POST", "/api/service-complaints", null).statusCode());
        assertEquals(403, report(own, id, null).statusCode());
        assertEquals(400, report(customer, id, "fake image".getBytes()).statusCode());
        var submitted = report(customer, id, cover()); assertEquals(201, submitted.statusCode(), submitted.body());
        var data = json.readTree(submitted.body()).path("data"); int complaintId = data.path("complaint").path("complaintId").asInt();
        String path = "/api/service-complaints/" + complaintId, image = data.path("imageUrls").get(0).asString();
        assertEquals(409, report(customer, id, null).statusCode());
        assertEquals(401, api(null, "GET", image, null).statusCode());
        assertEquals(404, api(outsider, "GET", image, null).statusCode());
        assertEquals(404, api(outsider, "GET", path, null).statusCode());
        for (String actor : List.of(own, customer, staff, admin)) assertEquals(200, api(actor, "GET", image, null).statusCode());
        assertEquals(403, api(customer, "GET", "/api/staff/service-complaints", null).statusCode());
        assertTrue(api(staff, "GET", "/api/staff/service-complaints", null).body().contains("Đã chuyển khoản"));
        assertTrue(api(staff, "GET", "/api/staff/dashboard", null).body().contains("/staff/service-complaints?id=" + complaintId));
        assertEquals(200, decide(staff, complaintId, 0, "REQUEST_EXPLANATION").statusCode());
        assertEquals(409, decide(admin, complaintId, 0, "REMOVE").statusCode());
        var explanation = Map.of("revision", 1, "content", "Chúng tôi đã hoàn trả tiền, gửi kèm bằng chứng.");
        assertEquals(404, serviceMultipart(customer, path + "/explanation", explanation, false, cover()).statusCode());
        assertEquals(400, serviceMultipart(own, path + "/explanation", explanation, false, "bad".getBytes()).statusCode());
        var explained = serviceMultipart(own, path + "/explanation", explanation, false, cover());
        assertEquals(200, explained.statusCode(), explained.body());
        var explainedData = json.readTree(explained.body()).path("data");
        assertEquals("EXPLAINED", explainedData.path("complaint").path("status").asString());
        assertEquals(2, explainedData.path("history").size());
        String proof = explainedData.path("history").get(1).path("imageUrls").get(0).asString();
        assertEquals(404, api(outsider, "GET", proof, null).statusCode());
        assertEquals(200, api(staff, "GET", proof, null).statusCode());
        assertEquals(409, serviceMultipart(own, path + "/explanation", explanation, false, null).statusCode());
        assertEquals(200, decide(admin, complaintId, 2, "DISMISS").statusCode());
        assertEquals(409, decide(staff, complaintId, 3, "REMOVE").statusCode());
        assertEquals(200, api(null, "GET", "/api/services/" + id, null).statusCode());
        assertEquals(3, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_COMPLAINT", complaintId).size());
    }
    @Test void removalBlocksAllPublicAccessAndApprovedUpdatesCannotRepublish() throws Exception {
        var owner = account(); String own = token(owner), staff = token(account(UserRole.STAFF)), customer = token(account());
        int id = publicListing(owner, staff);
        var rating = json.readTree(rate(customer, id, 3, cover()).body()).path("data");
        var reported = report(customer, id, null); int complaintId = json.readTree(reported.body()).path("data").path("complaint").path("complaintId").asInt();
        assertEquals(200, decide(staff, complaintId, 0, "REMOVE").statusCode());
        assertTrue(listings.findById(id).orElseThrow().isModerationHidden());
        for (String path : List.of("/api/services/" + id, "/api/services/" + id + "/image", "/api/services/" + id + "/ratings", rating.path("imageUrls").get(0).asString()))
            assertEquals(404, api(null, "GET", path, null).statusCode(), path);
        assertEquals(404, rate(token(account()), id, 5, null).statusCode());
        assertEquals(409, api(customer, "POST", "/api/service-requests", customerRequest(id)).statusCode());
        var value = details(); value.put("serviceName", "Thông tin mới sau khi bị gỡ");
        var change = serviceMultipart(own, "/api/service-registrations/services/" + id + "/changes",
                Map.of("operation", "UPDATE", "serviceRevision", listings.findById(id).orElseThrow().getRevision(), "details", value, "note", "Cập nhật thông tin của dịch vụ"), false, null);
        assertEquals(200, change.statusCode(), change.body());
        int proposal = json.readTree(change.body()).path("data").path("registrationId").asInt();
        assertEquals(200, review(staff, proposal, "APPROVE", "APPROVE", "").statusCode());
        assertEquals(404, api(null, "GET", "/api/services/" + id, null).statusCode());
        assertFalse(api(null, "GET", "/api/services", null).body().contains("Thông tin mới sau khi bị gỡ"));
        assertTrue(api(own, "GET", "/api/service-complaints/incoming", null).body().contains("REMOVED"));
    }
    @Test void staffCannotModerateOwnServiceOrOwnReportAndConcurrentDecisionsAreSafe() throws Exception {
        var owner = account(UserRole.STAFF); String own = token(owner), staff = token(account(UserRole.STAFF)), admin = token(account(UserRole.ADMIN));
        int id = publicListing(owner, staff);
        int complaintId = json.readTree(report(staff, id, null).body()).path("data").path("complaint").path("complaintId").asInt();
        assertEquals(403, decide(own, complaintId, 0, "REMOVE").statusCode());
        assertEquals(403, decide(staff, complaintId, 0, "DISMISS").statusCode());
        java.util.function.Supplier<Integer> action = () -> { try { return decide(admin, complaintId, 0, "REMOVE").statusCode(); } catch (Exception e) { throw new RuntimeException(e); } };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(action); var second = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var codes = new ArrayList<>(List.of(first.get(), second.get())); codes.sort(Integer::compareTo);
        assertEquals(List.of(200, 409), codes);
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_COMPLAINT", complaintId).size());
    }

    private Map<String,Object> customerRequest(int serviceId) {
        return Map.of("serviceId", serviceId, "contactName", "Khách thử nghiệm", "contactPhone", "0987654321",
                "description", "Cần vệ sinh phòng và nhà tắm", "address", "Hòa Lạc",
                "scheduledAt", java.time.OffsetDateTime.now(java.time.ZoneOffset.ofHours(7)).plusDays(2).toString());
    }
    @Test void customerRequestsFollowApprovedListingAndOwnerResponse() throws Exception {
        var owner = account(); var customer = account();
        String own = token(owner), guest = token(customer), outsider = token(account()), staff = token(account(UserRole.STAFF));
        int app = application(owner);
        assertEquals(200, review(staff, app, "APPROVE", "APPROVE", "").statusCode());
        int serviceId = listings.findByRegistration_RegistrationId(app).orElseThrow().getServiceId();
        var revised = details(); revised.put("price", 180000);
        var proposal = serviceMultipart(own, "/api/service-registrations/services/"+serviceId+"/changes",
                Map.of("operation","UPDATE","serviceRevision",1,"details",revised,"note","Cập nhật giá phục vụ mới"),false,null);
        assertEquals(200,proposal.statusCode(),proposal.body());
        int proposalId=json.readTree(proposal.body()).path("data").path("registrationId").asInt();
        var comparison=json.readTree(api(staff,"GET","/api/staff/service-applications/"+proposalId,null).body()).path("data");
        assertEquals(150000,comparison.path("currentListing").path("price").asInt());
        assertEquals(180000,comparison.path("application").path("price").asInt());
        assertEquals(200,review(staff,proposalId,"APPROVE","APPROVE","").statusCode());
        assertEquals(180000,json.readTree(api(null,"GET","/api/services/"+serviceId,null).body()).path("data").path("price").asInt());
        assertEquals(1,json.readTree(get(own,"/services").body()).path("data").size());
        assertEquals(0,json.readTree(get(outsider,"/services").body()).path("data").size());
        assertEquals(401, api(null,"POST","/api/service-requests",customerRequest(serviceId)).statusCode());
        assertEquals(400, api(own,"POST","/api/service-requests",customerRequest(serviceId)).statusCode());
        var created = api(guest,"POST","/api/service-requests",customerRequest(serviceId));
        assertEquals(201, created.statusCode(), created.body());
        var data = json.readTree(created.body()).path("data"); int id = data.path("requestId").asInt();
        assertEquals("PENDING",data.path("status").asString());
        assertEquals(404,api(outsider,"GET","/api/service-requests/"+id,null).statusCode());
        assertEquals(404,api(outsider,"POST","/api/service-requests/"+id+"/response",Map.of("decision","ACCEPTED","revision",0)).statusCode());
        assertEquals(1,json.readTree(api(own,"GET","/api/service-requests/incoming",null).body()).path("data").size());
        assertEquals(0,json.readTree(api(outsider,"GET","/api/service-requests/mine",null).body()).path("data").size());
        var accepted=api(own,"POST","/api/service-requests/"+id+"/response",Map.of("decision","ACCEPTED","revision",0));
        assertEquals(200,accepted.statusCode(),accepted.body());
        var result=json.readTree(api(guest,"GET","/api/service-requests/"+id,null).body()).path("data");
        assertEquals("ACCEPTED",result.path("status").asString());
        assertEquals(owner.getUserId(),result.path("handledBy").asInt());
        assertFalse(result.path("handledAt").isNull());
        assertEquals(409,api(own,"POST","/api/service-requests/"+id+"/response",Map.of("decision","REJECTED","reason","Đã kín lịch phục vụ","revision",0)).statusCode());
    }
    @Test void requestsValidateFutureTimeAndCannotAcceptDisabledListing() throws Exception {
        var owner=account(); String own=token(owner), customer=token(account()), staff=token(account(UserRole.STAFF));
        int app=application(owner); review(staff,app,"APPROVE","APPROVE","");
        var listing=listings.findByRegistration_RegistrationId(app).orElseThrow(); int serviceId=listing.getServiceId();
        var past=new HashMap<>(customerRequest(serviceId)); past.put("scheduledAt","2020-01-01T09:00:00+07:00");
        assertEquals(400,api(customer,"POST","/api/service-requests",past).statusCode());
        past.put("scheduledAt","2099-01-01T09:00:00");
        assertEquals(400,api(customer,"POST","/api/service-requests",past).statusCode());
        int id=json.readTree(api(customer,"POST","/api/service-requests",customerRequest(serviceId)).body()).path("data").path("requestId").asInt();
        assertEquals(400,api(own,"POST","/api/service-requests/"+id+"/response",Map.of("decision","REJECTED","reason","","revision",0)).statusCode());
        listing.setStatus("INACTIVE"); listings.saveAndFlush(listing);
        assertEquals(409,api(customer,"POST","/api/service-requests",customerRequest(serviceId)).statusCode());
        assertEquals(409,api(own,"POST","/api/service-requests/"+id+"/response",Map.of("decision","ACCEPTED","revision",0)).statusCode());
        assertEquals(200,api(customer,"GET","/api/service-requests/"+id,null).statusCode());
        assertEquals(200,api(own,"POST","/api/service-requests/"+id+"/response",Map.of("decision","REJECTED","reason","Dịch vụ tạm ngừng hoạt động","revision",0)).statusCode());
    }

    @Test void requestResponsesSerializeAndRevokedCapabilityCannotAccept() throws Exception {
        var owner=account(); String own=token(owner), customer=token(account()), staff=token(account(UserRole.STAFF));
        int app=application(owner); review(staff,app,"APPROVE","APPROVE","");
        int serviceId=listings.findByRegistration_RegistrationId(app).orElseThrow().getServiceId();
        int id=json.readTree(api(customer,"POST","/api/service-requests",customerRequest(serviceId)).body()).path("data").path("requestId").asInt();
        var cap=capabilities.findByUser_UserId(owner.getUserId()).get(0);cap.setStatus("INACTIVE");capabilities.saveAndFlush(cap);
        assertEquals(409,api(customer,"POST","/api/service-requests",customerRequest(serviceId)).statusCode());
        assertEquals(409,api(own,"POST","/api/service-requests/"+id+"/response",Map.of("decision","ACCEPTED","revision",0)).statusCode());
        assertEquals(404,api(null,"GET","/api/services/"+serviceId,null).statusCode());
        cap.setStatus("ACTIVE");capabilities.saveAndFlush(cap);
        java.util.function.Supplier<Integer> action=()->{try{return api(own,"POST","/api/service-requests/"+id+"/response",Map.of("decision","ACCEPTED","revision",0)).statusCode();}catch(Exception e){throw new RuntimeException(e);}};
        var first=java.util.concurrent.CompletableFuture.supplyAsync(action);var second=java.util.concurrent.CompletableFuture.supplyAsync(action);
        var codes=new ArrayList<>(List.of(first.get(),second.get()));codes.sort(Integer::compareTo);assertEquals(List.of(200,409),codes);
    }
}
