package org.hlrcs;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.hlrcs.service.*;
import org.hlrcs.service.DevelopmentVerificationAssignments.Command;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PropertyAssignmentSecurityTests {
    @Autowired Environment environment;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired PropertyDocumentRepository documents;
    @Autowired PropertyRepository properties;
    @Autowired ModerationLogRepository logs;
    @Autowired PropertyAssignmentEventRepository events;
    @Autowired PropertySubmissionEventRepository submissions;
    @Autowired DevelopmentVerificationAssignments assignments;
    @Autowired StaffService staffService;
    @Autowired PlatformTransactionManager transactions;
    @Autowired JwtTokenProvider tokens;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired org.springframework.web.context.WebApplicationContext webContext;
    private final HttpClient client=HttpClient.newHttpClient();
    private User a,b,owner,other,admin,member;
    private PropertyRegistration first,second,unassigned;
    private PropertyDocument privateA,photoA,privateB;
    @BeforeEach void fixtures() throws Exception {
        a=account(UserRole.STAFF);b=account(UserRole.STAFF);owner=account(UserRole.ROOM_HOST);other=account(UserRole.ROOM_HOST);admin=account(UserRole.ADMIN);member=account(UserRole.USER);
        first=registration(owner,"Assigned A");second=registration(other,"Assigned B");unassigned=registration(owner,"Unassigned");
        privateA=file(first,"OWNERSHIP","application/pdf");photoA=file(first,"PHOTO_0","image/jpeg");file(first,"ID_CARD","application/pdf");privateB=file(second,"ID_CARD","application/pdf");
        assignments.apply(new Command(first.getRegistrationId(),0,null,a.getUserId()),"security-tests");
        assignments.apply(new Command(second.getRegistrationId(),0,null,b.getUserId()),"security-tests");
        logs.saveAndFlush(ModerationLog.builder().staff(a).targetType("PROPERTY_REGISTRATION").targetId(first.getRegistrationId()).action("REQUESTED_SUPPLEMENT").note("Private note for A only").build());
        logs.saveAndFlush(ModerationLog.builder().staff(b).targetType("PROPERTY_REGISTRATION").targetId(second.getRegistrationId()).action("REJECTED").note("Private note for B only").build());
        submissions.saveAndFlush(PropertySubmissionEvent.builder().registration(second).actor(other).action("RESUBMITTED").submittedDetails("private history B").build());
    }
    private User account(UserRole role) {return users.saveAndFlush(User.builder().email("assignment-"+UUID.randomUUID()+"@test.local").fullName("Test "+role).passwordHash("not-used").role(role).status(UserStatus.ACTIVE).build());}
    private Map<String,Object> fields(String name) {
        var map=new LinkedHashMap<String,Object>();
        map.put("name",name);map.put("propertyType","Chung cư mini");map.put("description","Nhà trọ có không gian yên tĩnh và thông tin đầy đủ cho hồ sơ kiểm thử.");
        map.put("managerName","Quản lý kiểm thử");map.put("contactPhone","0912345678");map.put("zaloPhone","");map.put("commune","Tân Xã");map.put("addressDetail","Số 12, ngõ 10, Thôn 2");map.put("nearby","");map.put("latitude","21.01");map.put("longitude","105.52");map.put("amenities",List.of());map.put("selectedRules",List.of());map.put("rules","");map.put("termsAccepted",true);
        return map;
    }
    private PropertyRegistration registration(User user,String name) throws Exception {return registrations.saveAndFlush(PropertyRegistration.builder().user(user).name(name).address("Private address "+name).registrationDetails(json.writeValueAsString(fields(name))).status(RegistrationStatus.PENDING).build());}
    private PropertyDocument file(PropertyRegistration row,String type,String mime) {return documents.saveAndFlush(PropertyDocument.builder().registration(row).documentType(type).fileName(type+".pdf").contentType(mime).fileContent(mime.equals("application/pdf")?"%PDF-private".getBytes():new byte[]{(byte)255,(byte)216,(byte)255,1}).verificationStatus("PENDING").build());}
    private URI uri(String path) {return URI.create("http://127.0.0.1:"+environment.getProperty("local.server.port")+path);}
    private String path(PropertyRegistration row) {return "/api/staff/verifications/"+row.getRegistrationId();}
    private HttpResponse<String> request(User user,String method,String path,Object payload) throws Exception {
        var builder=HttpRequest.newBuilder(uri(path));if(user!=null)builder.header("Authorization","Bearer "+tokens.generateTokenFromUser(user));
        if(payload==null)builder.method(method,HttpRequest.BodyPublishers.noBody());else builder.header("Content-Type","application/json").method(method,HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)));
        return client.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> get(User user,String path) throws Exception {return request(user,"GET",path,null);}
    private HttpResponse<String> review(User user,PropertyRegistration row,String decision,long version) throws Exception {return request(user,"POST",path(row)+"/review",Map.of("decision",decision,"note","Đã kiểm tra hồ sơ và tài liệu theo quy định.","assignmentVersion",version));}
    private Set<Integer> ids(HttpResponse<String> response) throws Exception {assertEquals(200,response.statusCode(),response.body());var result=new HashSet<Integer>();for(var node:json.readTree(response.body()).path("data"))result.add(node.path("registrationId").asInt());return result;}
    private void transition(PropertyRegistration row,long version,Integer oldStaff,Integer newStaff) {assignments.apply(new Command(row.getRegistrationId(),version,oldStaff,newStaff),"security-tests");}
    private int code(Callable<HttpResponse<String>> call) {try{return call.call().statusCode();}catch(Exception e){throw new RuntimeException(e);}}

    private HttpResponse<String> submitHost(Map<String,Object> details) throws Exception {
        var boundary="assignment-"+UUID.randomUUID();var body=new java.io.ByteArrayOutputStream();
        body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"details\"\r\nContent-Type: application/json\r\n\r\n"+json.writeValueAsString(details)+"\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        for(var name:List.of("photos","ownership","idCard")) {
            boolean photo=name.equals("photos");
            body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+name+"\"; filename=\"file"+(photo?".jpg":".pdf")+"\"\r\nContent-Type: "+(photo?"image/jpeg":"application/pdf")+"\r\n\r\n").getBytes());
            body.writeBytes(photo?new byte[]{(byte)255,(byte)216,(byte)255,1}:"%PDF-private-test".getBytes());body.writeBytes("\r\n".getBytes());
        }
        body.writeBytes(("--"+boundary+"--\r\n").getBytes());
        return client.send(HttpRequest.newBuilder(uri("/api/host/property-registrations")).header("Authorization","Bearer "+tokens.generateTokenFromUser(owner)).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())).build(),HttpResponse.BodyHandlers.ofString());
    }

    @Test void applicantCannotMassAssignResponsibilityReviewerOrApproval() throws Exception {
        var data=fields("Client attempted privilege override");data.put("assignedStaffId",a.getUserId());data.put("assignedStaff",Map.of("userId",a.getUserId()));data.put("reviewer",Map.of("userId",admin.getUserId()));data.put("status","APPROVED");data.put("assignmentVersion",99);
        var response=submitHost(data);assertEquals(200,response.statusCode(),response.body());
        int id=json.readTree(response.body()).path("data").path("registrationId").asInt();var row=registrations.findById(id).orElseThrow();
        assertNull(row.getAssignedStaff());assertNull(row.getReviewer());assertEquals(0,row.getAssignmentVersion());assertEquals(RegistrationStatus.PENDING,row.getStatus());
        assertEquals(404,get(a,"/api/staff/verifications/"+id).statusCode());assertFalse(properties.existsByRegistration_RegistrationId(id));
        assertEquals(403,request(owner,"POST",path(first)+"/review",Map.of("decision","APPROVE","assignmentVersion",1)).statusCode());
        assertEquals(404,request(a,"POST",path(first)+"/assignment",Map.of("assignedStaffId",a.getUserId())).statusCode());
    }

    @Test void listDashboardHistoryAndCountsAreScopedInServerQueries() throws Exception {
        assertEquals(Set.of(first.getRegistrationId()),ids(get(a,"/api/staff/verifications?staffId="+b.getUserId())));
        assertEquals(Set.of(second.getRegistrationId()),ids(get(b,"/api/staff/verifications")));
        var data=json.readTree(get(a,"/api/staff/dashboard").body()).path("data");
        assertEquals(1,data.path("pendingVerifications").asInt());
        assertFalse(data.toString().contains("Private note for B only"));assertTrue(data.toString().contains("Private note for A only"));
        var propertyKeys=new HashSet<String>();for(var item:data.path("queue"))if(item.path("type").asString().equals("PROPERTY"))propertyKeys.add(item.path("key").asString());
        assertEquals(Set.of("PROPERTY-"+first.getRegistrationId()),propertyKeys);
        var all=ids(get(admin,"/api/staff/verifications"));assertTrue(all.containsAll(Set.of(first.getRegistrationId(),second.getRegistrationId(),unassigned.getRegistrationId())));
        assertEquals(404,get(a,path(second)).statusCode());assertEquals(404,get(a,path(unassigned)).statusCode());
        assertEquals(200,get(a,path(first)).statusCode());assertFalse(get(a,path(first)).body().contains("private history B"));
    }
    @Test void guestsMembersHostsAndUnassignedStaffCannotBypassPrivateEndpoints() throws Exception {
        for(var suffix:List.of("","/files/"+privateA.getDocumentId())) {
            assertEquals(401,get(null,path(first)+suffix).statusCode());
            for(var user:List.of(owner,other,member))assertEquals(403,get(user,path(first)+suffix).statusCode());
            assertEquals(404,get(b,path(first)+suffix).statusCode());
            assertEquals(200,get(admin,path(first)+suffix).statusCode());
        }
        assertEquals(404,get(a,path(first)+"/files/"+privateB.getDocumentId()).statusCode());
        assertEquals(404,get(a,path(second)+"/files/"+privateA.getDocumentId()).statusCode());
        assertEquals(404,get(a,path(first)+"/history").statusCode()); // no alternate history endpoint
        assertEquals(404,get(null,"/api/public/properties/photos/"+privateA.getDocumentId()).statusCode());
        assertEquals(404,get(null,"/api/public/properties/photos/"+photoA.getDocumentId()).statusCode());
        assertEquals(404,get(other,"/api/host/property/photos/"+photoA.getDocumentId()).statusCode());
        assertEquals(200,get(owner,"/api/host/property/photos/"+photoA.getDocumentId()).statusCode());
        assertEquals(403,get(a,"/api/host/property/photos/"+photoA.getDocumentId()).statusCode());
        for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT")) {
            assertEquals(403,review(admin,first,decision,1).statusCode());
            assertEquals(404,review(b,first,decision,1).statusCode());
        }
    }
    @Test void transferRevocationInactiveAndRoleChangesEndPrivateAccess() throws Exception {
        transition(first,1,a.getUserId(),b.getUserId());
        assertFalse(ids(get(a,"/api/staff/verifications")).contains(first.getRegistrationId()));
        assertEquals(404,get(a,path(first)).statusCode());assertEquals(404,get(a,path(first)+"/files/"+privateA.getDocumentId()).statusCode());
        assertEquals(200,get(b,path(first)).statusCode());
        assertEquals(404,review(a,first,"REJECT",1).statusCode());
        transition(first,2,b.getUserId(),null);
        assertEquals(404,get(b,path(first)).statusCode());assertEquals(200,get(admin,path(first)).statusCode());
        transition(first,3,null,a.getUserId());a.setStatus(UserStatus.INACTIVE);users.saveAndFlush(a);
        assertEquals(401,get(a,path(first)).statusCode());assertEquals(401,review(a,first,"APPROVE",4).statusCode());
        a.setStatus(UserStatus.ACTIVE);a.setRole(UserRole.USER);users.saveAndFlush(a);assertEquals(403,get(a,path(first)).statusCode());
    }
    @Test void staleAssignmentVersionEvenAfterReturnToSameStaffIsRejected() throws Exception {
        transition(first,1,a.getUserId(),b.getUserId());transition(first,2,b.getUserId(),a.getUserId());
        var before=logs.count();assertEquals(409,review(a,first,"REJECT",1).statusCode());assertEquals(before,logs.count());
        assertEquals(RegistrationStatus.PENDING,registrations.findById(first.getRegistrationId()).orElseThrow().getStatus());
        assertEquals(400,request(a,"POST",path(first)+"/review",Map.of("decision","REJECT","note","Đầy đủ nội dung nhưng không có phiên bản")).statusCode());
        assertEquals(200,review(a,first,"REJECT",3).statusCode());assertEquals(409,review(a,first,"APPROVE",3).statusCode());
    }
    @Test void provisioningRejectsConflictsAndStaleOverridesIsIdempotentAndDoesNotPublish() throws Exception {
        var count=events.count();transition(first,0,null,a.getUserId());assertEquals(count,events.count());
        assertThrows(RuntimeException.class,()->transition(first,0,null,b.getUserId()));
        assertThrows(RuntimeException.class,()->transition(unassigned,0,null,owner.getUserId()));
        assertThrows(RuntimeException.class,()->transition(unassigned,0,null,admin.getUserId()));
        var self=registration(a,"Self submitted");assertThrows(RuntimeException.class,()->transition(self,0,null,a.getUserId()));
        // Simulate an invalid legacy assignment; read/review must still fail closed.
        self.setAssignedStaff(a);self.setAssignmentVersion(1);registrations.saveAndFlush(self);assertEquals(404,get(a,path(self)).statusCode());assertEquals(404,review(a,self,"REJECT",1).statusCode());
        var managed=registration(owner,"Managed by staff");var property=properties.saveAndFlush(Property.builder().owner(a).registration(managed).name("Conflict").status("ACTIVE").build());
        assertThrows(RuntimeException.class,()->transition(managed,0,null,a.getUserId()));managed.setAssignedStaff(a);registrations.saveAndFlush(managed);assertEquals(404,get(a,path(managed)).statusCode());
        var inactive=account(UserRole.STAFF);inactive.setStatus(UserStatus.INACTIVE);users.saveAndFlush(inactive);assertThrows(RuntimeException.class,()->transition(unassigned,0,null,inactive.getUserId()));
        assertEquals(RegistrationStatus.PENDING,registrations.findById(first.getRegistrationId()).orElseThrow().getStatus());assertFalse(properties.existsByRegistration_RegistrationId(first.getRegistrationId()));
        var audit=events.findByRegistration_RegistrationIdOrderByAssignmentVersionAsc(first.getRegistrationId()).get(0);assertEquals(a.getUserId(),audit.getNewStaffId());assertNull(audit.getPreviousStaffId());assertEquals("SYSTEM:assignment-dev:security-tests",audit.getActor());assertNotNull(audit.getCreatedAt());
    }
    @Test void assignmentAndReviewTransactionsRollbackStateAndAuditTogether() throws Exception {
        var count=events.count();
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(transactions).execute(status->{transition(first,1,a.getUserId(),b.getUserId());throw new IllegalStateException("rollback");}));
        assertEquals(count,events.count());assertEquals(200,get(a,path(first)).statusCode());assertEquals(404,get(b,path(first)).statusCode());
        var logsBefore=logs.count();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(a.getEmail(),null,List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STAFF"))));
        try {assertThrows(IllegalStateException.class,()->new TransactionTemplate(transactions).execute(status->{staffService.review(first.getRegistrationId(),"APPROVE","Đã kiểm tra",null,1L);throw new IllegalStateException("rollback after save");}));}
        finally {SecurityContextHolder.clearContext();}
        assertEquals(logsBefore,logs.count());assertFalse(properties.existsByRegistration_RegistrationId(first.getRegistrationId()));assertEquals(RegistrationStatus.PENDING,registrations.findById(first.getRegistrationId()).orElseThrow().getStatus());
        assertEquals("PENDING",documents.findById(privateA.getDocumentId()).orElseThrow().getVerificationStatus());
    }
    @Test void concurrentTransferBeforeDecisionLockPreventsStaleReviewFromSaving() throws Exception {
        var changed=new CountDownLatch(1);var commit=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            var transfer=pool.submit(()->new TransactionTemplate(transactions).execute(status->{transition(first,1,a.getUserId(),b.getUserId());changed.countDown();try{if(!commit.await(10,TimeUnit.SECONDS))throw new IllegalStateException("test timeout");}catch(InterruptedException e){throw new RuntimeException(e);}return null;}));
            assertTrue(changed.await(10,TimeUnit.SECONDS));
            var review=pool.submit(()->code(()->review(a,first,"APPROVE",1)));
            Thread.sleep(150);assertFalse(review.isDone());commit.countDown();transfer.get(10,TimeUnit.SECONDS);
            assertEquals(404,review.get(10,TimeUnit.SECONDS));assertFalse(properties.existsByRegistration_RegistrationId(first.getRegistrationId()));
            assertEquals(RegistrationStatus.PENDING,registrations.findById(first.getRegistrationId()).orElseThrow().getStatus());
        } finally {commit.countDown();pool.shutdownNow();}
    }
    @Test void twoDecisionsCannotOverwriteEachOther() throws Exception {
        var pool=Executors.newFixedThreadPool(2);var before=logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION",first.getRegistrationId()).size();
        try {var x=pool.submit(()->code(()->review(a,first,"REJECT",1)));var y=pool.submit(()->code(()->review(a,first,"APPROVE",1)));var codes=new ArrayList<>(List.of(x.get(15,TimeUnit.SECONDS),y.get(15,TimeUnit.SECONDS)));Collections.sort(codes);assertEquals(List.of(200,409),codes);}
        finally {pool.shutdownNow();}
        assertEquals(before+1,logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION",first.getRegistrationId()).size());
    }

    @Test void revocationDoesNotPreventOwnerSupplementButResubmissionDoesNotRestoreStaffAccess() throws Exception {
        assertEquals(200,request(a,"POST",path(first)+"/review",Map.of("decision","REQUEST_SUPPLEMENT","note","Vui lòng bổ sung mô tả chi tiết nhà trọ.","requestedFields",List.of("description"),"assignmentVersion",1)).statusCode());
        transition(first,1,a.getUserId(),null);
        String endpoint="/api/host/property-registrations/"+first.getRegistrationId();
        var editResponse=get(owner,endpoint+"/edit");assertEquals(200,editResponse.statusCode(),editResponse.body());
        var snapshot=json.readTree(editResponse.body()).path("data");var data=fields(first.getName());data.put("description","Mô tả đã bổ sung theo yêu cầu và đủ thông tin thực tế để gửi lại hồ sơ nhà trọ.");
        var payload=Map.of("details",data,"versionToken",snapshot.path("versionToken").asString(),"retainedPhotoIds",List.of(photoA.getDocumentId()));
        var boundary="resubmit-"+UUID.randomUUID();var body="--"+boundary+"\r\nContent-Disposition: form-data; name=\"edit\"\r\nContent-Type: application/json\r\n\r\n"+json.writeValueAsString(payload)+"\r\n--"+boundary+"--\r\n";
        var response=client.send(HttpRequest.newBuilder(uri(endpoint+"/resubmit")).header("Authorization","Bearer "+tokens.generateTokenFromUser(owner)).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(200,response.statusCode(),response.body());var row=registrations.findById(first.getRegistrationId()).orElseThrow();assertEquals(RegistrationStatus.PENDING,row.getStatus());assertNull(row.getAssignedStaff());assertEquals(2,row.getAssignmentVersion());
        assertEquals(404,get(a,path(first)).statusCode());assertEquals(404,get(b,path(first)).statusCode());
        transition(first,2,null,b.getUserId());var assigned=get(b,path(first));assertEquals(200,assigned.statusCode());assertTrue(assigned.body().contains("RESUBMITTED"));
    }

    @Test void publicPhotosRemainPublicButPrivateDocumentsNeverBecomePublicAfterApproval() throws Exception {
        assertEquals(200,review(a,first,"APPROVE",1).statusCode());
        assertEquals(200,get(null,"/api/public/properties/photos/"+photoA.getDocumentId()).statusCode());
        assertEquals(404,get(null,"/api/public/properties/photos/"+privateA.getDocumentId()).statusCode());
        assertEquals(1,json.readTree(get(a,"/api/staff/dashboard").body()).path("data").path("activeProperties").asInt());
        transition(first,1,a.getUserId(),null);
        assertEquals(404,get(a,path(first)+"/files/"+photoA.getDocumentId()).statusCode());
        assertEquals(200,get(null,"/api/public/properties/photos/"+photoA.getDocumentId()).statusCode());
        assertEquals(200,get(owner,"/api/host/property/photos/"+photoA.getDocumentId()).statusCode());
        assertEquals(0,json.readTree(get(a,"/api/staff/dashboard").body()).path("data").path("activeProperties").asInt());
    }

    private PropertyRegistration staged(String stage,User applicant) throws Exception {
        var row=registration(applicant,"Review policy "+stage+" "+UUID.randomUUID());
        file(row,"PHOTO_0","image/jpeg");file(row,"OWNERSHIP","application/pdf");file(row,"ID_CARD","application/pdf");
        if(stage.equals("RESUBMITTED")) {
            row.setSubmittedAt(java.time.LocalDateTime.now());
            submissions.saveAndFlush(PropertySubmissionEvent.builder().registration(row).actor(applicant).action("RESUBMITTED").submittedDetails(row.getRegistrationDetails()).build());
        } else if(stage.equals("CHANGE")) {
            var base=registration(applicant,"Approved base "+UUID.randomUUID());base.setStatus(RegistrationStatus.APPROVED);registrations.saveAndFlush(base);
            var property=properties.saveAndFlush(Property.builder().owner(applicant).registration(base).name(base.getName()).description("Approved text remains unchanged").status("ACTIVE").build());
            row.setTargetPropertyId(property.getPropertyId());row.setBaseRegistrationId(base.getRegistrationId());
        }
        return registrations.saveAndFlush(row);
    }
    private void legacyAssignment(PropertyRegistration row,User assigned) {
        // Deliberately inconsistent historical data, not a business provisioning path.
        row.setAssignedStaff(assigned);row.setAssignmentVersion(1);registrations.saveAndFlush(row);
    }
    private String businessSnapshot() throws Exception {
        var tables=new LinkedHashMap<String,List<Map<String,String>>>();
        for(var table:List.of("property_registrations","properties","property_documents","moderation_logs","property_submission_events","property_assignment_events","users","user_capabilities")) {
            var rows=new ArrayList<Map<String,String>>();
            for(var raw:jdbc.queryForList("select * from "+table+" order by 1")) {
                var values=new TreeMap<String,String>();
                for(var entry:raw.entrySet()) {
                    Object value=entry.getValue();
                    String text=value==null?null:value instanceof byte[] bytes?Base64.getEncoder().encodeToString(bytes):value instanceof java.sql.Clob clob?clob.getSubString(1,(int)clob.length()):value.toString();
                    values.put(entry.getKey(),text);
                }
                rows.add(values);
            }
            tables.put(table,rows);
        }
        return json.writeValueAsString(tables);
    }
    private void blockedUnchanged(User actor,PropertyRegistration row,String decision,long version,int expected) throws Exception {
        var before=businessSnapshot();var response=review(actor,row,decision,version);
        assertEquals(expected,response.statusCode(),decision+": "+response.body());assertFalse(json.readTree(response.body()).path("success").asBoolean());
        assertEquals(before,businessSnapshot(),"Denied review must not change registration, property, evidence, rights or successful audit");
    }

    @Test void allThreeDecisionsAllowOnlyIndependentAssignedStaffAcrossNewResubmissionAndChangeRequests() throws Exception {
        for(var stage:List.of("NEW","RESUBMITTED","CHANGE"))for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT")) {
            var row=staged(stage,owner);transition(row,0,null,a.getUserId());
            var response=review(a,row,decision,1);assertEquals(200,response.statusCode(),stage+" / "+decision+": "+response.body());
            assertEquals(a.getUserId(),jdbc.queryForObject("select reviewed_by from property_registrations where registration_id=?",Integer.class,row.getRegistrationId()));
            var state=registrations.findById(row.getRegistrationId()).orElseThrow();assertEquals(decision.equals("APPROVE")?RegistrationStatus.APPROVED:decision.equals("REJECT")?RegistrationStatus.REJECTED:RegistrationStatus.NEEDS_SUPPLEMENT,state.getStatus());
            var audit=logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION",row.getRegistrationId());assertEquals(1,audit.size());
            if(!decision.equals("REQUEST_SUPPLEMENT"))blockedUnchanged(a,row,"APPROVE",1,409);
        }
    }

    @Test void adminAndSelfApplicantAreBlockedForEveryDecisionAndSubmissionStageWithoutAnySideEffects() throws Exception {
        for(var stage:List.of("NEW","RESUBMITTED","CHANGE")) {
            var normal=staged(stage,owner);transition(normal,0,null,a.getUserId());
            var adminAssigned=staged(stage,owner);legacyAssignment(adminAssigned,admin);
            var self=staged(stage,a);legacyAssignment(self,a);
            for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT")) {
                blockedUnchanged(admin,normal,decision,1,403);blockedUnchanged(admin,adminAssigned,decision,1,403);blockedUnchanged(a,self,decision,1,404);
            }
            for(var row:List.of(normal,adminAssigned,self)) {
                var detail=get(admin,path(row));assertEquals(200,detail.statusCode());assertFalse(json.readTree(detail.body()).path("data").path("canReview").asBoolean());
                int fileId=documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(row.getRegistrationId()).get(0).getDocumentId();assertEquals(200,get(admin,path(row)+"/files/"+fileId).statusCode());
            }
        }
    }

    @Test void staffOwningTargetOrLinkedPropertyCannotApproveRejectOrRequestSupplement() throws Exception {
        var revision=staged("CHANGE",owner);var property=properties.findById(revision.getTargetPropertyId()).orElseThrow();property.setOwner(a);properties.saveAndFlush(property);legacyAssignment(revision,a);
        var linked=staged("NEW",owner);properties.saveAndFlush(Property.builder().owner(a).registration(linked).name("Staff-owned linked property").status("ACTIVE").build());legacyAssignment(linked,a);
        for(var row:List.of(revision,linked))for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT"))blockedUnchanged(a,row,decision,1,404);
    }

    @Test void everyDecisionRejectsGuestOtherRolesUnassignedInactiveAndStaleVersionsWithoutWrites() throws Exception {
        for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT")) {
            blockedUnchanged(null,first,decision,1,401);
            for(var user:List.of(member,owner,other))blockedUnchanged(user,first,decision,1,403);
            blockedUnchanged(b,first,decision,1,404);blockedUnchanged(a,unassigned,decision,0,404);
            blockedUnchanged(a,first,decision,0,409);
            var before=businessSnapshot();
            var forged=Map.of("decision",decision,"note","Nội dung đủ dài nhưng giả danh Staff khác.","assignmentVersion",1,"reviewerId",a.getUserId(),"ownerId",owner.getUserId(),"role","STAFF");
            assertEquals(404,request(b,"POST",path(first)+"/review",forged).statusCode());assertEquals(before,businessSnapshot());
        }
        a.setStatus(UserStatus.INACTIVE);users.saveAndFlush(a);
        for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT"))blockedUnchanged(a,first,decision,1,401);
    }

    @Test void unknownOrInconsistentTargetOwnershipFailsClosedForAllOutcomes() throws Exception {
        var missing=staged("NEW",owner);missing.setTargetPropertyId(Integer.MAX_VALUE);missing.setBaseRegistrationId(Integer.MAX_VALUE);legacyAssignment(missing,a);
        var mismatched=staged("CHANGE",owner);var p=properties.findById(mismatched.getTargetPropertyId()).orElseThrow();p.setOwner(other);properties.saveAndFlush(p);legacyAssignment(mismatched,a);
        var noBase=staged("CHANGE",owner);noBase.setBaseRegistrationId(null);legacyAssignment(noBase,a);
        for(var row:List.of(missing,mismatched,noBase)) {
            assertFalse(json.readTree(get(a,path(row)).body()).path("data").path("canReview").asBoolean());
            for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT"))blockedUnchanged(a,row,decision,1,409);
        }
    }

    @Test void serviceGuardRejectsAdminOrDualAuthorityEvenWithoutControllerAndControllerRejectsDualAuthority() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(webContext).apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
        for(var decision:List.of("APPROVE","REJECT","REQUEST_SUPPLEMENT")) {
            var before=businessSnapshot();
            var dual=org.springframework.security.core.userdetails.User.withUsername(a.getEmail()).password("unused").authorities("ROLE_STAFF","ROLE_ADMIN").build();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path(first)+"/review")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(dual))
                .contentType("application/json").content(json.writeValueAsString(Map.of("decision",decision,"note","Nội dung đầy đủ cho kiểm thử quyền.","assignmentVersion",1))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
            for(var actor:List.of(admin,a)) {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor.getEmail(),null,List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STAFF"),new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"))));
                try {var exception=assertThrows(org.hlrcs.exception.AppException.class,()->staffService.review(first.getRegistrationId(),decision,"Đủ nội dung",null,1L));assertEquals(org.springframework.http.HttpStatus.FORBIDDEN,exception.getStatus());}
                finally {SecurityContextHolder.clearContext();}
            }
            assertEquals(before,businessSnapshot());
        }
    }
}
