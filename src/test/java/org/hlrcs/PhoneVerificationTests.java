package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.service.PhoneOtpProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource("classpath:application-test.properties")
class PhoneVerificationTests {
 @Autowired Environment env;
 @Autowired ObjectMapper json;
 @Autowired UserRepository users;
 @Autowired PhoneVerificationRepository challenges;
 @Autowired PasswordEncoder encoder;
 @MockitoBean PhoneOtpProvider provider;
 private final HttpClient http=HttpClient.newHttpClient();
 String token;User user;
 final String phone="0934567812",sid="VE"+"1".repeat(32);
 HttpResponse<String> call(String method,String path,Object data,String bearer)throws Exception{
  var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+env.getProperty("local.server.port")+"/api/auth"+path));
  if(bearer!=null)b.header("Authorization","Bearer "+bearer);
  b.header("Content-Type","application/json").method(method,data==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data)));
  return http.send(b.build(),HttpResponse.BodyHandlers.ofString());
 }
 @BeforeEach void prepare()throws Exception{
  user=users.save(User.builder().email(UUID.randomUUID()+"@example.com").fullName("Google OTP test").passwordHash(encoder.encode("Test123456")).role(UserRole.USER).status(UserStatus.ACTIVE).authProvider("GOOGLE").googleSubject(UUID.randomUUID().toString()).build());
  var login=call("POST","/login",Map.of("email",user.getEmail(),"password","Test123456"),null);
  assertEquals(200,login.statusCode(),login.body());token=json.readTree(login.body()).path("data").path("accessToken").asString();
  when(provider.send(anyString())).thenReturn(new PhoneOtpProvider.SentOtp(sid,null));when(provider.check(sid,"123456")).thenReturn(true);
 }
 @AfterEach void clean(){challenges.deleteById(user.getUserId());users.deleteById(user.getUserId());}
 HttpResponse<String> send()throws Exception{return call("POST","/profile/phone/send-otp",Map.of("phoneNumber",phone),token);}
 HttpResponse<String> check(String code)throws Exception{return call("POST","/profile/phone/verify-otp",Map.of("phoneNumber",phone,"code",code),token);}
 HttpResponse<String> save(String value)throws Exception{return call("PUT","/profile",Map.of("fullName","Updated","phoneNumber",value),token);}
 @Test void hostRegistrationPopupConfirmsOnlyItsVerifiedPhoneWithoutOverwritingProfile()throws Exception{
  assertEquals(400,call("POST","/profile/phone/confirm",Map.of("phoneNumber",phone),token).statusCode());
  assertEquals(200,send().statusCode());assertEquals(200,check("123456").statusCode());
  assertEquals(400,call("POST","/profile/phone/confirm",Map.of("phoneNumber","0934567813"),token).statusCode());
  var response=call("POST","/profile/phone/confirm",Map.of("phoneNumber",phone),token);assertEquals(200,response.statusCode(),response.body());
  var saved=users.findById(user.getUserId()).orElseThrow();assertEquals(phone,saved.getPhoneNumber());assertNotNull(saved.getPhoneVerifiedAt());
  assertEquals("Google OTP test",saved.getFullName());
  assertEquals(400,call("POST","/profile/phone/confirm",Map.of("phoneNumber",phone),token).statusCode());
 }
 @Test void localAccountCanVerifyItsExistingUnverifiedPhoneInTheSamePopup()throws Exception{
  user.setAuthProvider("LOCAL");user.setGoogleSubject(null);user.setPhoneNumber(phone);users.save(user);
  assertEquals(200,send().statusCode());assertEquals(200,check("123456").statusCode());
  assertEquals(200,call("POST","/profile/phone/confirm",Map.of("phoneNumber",phone),token).statusCode());
  assertNotNull(users.findById(user.getUserId()).orElseThrow().getPhoneVerifiedAt());
  assertEquals(400,send().statusCode());
 }
 @Test void otpGatesProfileAndSuccessfulProofIsConsumed()throws Exception{
  assertEquals(400,save(phone).statusCode());assertNull(users.findById(user.getUserId()).orElseThrow().getPhoneNumber());
  assertEquals(200,send().statusCode());verify(provider).send("+84934567812");
  assertEquals(400,check("000000").statusCode());assertEquals(1,challenges.findById(user.getUserId()).orElseThrow().getAttempts());
  assertEquals(200,check("123456").statusCode());assertNull(users.findById(user.getUserId()).orElseThrow().getPhoneNumber());
  assertEquals(200,save("+84934567812").statusCode());
  var saved=users.findById(user.getUserId()).orElseThrow();assertEquals(phone,saved.getPhoneNumber());assertNotNull(saved.getPhoneVerifiedAt());
  assertNull(challenges.findById(user.getUserId()).orElseThrow().getVerifiedAt());
  assertEquals(200,save(phone).statusCode());assertEquals(400,save("0934567813").statusCode());
 }
 @Test void limitsAndExpiryPersistAcrossRequests()throws Exception{
  assertEquals(200,send().statusCode());assertEquals(429,send().statusCode());
  for(int i=0;i<5;i++)assertEquals(400,check("000000").statusCode());
  assertEquals(400,check("123456").statusCode());verify(provider,times(5)).check(sid,"000000");verify(provider,never()).check(sid,"123456");
  var c=challenges.findById(user.getUserId()).orElseThrow();c.setAttempts(0);c.setExpiresAt(Instant.now().minusSeconds(1));challenges.save(c);
  assertEquals(400,check("123456").statusCode());assertEquals(400,save(phone).statusCode());
 }
 @Test void anonymousCrossAccountAndDifferentPhoneCannotApprove()throws Exception{
  assertEquals(401,call("POST","/profile/phone/send-otp",Map.of("phoneNumber",phone),null).statusCode());
  assertEquals(200,send().statusCode());
  assertEquals(400,call("POST","/profile/phone/verify-otp",Map.of("phoneNumber","0934567813","code","123456"),token).statusCode());
  String other=json.readTree(call("POST","/login",Map.of("email","user@hlrcs.com","password","123456"),null).body()).path("data").path("accessToken").asString();
  assertEquals(400,call("POST","/profile/phone/verify-otp",Map.of("phoneNumber",phone,"code","123456"),other).statusCode());
  verify(provider,never()).check(anyString(),anyString());
 }
 @Test void providerFailureDoesNotPretendToSendOrChangeProfile()throws Exception{
  when(provider.send(anyString())).thenThrow(new org.hlrcs.exception.AppException("SMS chưa cấu hình",org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));
  assertEquals(503,send().statusCode());assertFalse(challenges.existsById(user.getUserId()));assertEquals(400,save(phone).statusCode());
 }
 @Test void esmsHashRejectsWrongAndOldCodesAndIsConsumedOnlyAfterApproval()throws Exception{
  when(provider.send(anyString())).thenReturn(new PhoneOtpProvider.SentOtp("esms-first",encoder.encode("123456")));
  assertEquals(200,send().statusCode());
  var first=challenges.findById(user.getUserId()).orElseThrow();assertNotNull(first.getOtpHash());assertNotEquals("123456",first.getOtpHash());
  assertEquals(400,check("000000").statusCode());assertEquals(400,save(phone).statusCode());
  first=challenges.findById(user.getUserId()).orElseThrow();first.setSentAt(Instant.now().minusSeconds(61));challenges.save(first);
  when(provider.send(anyString())).thenReturn(new PhoneOtpProvider.SentOtp("esms-second",encoder.encode("654321")));
  assertEquals(200,send().statusCode());assertEquals(400,check("123456").statusCode());assertEquals(200,check("654321").statusCode());
  verify(provider,never()).check(anyString(),anyString());assertNull(challenges.findById(user.getUserId()).orElseThrow().getOtpHash());
  assertEquals(200,save(phone).statusCode());assertNotNull(users.findById(user.getUserId()).orElseThrow().getPhoneVerifiedAt());
 }
}
