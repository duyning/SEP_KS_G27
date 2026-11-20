package org.hlrcs.service;
public interface PhoneOtpProvider {
    record SentOtp(String reference, String codeHash) { }
    SentOtp send(String e164Phone);
    boolean check(String verificationSid, String code);
}
