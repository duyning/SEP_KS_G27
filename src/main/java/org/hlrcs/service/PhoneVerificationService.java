package org.hlrcs.service;

import org.hlrcs.entity.*;
import org.hlrcs.repository.*;
import org.hlrcs.exception.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;

@Service
public class PhoneVerificationService {
    private final UserRepository users;
    private final PhoneVerificationRepository challenges;
    private final PhoneOtpProvider provider;
    private final org.springframework.security.crypto.password.PasswordEncoder encoder;
    public PhoneVerificationService(UserRepository users, PhoneVerificationRepository challenges, PhoneOtpProvider provider,org.springframework.security.crypto.password.PasswordEncoder encoder) {
        this.users=users;this.challenges=challenges;this.provider=provider;this.encoder=encoder;
    }
    public static String normalize(String value) {
        if (value==null || value.isBlank()) return "";
        String phone=value.trim().replaceAll("[\\s.-]", "");
        if (phone.startsWith("+84")) phone="0"+phone.substring(3);
        if (!phone.matches("0[35789][0-9]{8}")) throw new BadRequestException("Số điện thoại Việt Nam không hợp lệ.");
        return phone;
    }
    public static boolean requiresVerification(User user, String phone) {
        return ("GOOGLE".equalsIgnoreCase(user.getAuthProvider()) || user.getGoogleSubject()!=null)
            && !phone.isBlank() && !Objects.equals(normalize(user.getPhoneNumber()),phone);
    }
    private User locked(Integer id) {return users.findForRegistrationUpdate(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy tài khoản."));}
    private void available(User user,String phone) {
        String international="+84"+phone.substring(1);
        if (users.findByPhoneNumber(phone).filter(u->!u.getUserId().equals(user.getUserId())).isPresent()
            || users.findByPhoneNumber(international).filter(u->!u.getUserId().equals(user.getUserId())).isPresent())
            throw new BadRequestException("Số điện thoại này đã được sử dụng.");
    }
    @Transactional
    public Map<String,Object> send(Integer userId, String value) {
        User user=locked(userId);String phone=normalize(value);
        if (phone.isBlank() || phone.equals(normalize(user.getPhoneNumber())) && user.getPhoneVerifiedAt()!=null)
            throw new BadRequestException("Số điện thoại đã được xác minh hoặc chưa hợp lệ.");
        available(user,phone);
        Instant now=Instant.now();var challenge=challenges.findById(userId).orElseGet(()->{var c=new PhoneVerification();c.setUserId(userId);return c;});
        if(challenge.getSentAt()!=null && now.isBefore(challenge.getSentAt().plusSeconds(60)))
            throw new AppException("Vui lòng chờ 60 giây giữa hai lần gửi OTP.",HttpStatus.TOO_MANY_REQUESTS);
        if(challenge.getWindowStart()==null || !now.isBefore(challenge.getWindowStart().plusSeconds(86400))){challenge.setWindowStart(now);challenge.setSends(0);}
        if(challenge.getSends()>=10) throw new AppException("Bạn đã đạt giới hạn 10 lần gửi OTP trong 24 giờ. Vui lòng thử lại sau.",HttpStatus.TOO_MANY_REQUESTS);
        var sent=provider.send("+84"+phone.substring(1));
        String sid=sent.reference();
        // A provider may reuse the same verification on resend. Do not reset its failed-attempt budget.
        if(!sid.equals(challenge.getProviderSid())) challenge.setAttempts(0);
        challenge.setOtpHash(sent.codeHash());
        challenge.setPhone(phone);challenge.setProviderSid(sid);challenge.setSentAt(now);challenge.setExpiresAt(now.plusSeconds(300));challenge.setVerifiedAt(null);challenge.setSends(challenge.getSends()+1);
        challenges.save(challenge);
        return Map.of("phoneNumber",phone,"expiresAt",challenge.getExpiresAt(),"resendAt",now.plusSeconds(60));
    }
    @Transactional
    public Map<String,Object> verify(Integer userId,String value,String code) {
        locked(userId);String phone=normalize(value);Instant now=Instant.now();
        var challenge=challenges.findById(userId).orElse(null);
        if(challenge==null || !phone.equals(challenge.getPhone()) || challenge.getExpiresAt()==null || !now.isBefore(challenge.getExpiresAt()) || challenge.getProviderSid()==null)
            return Map.of("verified",false,"message","Mã OTP đã hết hạn hoặc không khớp số điện thoại. Vui lòng gửi lại mã.");
        if(challenge.getVerifiedAt()!=null) return Map.of("verified",true);
        if(challenge.getAttempts()>=5) return Map.of("verified",false,"message","Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới sau khi hết thời gian chờ.");
        boolean approved=challenge.getOtpHash()!=null ? encoder.matches(code,challenge.getOtpHash()) : provider.check(challenge.getProviderSid(),code);
        challenge.setAttempts(challenge.getAttempts()+1);
        if(approved){challenge.setVerifiedAt(now);challenge.setExpiresAt(now.plusSeconds(300));challenge.setOtpHash(null);}
        challenges.save(challenge);
        // Return an error result instead of throwing, so failed attempts commit.
        return approved?Map.of("verified",true):Map.of("verified",false,"message","Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại.");
    }
    /** Called inside the profile transaction while holding the same user lock. */
    @Transactional
    public void saveVerifiedPhone(Integer userId,String value){
        var user=locked(userId);String phone=normalize(value);
        if(phone.isBlank())throw new BadRequestException("Vui lòng nhập số điện thoại hợp lệ.");
        consume(user,phone);user.setPhoneNumber(phone);users.save(user);
    }
    @Transactional
    public void consume(User user,String phone) {
        available(user,phone);
        var challenge=challenges.findById(user.getUserId()).orElse(null);
        if(challenge==null || !phone.equals(challenge.getPhone()) || challenge.getVerifiedAt()==null || !Instant.now().isBefore(challenge.getExpiresAt()))
            throw new BadRequestException("Vui lòng xác minh OTP trước khi lưu số điện thoại mới.");
        user.setPhoneVerifiedAt(challenge.getVerifiedAt());
        challenge.setVerifiedAt(null);challenge.setProviderSid(null);challenge.setOtpHash(null);challenges.save(challenge);
    }
}
