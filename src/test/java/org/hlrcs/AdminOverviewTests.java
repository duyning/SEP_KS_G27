package org.hlrcs;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT) @ActiveProfiles("test")
class AdminOverviewTests {
 @Autowired Environment environment;
 @Autowired UserRepository users;
 @Autowired PropertyRegistrationRepository registrations;
 @Autowired PropertyRepository properties;
 @Autowired ModerationLogRepository logs;
 @Autowired JwtTokenProvider tokens;
 @Autowired ObjectMapper json;
 private final HttpClient client=HttpClient.newHttpClient();
 private User admin,staff,host,member;
 private String prefix;
 @BeforeEach void fixtures(){prefix="admin-read-"+UUID.randomUUID();admin=account(UserRole.ADMIN);staff=account(UserRole.STAFF);host=account(UserRole.ROOM_HOST);member=account(UserRole.USER);}
 private User account(UserRole role){return users.saveAndFlush(User.builder().fullName(prefix+" "+role).email(prefix+role+"@test.local").passwordHash("private-password-hash").role(role).status(UserStatus.ACTIVE).build());}
 private HttpResponse<String> get(User actor,String path) throws Exception {
  var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+environment.getProperty("local.server.port")+"/api/admin/"+path));
  if(actor!=null)request.header("Authorization","Bearer "+tokens.generateTokenFromUser(actor));
  return client.send(request.GET().build(),HttpResponse.BodyHandlers.ofString());
 }
 @Test void adminReadEndpointsRejectGuestsOtherRolesAndInactiveAccounts() throws Exception {
  for(var path:List.of("dashboard","accounts","assignments","activity")){
   assertEquals(401,get(null,path).statusCode());for(var actor:List.of(staff,host,member))assertEquals(403,get(actor,path).statusCode());assertEquals(200,get(admin,path).statusCode());
  }
  admin.setStatus(UserStatus.INACTIVE);users.saveAndFlush(admin);assertEquals(401,get(admin,"dashboard").statusCode());
 }
 @Test void overviewUsesDatabaseCountsAndNeverExposesPasswordsOrRawRegistrationDetails() throws Exception {
  var registration=registrations.saveAndFlush(PropertyRegistration.builder().user(host).name(prefix).registrationDetails("private-structured-submission").status(RegistrationStatus.PENDING).build());
  var before=logs.count();var response=get(admin,"dashboard");assertEquals(200,response.statusCode(),response.body());var data=json.readTree(response.body()).path("data");
  assertEquals(users.count(),data.path("totalAccounts").asLong());assertEquals(users.countByStatus(UserStatus.ACTIVE),data.path("activeAccounts").asLong());assertEquals(properties.count(),data.path("totalProperties").asLong());
  assertEquals(registrations.countByStatus(RegistrationStatus.PENDING),data.path("pendingVerifications").asLong());assertEquals(registrations.countByAssignedStaffIsNullAndStatus(RegistrationStatus.PENDING),data.path("unassignedVerifications").asLong());
  assertFalse(response.body().contains("private-password-hash"));assertFalse(response.body().contains("passwordHash"));assertFalse(response.body().contains("private-structured-submission"));assertFalse(data.path("fetchedAt").isNull());assertEquals(before,logs.count());
 }
 @Test void accountsSearchRoleAndPaginationReturnOnlySafeDtoFields() throws Exception {
  var result=get(admin,"accounts?q="+prefix+"&role=STAFF&size=1");assertEquals(200,result.statusCode(),result.body());var data=json.readTree(result.body()).path("data");assertEquals(1,data.path("totalElements").asInt());assertEquals(1,data.path("content").size());assertEquals(staff.getUserId(),data.path("content").get(0).path("userId").asInt());assertFalse(result.body().contains("password"));
  assertEquals(400,get(admin,"accounts?role=UNKNOWN").statusCode());assertEquals(400,get(admin,"accounts?page=-1").statusCode());assertEquals(400,get(admin,"accounts?size=101").statusCode());
  var page=get(admin,"accounts?q="+prefix+"&size=2&page=1");assertEquals(2,json.readTree(page.body()).path("data").path("content").size());
 }
 @Test void assignmentOverviewIsReadOnlyAndUnassignedFilterMatchesPendingOnly() throws Exception {
  registrations.saveAndFlush(PropertyRegistration.builder().user(host).name(prefix+" pending").status(RegistrationStatus.PENDING).build());
  registrations.saveAndFlush(PropertyRegistration.builder().user(host).name(prefix+" approved").status(RegistrationStatus.APPROVED).build());
  var response=get(admin,"assignments?q="+prefix+"&unassigned=true");assertEquals(200,response.statusCode(),response.body());assertEquals(1,json.readTree(response.body()).path("data").path("totalElements").asInt());
  assertEquals("PENDING",json.readTree(response.body()).path("data").path("content").get(0).path("status").asString());
  assertEquals(2,json.readTree(get(admin,"assignments?q="+prefix).body()).path("data").path("totalElements").asInt());
 }
}
