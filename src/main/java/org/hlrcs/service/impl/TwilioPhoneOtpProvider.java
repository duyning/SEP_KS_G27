package org.hlrcs.service.impl;

import org.hlrcs.service.PhoneOtpProvider;
import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="app.phone-otp.provider",havingValue="twilio")
public class TwilioPhoneOtpProvider implements PhoneOtpProvider {
    private final String account, token, service;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public TwilioPhoneOtpProvider(@Value("${app.phone-otp.twilio.account-sid:}") String account,
            @Value("${app.phone-otp.twilio.auth-token:}") String token,
            @Value("${app.phone-otp.twilio.service-sid:}") String service, ObjectMapper json) {
        this.account=account; this.token=token; this.service=service; this.json=json;
    }
    private tools.jackson.databind.JsonNode post(String resource, String body, boolean checking) {
        if (!account.matches("AC[0-9a-fA-F]{32}") || token.isBlank() || !service.matches("VA[0-9a-fA-F]{32}"))
            throw new AppException("Dịch vụ SMS chưa được cấu hình. Vui lòng liên hệ quản trị viên để xác minh số điện thoại.", HttpStatus.SERVICE_UNAVAILABLE);
        try {
            var request=HttpRequest.newBuilder(URI.create("https://verify.twilio.com/v2/Services/"+service+"/"+resource))
                .timeout(Duration.ofSeconds(12)).header("Authorization", "Basic "+Base64.getEncoder().encodeToString((account+":"+token).getBytes(StandardCharsets.UTF_8)))
                .header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body)).build();
            var response=http.send(request,HttpResponse.BodyHandlers.ofString());
            if (checking && response.statusCode()==404) return json.readTree("{\"status\":\"expired\"}");
            if (response.statusCode()==429) throw new AppException("Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",HttpStatus.TOO_MANY_REQUESTS);
            if (response.statusCode()<200 || response.statusCode()>=300)
                throw new AppException("Dịch vụ SMS chưa xử lý được yêu cầu. Vui lòng thử lại sau hoặc liên hệ quản trị viên.",HttpStatus.BAD_GATEWAY);
            return json.readTree(response.body());
        } catch (AppException ex) { throw ex; }
        catch (InterruptedException ex) {Thread.currentThread().interrupt();throw new AppException("Yêu cầu SMS bị gián đoạn. Vui lòng thử lại.",HttpStatus.SERVICE_UNAVAILABLE);}
        catch (Exception ex) {throw new AppException("Không thể kết nối dịch vụ SMS. Vui lòng thử lại sau.",HttpStatus.SERVICE_UNAVAILABLE);}
    }
    @Override public SentOtp send(String phone) {
        var result=post("Verifications","To="+URLEncoder.encode(phone,StandardCharsets.UTF_8)+"&Channel=sms",false);
        String sid=result.path("sid").asString("");
        if (!"pending".equals(result.path("status").asString()) || !sid.matches("VE[0-9a-fA-F]{32}"))
            throw new AppException("Dịch vụ SMS chưa xác nhận yêu cầu gửi mã. Vui lòng thử lại.",HttpStatus.BAD_GATEWAY);
        return new SentOtp(sid,null);
    }
    @Override public boolean check(String sid, String code) {
        var result=post("VerificationCheck","VerificationSid="+URLEncoder.encode(sid,StandardCharsets.UTF_8)+"&Code="+URLEncoder.encode(code,StandardCharsets.UTF_8),true);
        return "approved".equals(result.path("status").asString()) && sid.equals(result.path("sid").asString());
    }
}
