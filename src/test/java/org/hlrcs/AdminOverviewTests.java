package org.hlrcs;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
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
 @Autowired PasswordEncoder passwords;
 private final HttpClient client=HttpClient.newHttpClient();
 private User admin,staff,host,member;
 private String prefix;
 @BeforeEach void fixtures(){prefix="admin-read-"+UUID.randomUUID();admin=account(UserRole.ADMIN);staff=account(UserRole.STAFF);host=account(UserRole.ROOM_HOST);member=account(UserRole.USER);}
 private User account(UserRole role) {
  return users.saveAndFlush(User.builder()
    .fullName(prefix + " " + role)
    .email(prefix + "-" + UUID.randomUUID() + "@test.local")
    .passwordHash("private-password-hash")
    .role(role)
    .status(UserStatus.ACTIVE)
    .build());
 }
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
 @Test void onlyAnActiveAdminCanChangeAnotherAccountsStatus() throws Exception {
  int target = member.getUserId();
  String inactive = "{\"status\":\"INACTIVE\"}";
  assertEquals(401, changeStatus(null, target, inactive).statusCode());
  for (var actor : List.of(staff, host, member)) {
   assertEquals(403, changeStatus(actor, target, inactive).statusCode());
  }
  assertEquals(400, changeStatus(admin, admin.getUserId(), inactive).statusCode());
  assertEquals(404, changeStatus(admin, Integer.MAX_VALUE, inactive).statusCode());
  for (var invalid : List.of("{}", "{\"status\":\"DELETED\"}", "{\"status\":1}")) {
   assertEquals(400, changeStatus(admin, target, invalid).statusCode());
  }
  assertEquals(UserStatus.ACTIVE, users.findById(target).orElseThrow().getStatus());

  var otherAdmin = account(UserRole.ADMIN);
  assertEquals(200, changeStatus(admin, otherAdmin.getUserId(), inactive).statusCode());
  assertEquals(401, changeStatus(otherAdmin, target, inactive).statusCode());
 }

 @Test void activatingAnExistingInactiveAccountDoesNotRestoreItsOldSession() throws Exception {
  String oldToken = tokens.generateTokenFromUser(member);
  member.setStatus(UserStatus.INACTIVE);
  users.saveAndFlush(member);
  assertEquals(200, changeStatus(admin, member.getUserId(), "{\"status\":\"ACTIVE\"}").statusCode());
  assertEquals(401, profile(oldToken).statusCode());
 }

 @Test void deactivationRevokesSessionsAndReactivationRequiresANewLogin() throws Exception {
  String password = "Test-only-password";
  member.setPasswordHash(passwords.encode(password));
  users.saveAndFlush(member);
  var login = login(member, password);
  assertEquals(200, login.statusCode(), login.body());
  String oldToken = json.readTree(login.body()).path("data").path("accessToken").asString();
  String legacyToken = Jwts.builder().subject(member.getEmail())
    .expiration(new Date(System.currentTimeMillis() + 60_000))
    .signWith(Keys.hmacShaKeyFor(environment.getRequiredProperty("app.jwt.secret").getBytes(StandardCharsets.UTF_8)))
    .compact();
  assertEquals(200, profile(oldToken).statusCode());
  assertEquals(200, profile(legacyToken).statusCode());
  int target = member.getUserId();

  String deactivate = "{\"status\":\"INACTIVE\"}";
  var changed = changeStatus(admin, target, deactivate);
  assertEquals(200, changed.statusCode(), changed.body());
  var data = json.readTree(changed.body()).path("data");
  assertEquals("INACTIVE", data.path("status").asString());
  assertEquals("USER", data.path("role").asString());
  assertFalse(data.has("passwordHash"));
  assertFalse(data.has("sessionVersion"));
  assertEquals("INACTIVE", json.readTree(get(admin, "accounts?q=" + member.getEmail()).body())
    .path("data").path("content").get(0).path("status").asString());
  assertEquals(200, changeStatus(admin, target, deactivate).statusCode());
  assertEquals(401, profile(oldToken).statusCode());
  assertEquals(403, login(member, password).statusCode());
  assertEquals(1, users.findById(target).orElseThrow().getSessionVersion());

  var activated = changeStatus(admin, target, "{\"status\":\"ACTIVE\"}");
  assertEquals(200, activated.statusCode(), activated.body());
  assertEquals("ACTIVE", json.readTree(activated.body()).path("data").path("status").asString());
  assertEquals(401, profile(oldToken).statusCode());
  assertEquals(401, profile(legacyToken).statusCode());
  var newLogin = login(member, password);
  assertEquals(200, newLogin.statusCode(), newLogin.body());
  assertEquals(200, profile(json.readTree(newLogin.body()).path("data").path("accessToken").asString()).statusCode());

  var audit = logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("USER_ACCOUNT", target);
  assertEquals(List.of("ACTIVATED", "DEACTIVATED"), audit.stream().map(ModerationLog::getAction).toList());
  assertTrue(audit.stream().allMatch(entry -> admin.getUserId().equals(entry.getStaff().getUserId())));
  assertTrue(logs.findVisibleForVerificationStaff(staff.getUserId()).stream()
    .noneMatch(entry -> "USER_ACCOUNT".equals(entry.getTargetType())));
 }

 private HttpResponse<String> changeStatus(User actor, int userId, String body) throws Exception {
  var request = request("/api/admin/accounts/" + userId + "/status");
  if (actor != null) request.header("Authorization", "Bearer " + tokens.generateTokenFromUser(actor));
  return client.send(request.header("Content-Type", "application/json")
    .method("PATCH", HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
 }

 private HttpResponse<String> login(User user, String password) throws Exception {
  String body = json.writeValueAsString(Map.of("email", user.getEmail(), "password", password));
  return client.send(request("/api/auth/login").header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
 }

 private HttpResponse<String> profile(String token) throws Exception {
  return client.send(request("/api/auth/me").header("Authorization", "Bearer " + token)
    .GET().build(), HttpResponse.BodyHandlers.ofString());
 }

 private HttpRequest.Builder request(String path) {
  return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + environment.getProperty("local.server.port") + path));
 }

 @Test void assignmentOverviewIsReadOnlyAndUnassignedFilterMatchesPendingOnly() throws Exception {
  registrations.saveAndFlush(PropertyRegistration.builder().user(host).name(prefix+" pending").status(RegistrationStatus.PENDING).build());
  registrations.saveAndFlush(PropertyRegistration.builder().user(host).name(prefix+" approved").status(RegistrationStatus.APPROVED).build());
  var response=get(admin,"assignments?q="+prefix+"&unassigned=true");assertEquals(200,response.statusCode(),response.body());assertEquals(1,json.readTree(response.body()).path("data").path("totalElements").asInt());
  assertEquals("PENDING",json.readTree(response.body()).path("data").path("content").get(0).path("status").asString());
  assertEquals(2,json.readTree(get(admin,"assignments?q="+prefix).body()).path("data").path("totalElements").asInt());
 }
}
