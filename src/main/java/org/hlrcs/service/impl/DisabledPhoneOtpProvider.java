package org.hlrcs.service.impl;

import org.hlrcs.service.PhoneOtpProvider;
import org.hlrcs.exception.AppException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="app.phone-otp.provider",havingValue="disabled")
public class DisabledPhoneOtpProvider implements PhoneOtpProvider {
    @Override public SentOtp send(String phone){
        throw new AppException("Gửi SMS đang tạm tắt để chỉnh giao diện OTP.",HttpStatus.SERVICE_UNAVAILABLE);
    }
    @Override public boolean check(String reference,String code){return false;}
}
