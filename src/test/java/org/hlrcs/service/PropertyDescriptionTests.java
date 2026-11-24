package org.hlrcs.service;
import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.exception.AppException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class PropertyDescriptionTests {
 @Test void providerFailuresRemainSpecificAndDoNotExposeProviderPayload() throws Exception {
  for(int status:List.of(400,401,403,404,429,500,502,503,504)){
   var auth=mock(AuthService.class);var user=new User();user.setUserId(1);user.setStatus(UserStatus.ACTIVE);when(auth.getCurrentUser()).thenReturn(user);
   var http=mock(java.net.http.HttpClient.class);java.net.http.HttpResponse<byte[]> reply=mock(java.net.http.HttpResponse.class);
   when(reply.statusCode()).thenReturn(status);when(reply.body()).thenReturn("PRIVATE_PROVIDER_PAYLOAD".getBytes());when(http.send(any(java.net.http.HttpRequest.class),org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<byte[]>>any())).thenReturn(reply);
   var service=new PropertyDescriptionService(auth,json,"test-only-key","gemini-test",http);
   var error=assertThrows(AppException.class,()->service.generate(new PropertyDescriptionService.Facts("Nhà trọ A","Chung cư mini","","",List.of(),List.of(),"")));
   assertFalse(error.getMessage().contains("PRIVATE_PROVIDER_PAYLOAD"));assertFalse(error.getMessage().contains("test-only-key"));
   assertFalse(error.getMessage().startsWith("AI chưa tạo được mô tả."));
   if(status==429){assertTrue(error.getMessage().contains("quota"));assertEquals(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,error.getStatus());}
   if(status==404)assertTrue(error.getMessage().contains("Model"));
   verify(http,times(status>=500?2:1)).send(any(java.net.http.HttpRequest.class),any());
  }
 }

 @Test void retriesTemporaryOutageAndCachesRecoveredSuggestion() throws Exception {
  var auth = mock(AuthService.class);
  var user = new User();
  user.setUserId(1);
  user.setStatus(UserStatus.ACTIVE);
  when(auth.getCurrentUser()).thenReturn(user);

  var http = mock(java.net.http.HttpClient.class);
  java.net.http.HttpResponse<byte[]> unavailable = mock(java.net.http.HttpResponse.class);
  when(unavailable.statusCode()).thenReturn(503);
  java.net.http.HttpResponse<byte[]> success = mock(java.net.http.HttpResponse.class);
  when(success.statusCode()).thenReturn(200);
  String text = "Nhà trọ thử nghiệm tại Tân Xã với thông tin do chủ trọ cung cấp.";
  when(success.body()).thenReturn(response("STOP", text));
  when(http.send(any(java.net.http.HttpRequest.class),
          org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<byte[]>>any()))
          .thenReturn(unavailable, success);

  var service = new PropertyDescriptionService(auth, json, "test-only-key", "gemini-test", http);
  var facts = new PropertyDescriptionService.Facts("Nhà trọ A", "Chung cư mini", "Tân Xã", "", List.of(), List.of(), "");
  assertEquals(text, service.generate(facts).description());
  assertEquals(text, service.generate(facts).description());

  var requests = org.mockito.ArgumentCaptor.forClass(java.net.http.HttpRequest.class);
  verify(http, times(2)).send(requests.capture(), any());
  var first = requests.getAllValues().get(0);
  var retry = requests.getAllValues().get(1);
  assertEquals(first.uri(), retry.uri());
  assertTrue(retry.timeout().orElseThrow().compareTo(first.timeout().orElseThrow()) < 0);
 }
 @Test void timeoutsAndTruncatedResponsesDoNotBecomeGenericProviderErrors() throws Exception {
  var auth=mock(AuthService.class);var user=new User();user.setUserId(1);user.setStatus(UserStatus.ACTIVE);when(auth.getCurrentUser()).thenReturn(user);
  var http=mock(java.net.http.HttpClient.class);when(http.send(any(java.net.http.HttpRequest.class),org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<byte[]>>any())).thenThrow(new java.net.http.HttpTimeoutException("timeout"));
  var service=new PropertyDescriptionService(auth,json,"test-only-key","gemini-test",http);
  var facts=new PropertyDescriptionService.Facts("Nhà trọ A","Chung cư mini","","",List.of(),List.of(),"");
  var timeout=assertThrows(AppException.class,()->service.generate(facts));assertEquals(org.springframework.http.HttpStatus.GATEWAY_TIMEOUT,timeout.getStatus());
  java.net.http.HttpResponse<byte[]> reply=mock(java.net.http.HttpResponse.class);when(reply.statusCode()).thenReturn(200);when(reply.body()).thenReturn(response("MAX_TOKENS",""));
  reset(http);when(http.send(any(java.net.http.HttpRequest.class),org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<byte[]>>any())).thenReturn(reply);
  var second=new PropertyDescriptionService(auth,json,"test-only-key","gemini-test",http);
  assertTrue(assertThrows(AppException.class,()->second.generate(facts)).getMessage().contains("chưa hoàn chỉnh"));
 }
 private final ObjectMapper json=new ObjectMapper();
 byte[] response(String reason,String text){var parts=List.of(Map.of("thought",true,"text","hidden reasoning"),Map.of("text",text));var content=Map.of("parts",parts);return json.writeValueAsBytes(Map.of("candidates",List.of(Map.of("finishReason",reason,"content",content))));}
 @Test void acceptsOnlyCompleteBoundedPlainTextAndExcludesThinking(){String text="Nhà trọ thử nghiệm tại Tân Xã, thông tin được chủ trọ cung cấp để giới thiệu nơi ở.";assertEquals(text,PropertyDescriptionService.parse(response("STOP",text),json).description());for(String bad:List.of("short","a".repeat(2001),"<script>Unexpected content should never be accepted</script>"))assertThrows(IllegalArgumentException.class,()->PropertyDescriptionService.parse(response("STOP",bad),json));assertThrows(IllegalArgumentException.class,()->PropertyDescriptionService.parse(response("MAX_TOKENS",text),json));assertThrows(IllegalArgumentException.class,()->PropertyDescriptionService.parse(new byte[65537],json));}
 @Test void missingConfigurationFailsWithoutPretendingToGenerate() {
  var auth = mock(AuthService.class);
  var user = new User();
  user.setUserId(1);
  user.setStatus(UserStatus.ACTIVE);
  when(auth.getCurrentUser()).thenReturn(user);
  var http = mock(java.net.http.HttpClient.class);
  var service = new PropertyDescriptionService(auth, json, "", "gemini-test", http);
  var facts = new PropertyDescriptionService.Facts("Nhà trọ A", "Ký túc xá tư nhân", "Tân Xã", "", List.of(), List.of(), "");
  var error = assertThrows(AppException.class, () -> service.generate(facts));
  assertTrue(error.getMessage().contains("AI chưa được cấu hình"));
  verifyNoInteractions(http);
 }
 @Test void acceptsCustomTypeButNotBlankOversizedOrControlCharacters(){assertTrue(PropertyRegistrationService.validPropertyType("Ký túc xá tư nhân"));for(var value:List.of(""," ","a","a".repeat(101),"Loại\nkhác"))assertFalse(PropertyRegistrationService.validPropertyType(value));}
 @Test void reusesIdenticalSuggestionsPerAccountAndLimitsNewGeminiCalls() throws Exception {
  var auth=mock(AuthService.class);var user=new User();user.setUserId(1);user.setStatus(UserStatus.ACTIVE);when(auth.getCurrentUser()).thenReturn(user);
  var http=mock(java.net.http.HttpClient.class);java.net.http.HttpResponse<byte[]> reply=mock(java.net.http.HttpResponse.class);
  when(reply.statusCode()).thenReturn(200);String text="Nhà trọ thử nghiệm tại Tân Xã với thông tin giới thiệu do chủ trọ cung cấp.";
  when(reply.body()).thenReturn(response("STOP",text));
  when(http.send(any(java.net.http.HttpRequest.class),org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<byte[]>>any())).thenReturn(reply);
  var service=new PropertyDescriptionService(auth,json,"test-only-key","gemini-test",http);
  var facts=new PropertyDescriptionService.Facts("Nhà trọ A","Ký túc xá tư nhân","Tân Xã","",List.of(),List.of(),"");
  assertEquals(text,service.generate(facts).description());
  assertEquals(text,service.generate(facts).description());
  var changed=new PropertyDescriptionService.Facts("Nhà trọ B","Ký túc xá tư nhân","Tân Xã","",List.of(),List.of(),"");
  assertThrows(AppException.class,()->service.generate(changed));
  var other=new User();other.setUserId(2);other.setStatus(UserStatus.ACTIVE);when(auth.getCurrentUser()).thenReturn(other);
  assertEquals(text,service.generate(facts).description());
  var capture=org.mockito.ArgumentCaptor.forClass(java.net.http.HttpRequest.class);verify(http,times(2)).send(capture.capture(),any());
  assertEquals("test-only-key",capture.getValue().headers().firstValue("x-goog-api-key").orElseThrow());assertEquals("generativelanguage.googleapis.com",capture.getValue().uri().getHost());assertEquals("POST",capture.getValue().method());
 }
}
