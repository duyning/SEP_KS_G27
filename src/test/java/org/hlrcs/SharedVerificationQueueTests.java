package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties={"app.verification.assignment-required=false","app.verification.auto-assignment.enabled=false"})
@ActiveProfiles("test")
class SharedVerificationQueueTests {
    @Autowired Environment environment;
    @Autowired UserRepository users;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired PropertyDocumentRepository documents;
    @Autowired PropertyRepository properties;
    @Autowired ModerationLogRepository logs;
    @Autowired PropertyAssignmentEventRepository assignments;
    @Autowired JwtTokenProvider tokens;
    @Autowired ObjectMapper json;
    private final HttpClient client=HttpClient.newHttpClient();
    private User owner,a,b,admin;
    @BeforeEach void setup(){owner=user(UserRole.ROOM_HOST);a=user(UserRole.STAFF);b=user(UserRole.STAFF);admin=user(UserRole.ADMIN);}
    private User user(UserRole role){return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@test.local")
        .fullName("Shared queue test").passwordHash("test-only").role(role).status(UserStatus.ACTIVE).build());}
    private PropertyRegistration row(User applicant) throws Exception {
        var fields=new LinkedHashMap<String,Object>();
        fields.put("name","Shared queue property");fields.put("propertyType","Chung cư mini");
        fields.put("description","Nhà trọ có thông tin đầy đủ để kiểm tra hàng đợi chung cho Staff.");
        fields.put("managerName","Chủ trọ");fields.put("contactPhone","0912345678");fields.put("zaloPhone","");
        fields.put("commune","Tân Xã");fields.put("addressDetail","Số 12, ngõ 10, Thôn 2");fields.put("nearby","");
        fields.put("latitude","21.01");fields.put("longitude","105.52");fields.put("amenities",List.of());
        fields.put("selectedRules",List.of());fields.put("rules","");fields.put("termsAccepted",true);
        var row=registrations.saveAndFlush(PropertyRegistration.builder().user(applicant).name("Shared queue property")
            .registrationDetails(json.writeValueAsString(fields)).status(RegistrationStatus.PENDING).build());
        for(var type:List.of("PHOTO_0","OWNERSHIP","ID_CARD")) documents.saveAndFlush(PropertyDocument.builder()
            .registration(row).documentType(type).fileName(type+".pdf").contentType("application/pdf")
            .fileContent("%PDF-test".getBytes()).verificationStatus("PENDING").build());
        return row;
    }
    private HttpResponse<String> call(User user,String method,String path,Object payload)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+environment.getProperty("local.server.port")+"/api/staff/"+path));
        if(user!=null)request.header("Authorization","Bearer "+tokens.generateTokenFromUser(user));
        if(payload==null)request.method(method,HttpRequest.BodyPublishers.noBody());
        else request.header("Content-Type","application/json").method(method,HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)));
        return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> review(User user,PropertyRegistration row,String decision)throws Exception{
        return call(user,"POST","verifications/"+row.getRegistrationId()+"/review",
            Map.of("decision",decision,"note","Đã kiểm tra hồ sơ theo quy định.","assignmentVersion",row.getAssignmentVersion()));
    }
    private boolean listed(User user,Integer id)throws Exception{
        var response=call(user,"GET","verifications",null);assertEquals(200,response.statusCode(),response.body());
        for(var node:json.readTree(response.body()).path("data"))if(node.path("registrationId").asInt()==id)return true;
        return false;
    }

    @Test void unassignedApplicationIsVisibleAndReviewableByBothStaffWithoutCreatingAssignment()throws Exception{
        var row=row(owner);
        for(var staff:List.of(a,b)){
            assertTrue(listed(staff,row.getRegistrationId()));
            var detail=call(staff,"GET","verifications/"+row.getRegistrationId(),null);
            assertEquals(200,detail.statusCode());assertTrue(json.readTree(detail.body()).path("data").path("canReview").asBoolean());
            var file=documents.findByRegistration_RegistrationId(row.getRegistrationId()).get(0);
            assertEquals(200,call(staff,"GET","verifications/"+row.getRegistrationId()+"/files/"+file.getDocumentId(),null).statusCode());
            var dashboard=call(staff,"GET","dashboard",null);assertEquals(200,dashboard.statusCode());
            assertTrue(dashboard.body().contains("/staff/verifications/detail?id="+row.getRegistrationId()));
        }
        assertTrue(assignments.findByRegistration_RegistrationIdOrderByAssignmentVersionAsc(row.getRegistrationId()).isEmpty());
        assertNull(registrations.findById(row.getRegistrationId()).orElseThrow().getAssignedStaff());
    }

    @Test void allThreeDecisionsWorkWithoutAssignmentAndRecordActualReviewer()throws Exception{
        for(var decision:List.of("APPROVE","REQUEST_SUPPLEMENT","REJECT")){
            var row=row(owner);var response=review(b,row,decision);assertEquals(200,response.statusCode(),response.body());
            var data=json.readTree(response.body()).path("data");
            assertEquals(b.getFullName(),data.path("summary").path("reviewerName").asString());
            assertEquals(decision.equals("APPROVE")?"APPROVED":decision.equals("REJECT")?"REJECTED":"NEEDS_SUPPLEMENT",data.path("summary").path("status").asString());
            assertNull(registrations.findById(row.getRegistrationId()).orElseThrow().getAssignedStaff());
            assertEquals(1,logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION",row.getRegistrationId()).size());
        }
    }

    @Test void oldAssignmentsDoNotHideApplicationsFromSharedQueue()throws Exception{
        var row=row(owner);row.setAssignedStaff(a);row.setAssignmentVersion(1);registrations.saveAndFlush(row);
        assertTrue(listed(b,row.getRegistrationId()));assertEquals(200,review(b,row,"REJECT").statusCode());
    }

    @Test void ownApplicationsAndRelatedPropertyRemainBlockedAndOtherRolesCannotReview()throws Exception{
        var own=row(a);assertFalse(listed(a,own.getRegistrationId()));
        assertEquals(404,call(a,"GET","verifications/"+own.getRegistrationId(),null).statusCode());
        assertEquals(404,review(a,own,"REJECT").statusCode());
        var related=row(owner);var property=properties.saveAndFlush(Property.builder().owner(a).name("Owned property").build());
        related.setTargetPropertyId(property.getPropertyId());registrations.saveAndFlush(related);
        assertFalse(listed(a,related.getRegistrationId()));assertEquals(404,review(a,related,"REJECT").statusCode());
        var normal=row(owner);
        assertEquals(403,review(admin,normal,"REJECT").statusCode());assertEquals(403,review(owner,normal,"REJECT").statusCode());
        assertEquals(401,review(null,normal,"REJECT").statusCode());
        b.setStatus(UserStatus.INACTIVE);users.saveAndFlush(b);assertEquals(401,review(b,normal,"REJECT").statusCode());
    }

    @Test void simultaneousFinalDecisionsProduceOneResultAndOneAudit()throws Exception{
        var row=row(owner);var pool=Executors.newFixedThreadPool(2);
        try{
            var results=pool.invokeAll(List.<Callable<Integer>>of(()->review(a,row,"REJECT").statusCode(),()->review(b,row,"REJECT").statusCode()));
            var codes=new ArrayList<Integer>();for(var result:results)codes.add(result.get(30,TimeUnit.SECONDS));
            Collections.sort(codes);assertEquals(List.of(200,409),codes);
        }finally{pool.shutdownNow();}
        assertEquals(1,logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION",row.getRegistrationId()).size());
    }
}
