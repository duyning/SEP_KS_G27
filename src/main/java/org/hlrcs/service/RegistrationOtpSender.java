package org.hlrcs.service;

import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class RegistrationOtpSender {
    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;

    public RegistrationOtpSender(ObjectProvider<JavaMailSender> mailSender,
                                 @Value("${app.registration.mail-from:}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public void sendEmail(String email, String code) {
        sendEmailMessage(email, "Mã xác minh đăng ký NestHub",
                "Mã xác minh đăng ký NestHub của bạn là " + code + ". Mã có hiệu lực trong 5 phút.");
    }

    public void sendPasswordResetEmail(String email, String code) {
        sendEmailMessage(email, "Mã đặt lại mật khẩu NestHub",
                "Mã đặt lại mật khẩu NestHub của bạn là " + code
                        + ". Mã có hiệu lực trong 5 phút. Không chia sẻ mã với bất kỳ ai."
                        + " Nếu không yêu cầu, bạn có thể bỏ qua email này.");
    }

    private void sendEmailMessage(String email, String subject, String text) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || from.isBlank()) {
            throw new AppException("Kênh gửi mã qua email chưa được cấu hình.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
        } catch (MailException ex) {
            throw new AppException("Không gửi được mã qua email. Vui lòng thử lại sau.", HttpStatus.BAD_GATEWAY);
        }
    }

}
