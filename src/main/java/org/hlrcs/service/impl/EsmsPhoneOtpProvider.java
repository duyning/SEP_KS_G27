package org.hlrcs.service.impl;

import org.hlrcs.exception.AppException;
import org.hlrcs.service.PhoneOtpProvider;
import org.hlrcs.service.PhoneVerificationService;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;

@Component
@ConditionalOnProperty(name="app.phone-otp.provider",havingValue="esms",matchIfMissing=true)
public class EsmsPhoneOtpProvider implements PhoneOtpProvider {
    private static final URI ENDPOINT=URI.create("https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/");
    private final String apiKey,secretKey,brandname,template;
    private final ObjectMapper json;
    private final PasswordEncoder encoder;
    private final HttpClient client;
    private final URI endpoint;
    private final SecureRandom random=new SecureRandom();

    @Autowired
    public EsmsPhoneOtpProvider(@Value("${app.phone-otp.esms.api-key:}") String apiKey,
            @Value("${app.phone-otp.esms.secret-key:}") String secretKey,
            @Value("${app.phone-otp.esms.brandname:}") String brandname,
            @Value("${app.phone-otp.esms.template:Ma xac nhan cua ban la {code}}") String template,
            ObjectMapper json,PasswordEncoder encoder){
        this(apiKey,secretKey,brandname,template,json,encoder,HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),ENDPOINT);
    }
    // Package-local transport seam for isolated HTTP contract tests; production endpoint is fixed.
    EsmsPhoneOtpProvider(String apiKey,String secretKey,String brandname,String template,ObjectMapper json,PasswordEncoder encoder,HttpClient client,URI endpoint){
        this.apiKey=apiKey;this.secretKey=secretKey;this.brandname=brandname;this.template=template;this.json=json;this.encoder=encoder;this.client=client;this.endpoint=endpoint;
    }
    @Override public SentOtp send(String phone){
        if(apiKey.isBlank()||secretKey.isBlank()||brandname.isBlank())
            throw new AppException("Dịch vụ eSMS chưa được cấu hình. Vui lòng liên hệ quản trị viên.",HttpStatus.SERVICE_UNAVAILABLE);
        if(!template.contains("{code}")||template.indexOf("{code}")!=template.lastIndexOf("{code}"))
            throw new AppException("Mẫu OTP eSMS chưa được cấu hình hợp lệ.",HttpStatus.SERVICE_UNAVAILABLE);
        String normalized=PhoneVerificationService.normalize(phone);
        if(normalized.isBlank())throw new AppException("Số điện thoại không hợp lệ.");
        String code=String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));
        String content=template.replace("{code}",code);
        String unicode=content.chars().anyMatch(c->c>127)?"1":"0";
        String hash=encoder.encode(code);
        var body=Map.of("ApiKey",apiKey,"SecretKey",secretKey,"Phone",normalized,"Content",content,
                "Brandname",brandname,"SmsType","2","IsUnicode",unicode,"Sandbox","0","RequestId",UUID.randomUUID().toString());
        try{
            var request=HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(12))
                .header("Content-Type","application/json").header("Accept","application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
            // No automatic retry: a timeout may happen after the provider accepted an SMS.
            var response=client.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()==429)throw new AppException("Dịch vụ SMS đang giới hạn yêu cầu. Vui lòng thử lại sau.",HttpStatus.TOO_MANY_REQUESTS);
            if(response.statusCode()<200||response.statusCode()>=300)throw unavailable();
            var result=json.readTree(response.body());
            String status=result.path("CodeResult").asString("");
            if(!"100".equals(status))throw rejected(status);
            String id=result.path("SMSID").asString("");
            if(id.isBlank()||id.length()>40)throw unavailable();
            return new SentOtp(id,hash);
        }catch(AppException ex){throw ex;}
        catch(InterruptedException ex){Thread.currentThread().interrupt();throw unavailable();}
        catch(Exception ex){throw unavailable();}
    }
    private AppException unavailable(){return new AppException("Chưa xác nhận được yêu cầu gửi SMS. Vui lòng thử lại sau ít phút.",HttpStatus.SERVICE_UNAVAILABLE);}
    private AppException rejected(String code){
        String message=switch(code){
            case "101" -> "Thông tin kết nối eSMS chưa hợp lệ. Vui lòng liên hệ quản trị viên.";
            case "102" -> "Tài khoản eSMS chưa sẵn sàng gửi tin. Vui lòng liên hệ quản trị viên.";
            case "103" -> "Tài khoản eSMS không đủ số dư. Vui lòng liên hệ quản trị viên.";
            case "104","146","177" -> "Brandname hoặc mẫu SMS chưa được nhà mạng chấp thuận. Vui lòng liên hệ quản trị viên.";
            default -> "eSMS chưa chấp nhận yêu cầu gửi mã. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
        };
        return new AppException(message,HttpStatus.BAD_GATEWAY);
    }
    // eSMS delivers SMS; verification is performed with the account-bound hash in the service.
    // Existing remote-provider challenges require a new SMS after switching to eSMS.
    @Override public boolean check(String reference,String code){return false;}
}
