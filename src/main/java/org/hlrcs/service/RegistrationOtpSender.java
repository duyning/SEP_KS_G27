package org.hlrcs.service;

import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Component
public class RegistrationOtpSender {
    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;
    private final String zaloAccessToken;
    private final String zaloTemplateId;
    private final String zaloOtpField;
    private final RestClient zalo;

    public RegistrationOtpSender(ObjectProvider<JavaMailSender> mailSender,
                                 @Value("${app.registration.mail-from:}") String from,
                                 @Value("${app.registration.zalo-access-token:}") String zaloAccessToken,
                                 @Value("${app.registration.zalo-template-id:}") String zaloTemplateId,
                                 @Value("${app.registration.zalo-otp-field:otp}") String zaloOtpField) {
        this.mailSender = mailSender;
        this.from = from;
        this.zaloAccessToken = zaloAccessToken;
        this.zaloTemplateId = zaloTemplateId;
        this.zaloOtpField = zaloOtpField;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.zalo = RestClient.builder().baseUrl("https://business.openapi.zalo.me").requestFactory(factory).build();
    }

    public void send(RegistrationContact contact, String code) {
        if (contact.phone()) {
            sendZalo(contact.internationalPhone(), code);
        } else {
            sendEmail(contact.identifier(), code);
        }
    }

    private void sendEmail(String email, String code) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || from.isBlank()) {
            throw new AppException("Kênh gửi mã qua email chưa được cấu hình.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Mã xác minh đăng ký HL-RCS");
        message.setText("Mã xác minh đăng ký HL-RCS của bạn là " + code + ". Mã có hiệu lực trong 5 phút.");
        try {
            sender.send(message);
        } catch (MailException ex) {
            throw new AppException("Không gửi được mã qua email. Vui lòng thử lại sau.", HttpStatus.BAD_GATEWAY);
        }
    }

    private void sendZalo(String phone, String code) {
        if (zaloAccessToken.isBlank() || zaloTemplateId.isBlank() || zaloOtpField.isBlank()) {
            throw new AppException("Kênh gửi mã qua Zalo chưa được cấu hình.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        String failure = "Không gửi được mã qua Zalo. Vui lòng kiểm tra số điện thoại hoặc thử lại sau.";
        try {
            JsonNode reply = zalo.post().uri("/message/template")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("access_token", zaloAccessToken)
                    .body(Map.of("phone", phone, "template_id", zaloTemplateId,
                            "template_data", Map.of(zaloOtpField, code),
                            "tracking_id", UUID.randomUUID().toString().replace("-", "")))
                    .retrieve().body(JsonNode.class);
            if (reply == null || reply.path("error").asInt(-1) != 0) {
                throw new AppException(failure, HttpStatus.BAD_GATEWAY);
            }
        } catch (RestClientException ex) {
            throw new AppException(failure, HttpStatus.BAD_GATEWAY);
        }
    }
}
