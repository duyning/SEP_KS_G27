package org.hlrcs;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class NoticeTests {
 @Autowired MockMvc mvc; @Autowired UserRepository users;@Autowired UserNoticeRepository notices;@Autowired JwtTokenProvider jwt;
 @Autowired PropertyRegistrationRepository registrations;
 User user,other;
 @BeforeEach void setup(){user=account(UserRole.USER);other=account(UserRole.USER);}
 User account(UserRole role){return users.save(User.builder().email(UUID.randomUUID()+"@test.local").fullName("Test").passwordHash("unused").role(role).status(UserStatus.ACTIVE).build());}
 String token(User u){return "Bearer "+jwt.generateTokenFromUser(u);}
 UserNotice notice(User u,String kind){var n=new UserNotice();n.setRecipient(u);n.setCategory("COMMUNITY");n.setKind(kind);n.setTitle("Bình luận mới");n.setContent("Nội dung");n.setCreatedAt(LocalDateTime.now());return notices.save(n);}
 @Test void combinedOnboardingSupplementNoticeReturnsApplicantToAccessibleForm()throws Exception{
  var staff=account(UserRole.STAFF);
  var registration=registrations.save(PropertyRegistration.builder().user(user).name("Onboarding notice")
    .status(RegistrationStatus.PENDING).hostOnboarding(true).assignedStaff(staff).assignmentVersion(1L).build());
  mvc.perform(post("/api/staff/verifications/"+registration.getRegistrationId()+"/review")
    .header("Authorization",token(staff)).contentType("application/json")
    .content("{\"decision\":\"REQUEST_SUPPLEMENT\",\"note\":\"Vui lòng bổ sung mô tả nhà trọ chi tiết.\",\"requestedFields\":[\"description\"],\"assignmentVersion\":1}"))
    .andExpect(status().isOk());
  mvc.perform(get("/api/notifications?category=APPLICATION").header("Authorization",token(user)))
    .andExpect(jsonPath("$.data.items[0].kind").value("NEEDS_SUPPLEMENT"))
    .andExpect(jsonPath("$.data.items[0].target").value("/become-host"));
  org.junit.jupiter.api.Assertions.assertEquals(UserRole.USER,users.findById(user.getUserId()).orElseThrow().getRole());
 }
 @Test void ownershipReadAllAndCategoryCountsAreEnforced()throws Exception{
  var a=notice(user,"COMMENT");var b=notice(other,"REPLY");
  mvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/notifications").header("Authorization",token(user))).andExpect(jsonPath("$.data.unreadCount").value(1)).andExpect(jsonPath("$.data.counts.COMMUNITY").value(1));
  mvc.perform(put("/api/notifications/n"+b.getId()+"/read").header("Authorization",token(user))).andExpect(status().isNotFound());
  mvc.perform(put("/api/notifications/n"+a.getId()+"/read").header("Authorization",token(user))).andExpect(status().isOk());
  mvc.perform(get("/api/notifications?category=UNREAD").header("Authorization",token(user))).andExpect(jsonPath("$.data.items.length()").value(0));
  mvc.perform(put("/api/notifications/read-all").header("Authorization",token(user))).andExpect(status().isOk());
  mvc.perform(get("/api/notifications").header("Authorization",token(other))).andExpect(jsonPath("$.data.unreadCount").value(1));
 }
 @Test void lazyCursorAndSubfiltersDoNotRepeatRows()throws Exception{
  for(int i=0;i<22;i++)notice(user,"COMMENT");notice(user,"REPLY");
  var response=mvc.perform(get("/api/notifications?kind=COMMENT").header("Authorization",token(user))).andExpect(jsonPath("$.data.items.length()").value(20)).andReturn();
  var json=new tools.jackson.databind.ObjectMapper().readTree(response.getResponse().getContentAsString());
  mvc.perform(get("/api/notifications").param("kind","COMMENT").param("before",json.path("data").path("nextCursor").asString()).header("Authorization",token(user))).andExpect(jsonPath("$.data.items.length()").value(2));
  mvc.perform(get("/api/notifications?before=invalid").header("Authorization",token(user))).andExpect(status().isBadRequest());
  mvc.perform(post("/api/notifications/admin").contentType("application/json").content("{\"recipientId\":"+user.getUserId()+",\"title\":\"Thông báo\",\"content\":\"Bảo trì\"}").header("Authorization",token(user))).andExpect(status().isForbidden());
 }
}
