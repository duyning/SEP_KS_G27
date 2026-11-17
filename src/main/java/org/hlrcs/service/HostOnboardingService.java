package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.dto.response.PropertyRegistrationResponse;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

/** A single property decision also grants the applicant host access. */
@Service @RequiredArgsConstructor
public class HostOnboardingService {
    private final AuthService auth;
    private final UserRepository users;
    private final HostApplicationRepository applications;
    private final HostApplicationIdentityRepository identities;
    private final PropertyRegistrationRepository registrations;
    private final PropertyDocumentRepository documents;
    private final HostApplicationService accounts;
    private final PropertyRegistrationService properties;
    public record Current(HostApplicationService.View account, PropertyRegistrationResponse registration) {}
    @Transactional(readOnly=true)
    public Current current() {
        var user=auth.getCurrentUser();
        var latest=registrations.findByUser_UserIdOrderByCreatedAtDesc(user.getUserId()).stream().filter(PropertyRegistration::isHostOnboarding).findFirst();
        return new Current(accounts.current(),latest.map(PropertyRegistrationResponse::from).orElse(null));
    }
    @Transactional(rollbackFor=Exception.class,isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PropertyRegistrationResponse submit(HostApplicationService.Submission account,PropertyRegistrationRequest details,
            List<MultipartFile> photos,MultipartFile ownership,MultipartFile fireSafety) throws IOException {
        var owner=users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        if(owner.getStatus()!=UserStatus.ACTIVE||owner.getRole()!=UserRole.USER)
            throw new AppException("Chủ trọ đã được cấp quyền vui lòng dùng Đăng ký nhà trọ trong Host Portal.",HttpStatus.FORBIDDEN);
        if(registrations.findByUser_UserIdOrderByCreatedAtDesc(owner.getUserId()).stream().anyMatch(r->r.isHostOnboarding()))
            throw new AppException("Bạn đã có hồ sơ đăng ký. Vui lòng theo dõi hoặc bổ sung hồ sơ hiện tại.",HttpStatus.CONFLICT);
        accounts.submitCombined(account);
        return properties.submitOnboarding(details,photos,ownership,fireSafety);
    }
    @Transactional(readOnly=true)
    public void requireOwned(Integer id) {
        var me=auth.getCurrentUser();
        registrations.findById(id).filter(r->r.isHostOnboarding()&&r.getUser().getUserId().equals(me.getUserId()))
                .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hồ sơ đăng ký của bạn."));
    }
    @Transactional(readOnly=true)
    public void requirePhoto(Integer id) {
        var file=documents.findById(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy ảnh."));
        requireOwned(file.getRegistration().getRegistrationId());
    }
    public String applicantNote(PropertyRegistration registration){
        return registration.isHostOnboarding()?applications.findByUser_UserId(registration.getUser().getUserId()).map(HostApplication::getIntroduction).orElse(""):null;
    }
    public record HostAccountApplication(String userName,String email,String phone,String currentRole,boolean phoneVerified,
            boolean agreementAccepted,LocalDateTime submittedAt,String introduction) {}
    public HostAccountApplication accountApplication(PropertyRegistration registration){
        if(!registration.isHostOnboarding())return null;
        return applications.findByUser_UserId(registration.getUser().getUserId()).map(application->{
            var user=application.getUser();return new HostAccountApplication(user.getFullName(),user.getEmail(),user.getPhoneNumber(),
                    user.getRole().name(),user.getPhoneVerifiedAt()!=null,application.isAgreementAccepted(),application.getSubmittedAt(),application.getIntroduction());
        }).orElse(null);
    }
    // Called inside the property review transaction, after the full dossier was checked.
    public void approve(PropertyRegistration registration,User owner,User reviewer) {
        if(!registration.isHostOnboarding())return;
        if(owner.getRole()!=UserRole.USER||owner.getStatus()!=UserStatus.ACTIVE)
            throw new AppException("Tài khoản không còn đủ điều kiện cấp quyền chủ trọ.",HttpStatus.CONFLICT);
        var account=applications.findByUser_UserId(owner.getUserId()).filter(a->"MERGED".equals(a.getStatus()))
                .orElseThrow(()->new BadRequestException("Không tìm thấy thông tin cấp quyền trong hồ sơ gộp."));
        var files=documents.findByRegistration_RegistrationId(registration.getRegistrationId());
        if(!account.isAgreementAccepted()||files.stream().noneMatch(f->"FIRE_SAFETY".equals(f.getDocumentType())&&f.getArchivedAt()==null))
            throw new BadRequestException("Hồ sơ cần đủ cam kết và tài liệu PCCC trước khi phê duyệt.");
        var front=files.stream().filter(f->"ID_CARD".equals(f.getDocumentType())&&f.getArchivedAt()==null).findFirst().orElseThrow();
        var back=files.stream().filter(f->"ID_CARD_BACK".equals(f.getDocumentType())&&f.getArchivedAt()==null).findFirst()
                .orElseThrow(()->new BadRequestException("Hồ sơ cần đủ hai mặt CCCD trước khi phê duyệt."));
        // Revalidate identity images, including replacements submitted during supplementation.
        for(var file:List.of(front,back)) HostIdentityImages.parse("data:"+file.getContentType()+";base64,"+Base64.getEncoder().encodeToString(file.getFileContent()));
        var identity=identities.findById(account.getId()).orElseThrow();
        identity.setContentType(front.getContentType());identity.setContent(front.getFileContent().clone());
        identity.setBackContentType(back.getContentType());identity.setBackContent(back.getFileContent().clone());
        identities.save(identity);
        account.setStatus("APPROVED");account.setReviewedBy(reviewer);account.setReviewedAt(LocalDateTime.now());account.setUpdatedAt(LocalDateTime.now());
        account.setReviewerNote("Đã duyệt cùng hồ sơ nhà trọ đầu tiên.");account.setAllowResubmit(false);account.setRequestedFields(null);
        applications.save(account);
        owner.setRole(UserRole.ROOM_HOST);users.save(owner);
    }
}
