package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.*;
import org.hlrcs.dto.response.HostPropertyResponse.Attachment;
import org.hlrcs.dto.response.PropertyRegistrationResponse;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class PropertyEditService {
    private final AuthService auth;
    private final UserRepository users;
    private final PropertyRegistrationRepository registrations;
    private final PropertyRepository properties;
    private final PropertyDocumentRepository documents;
    private final PropertySubmissionEventRepository events;
    private final PropertyRegistrationService validation;
    private final ObjectMapper json;
    private final org.springframework.context.ApplicationEventPublisher publisher;
    public record Edit(Integer registrationId,Integer propertyId,String mode,String status,String reasonNote,
        List<String> requestedFields,Map<String,String> fieldNotes,Set<String> editableFields,boolean legacyScope,PropertyRegistrationRequest details,
        List<Attachment> photos,List<Attachment> documents,String versionToken) {}
    private PropertyRegistration owned(Integer id) {
        var registration=registrations.findById(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hồ sơ."));
        if(!registration.getUser().getUserId().equals(auth.getCurrentUser().getUserId()))throw new ResourceNotFoundException("Không tìm thấy hồ sơ.");
        return registration;
    }
    private Property target(PropertyRegistration row) {
        var candidates=properties.findByOwner_UserIdOrderByPropertyIdAsc(row.getUser().getUserId());
        return candidates.stream().filter(p->row.getTargetPropertyId()!=null?row.getTargetPropertyId().equals(p.getPropertyId()):p.getRegistration()!=null&&row.getRegistrationId().equals(p.getRegistration().getRegistrationId())).findFirst().orElse(null);
    }
    private void assertEditable(PropertyRegistration row,Property property) {
        if(row.getStatus()==RegistrationStatus.PENDING)throw new AppException("Hồ sơ đang chờ xét duyệt, chưa thể chỉnh sửa.",HttpStatus.CONFLICT);
        if(row.getStatus()==RegistrationStatus.APPROVED && (property==null||property.getRegistration()==null||!property.getRegistration().getRegistrationId().equals(row.getRegistrationId())))throw new AppException("Đây là phiên bản cũ. Vui lòng mở nhà trọ hiện tại để cập nhật.",HttpStatus.CONFLICT);
        if(row.getTargetPropertyId()!=null&&row.getStatus()!=RegistrationStatus.APPROVED && (property==null||property.getRegistration()==null||!Objects.equals(row.getBaseRegistrationId(),property.getRegistration().getRegistrationId())))throw new AppException("Nhà trọ đã có phiên bản mới hơn. Vui lòng tải lại.",HttpStatus.CONFLICT);
        if(property!=null && row.getStatus()==RegistrationStatus.APPROVED && registrations.findByUser_UserIdOrderByCreatedAtDesc(row.getUser().getUserId()).stream().anyMatch(r->property.getPropertyId().equals(r.getTargetPropertyId())&&(r.getStatus()==RegistrationStatus.PENDING||r.getStatus()==RegistrationStatus.NEEDS_SUPPLEMENT)))throw new AppException("Nhà trọ đã có đề nghị thay đổi đang xử lý. Vui lòng mở đề nghị đó.",HttpStatus.CONFLICT);
    }
    private String token(PropertyRegistration row) {
        try {
            String ids=documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(row.getRegistrationId()).stream().map(file->file.getDocumentId().toString()).reduce("",(a,b)->a+","+b);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((row.getRegistrationId()+"|"+row.getStatus()+"|"+row.getReviewedAt()+"|"+row.getSubmittedAt()+"|"+row.getRegistrationDetails()+"|"+row.getRequestedFieldsJson()+"|"+Objects.toString(row.getFieldNotesJson(),"")+"|"+ids).getBytes(StandardCharsets.UTF_8)));
        }catch(java.security.NoSuchAlgorithmException impossible){throw new IllegalStateException(impossible);}
    }
    @Transactional(readOnly=true)
    public Edit edit(Integer id) {
        var row=owned(id);var property=target(row);assertEditable(row,property);
        if(row.getRegistrationDetails()==null)throw new BadRequestException("Hồ sơ cũ chưa có đầy đủ dữ liệu. Vui lòng liên hệ staff để cập nhật.");
        var form=json.readValue(row.getRegistrationDetails(),PropertyRegistrationRequest.class);
        var photos=new ArrayList<Attachment>();var files=new ArrayList<Attachment>();
        for(var file:documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id)){
            var item=new Attachment(file.getDocumentId(),file.getDocumentType(),file.getFileName(),file.getVerificationStatus());
            if(Objects.toString(file.getDocumentType(),"").matches("PHOTO_\\d+"))photos.add(item);else files.add(item);
        }
        var requested=RegistrationEditPolicy.requested(row,json);
        return new Edit(id,property==null?null:property.getPropertyId(),row.getStatus()==RegistrationStatus.APPROVED?"CHANGE_REQUEST":"RESUBMIT",row.getStatus().name(),row.getReasonNote(),requested,RegistrationEditPolicy.fieldNotes(row,json),
            RegistrationEditPolicy.allowed(row,json),row.getStatus()==RegistrationStatus.NEEDS_SUPPLEMENT&&requested.isEmpty(),form,photos,files,token(row));
    }
    @Transactional(rollbackFor=Exception.class,isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PropertyRegistrationResponse submit(Integer id,PropertyResubmissionRequest edit,List<MultipartFile> photos,MultipartFile ownership,MultipartFile idCard,MultipartFile fireSafety) throws IOException {
        var owner=users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var row=registrations.findForReview(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hồ sơ."));
        if(!row.getUser().getUserId().equals(owner.getUserId()))throw new ResourceNotFoundException("Không tìm thấy hồ sơ.");
        var property=target(row);assertEditable(row,property);
        if(!token(row).equals(edit.versionToken()))throw new AppException("Hồ sơ đã thay đổi từ lúc bạn mở trang. Vui lòng tải lại trước khi gửi.",HttpStatus.CONFLICT);
        var old=json.readValue(row.getRegistrationDetails(),PropertyRegistrationRequest.class);var value=edit.details();
        var allowed=RegistrationEditPolicy.allowed(row,json);
        var before=json.valueToTree(old);var after=json.valueToTree(value);
        var changed=false;
        for(var field:PropertyRegistrationRequest.class.getRecordComponents()){
            var key=field.getName();if(key.equals("termsAccepted"))continue;
            var previous=before.get(key);var next=after.get(key);
            boolean emptyEquivalent=(previous==null||previous.isNull())&&next!=null&&next.isTextual()&&next.asString().isEmpty();
            if(!emptyEquivalent&&!Objects.equals(previous,next)){changed=true;if(!allowed.contains(key))throw new BadRequestException("Bạn chỉ được sửa các mục staff yêu cầu bổ sung: "+key);}
        }
        validation.validate(value);
        var current=documents.findByRegistration_RegistrationId(id);var currentPhotos=current.stream().filter(d->Objects.toString(d.getDocumentType(),"").matches("PHOTO_\\d+")).toList();
        var retained=new HashSet<>(edit.retainedPhotoIds());
        if(retained.size()!=edit.retainedPhotoIds().size()||!currentPhotos.stream().map(PropertyDocument::getDocumentId).toList().containsAll(retained))throw new BadRequestException("Danh sách ảnh giữ lại không thuộc hồ sơ này.");
        var uploads=photos==null?List.<MultipartFile>of():photos;
        boolean photoChange=retained.size()!=currentPhotos.size()||!uploads.isEmpty();
        if(photoChange&&!allowed.contains("photos"))throw new BadRequestException("Staff chưa yêu cầu thay đổi hình ảnh nhà trọ.");
        if(retained.size()+uploads.size()<1||retained.size()+uploads.size()>10)throw new BadRequestException("Cần từ 1 đến 10 ảnh nhà trọ.");
        var replacements=new LinkedHashMap<String,MultipartFile>();
        if(ownership!=null&&!ownership.isEmpty())replacements.put("OWNERSHIP",ownership);
        if(idCard!=null&&!idCard.isEmpty())replacements.put("ID_CARD",idCard);
        if(fireSafety!=null&&!fireSafety.isEmpty())replacements.put("FIRE_SAFETY",fireSafety);
        for(var key:replacements.keySet())if(!allowed.contains(key))throw new BadRequestException("Staff chưa yêu cầu thay đổi tài liệu này: "+key);
        if(!changed&&!photoChange&&replacements.isEmpty())throw new BadRequestException("Bạn chưa thay đổi thông tin hoặc bổ sung tài liệu nào.");
        var address=value.addressDetail().trim()+", "+value.commune();
        var approvedId=property==null?null:property.getRegistration().getRegistrationId();
        if(properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).stream().anyMatch(p->(property==null||!p.getPropertyId().equals(property.getPropertyId()))&&p.getName().trim().equalsIgnoreCase(value.name().trim())&&Objects.toString(p.getAddress(),"").equalsIgnoreCase(address)))throw new AppException("Tên và địa chỉ đã thuộc một nhà trọ khác.",HttpStatus.CONFLICT);
        if(registrations.findByUser_UserIdOrderByCreatedAtDesc(owner.getUserId()).stream().anyMatch(r->!r.getRegistrationId().equals(id)&&!r.getRegistrationId().equals(approvedId)&&r.getTargetPropertyId()==null&&r.getStatus()!=RegistrationStatus.REJECTED&&r.getName().trim().equalsIgnoreCase(value.name().trim())&&Objects.toString(r.getAddress(),"").equalsIgnoreCase(address)))throw new AppException("Tên và địa chỉ đã thuộc một hồ sơ nhà trọ khác.",HttpStatus.CONFLICT);
        boolean revision=row.getStatus()==RegistrationStatus.APPROVED;
        var destination=revision?registrations.save(PropertyRegistration.builder().user(owner).targetPropertyId(property.getPropertyId()).baseRegistrationId(row.getRegistrationId()).name(value.name().trim()).status(RegistrationStatus.PENDING).build()):row;
        var previousIds=current.stream().map(PropertyDocument::getDocumentId).toList();
        var now=LocalDateTime.now();int photoIndex=0;
        for(var file:current){
            boolean photo=Objects.toString(file.getDocumentType(),"").matches("PHOTO_\\d+");
            boolean keep=photo?retained.contains(file.getDocumentId()):!replacements.containsKey(file.getDocumentType());
            if(revision){if(keep)documents.save(PropertyDocument.builder().registration(destination).documentType(photo?"PHOTO_"+(photoIndex++):file.getDocumentType()).fileName(file.getFileName()).contentType(file.getContentType()).fileContent(file.getFileContent()).fileSize(file.getFileSize()).verificationStatus("PENDING").uploadedAt(file.getUploadedAt()).build());}
            else if(!keep)file.setArchivedAt(now);
            else if(photo)file.setDocumentType("PHOTO_"+(photoIndex++));
        }
        for(var file:uploads)validation.saveFile(destination,"PHOTO_"+(photoIndex++),file,false);
        for(var replacement:replacements.entrySet())validation.saveFile(destination,replacement.getKey(),replacement.getValue(),true);
        destination.setName(value.name().trim());destination.setAddress(address);destination.setContactInfo(value.managerName().trim()+" · "+value.contactPhone());
        destination.setGoogleMapLink(PropertyRegistrationService.mapLink(value));destination.setRegistrationDetails(json.writeValueAsString(value));
        var previousNote=destination.getReasonNote();destination.setStatus(RegistrationStatus.PENDING);destination.setSubmittedAt(now);destination.setRequestedFieldsJson(null);destination.setFieldNotesJson(null);destination.setReasonNote(revision?"Chủ trọ gửi đề nghị thay đổi thông tin. Bản đã duyệt tiếp tục hiển thị.":"Chủ trọ đã bổ sung thông tin và gửi lại xét duyệt.");
        registrations.saveAndFlush(destination);documents.flush();
        if(!documents.existsByRegistration_RegistrationIdAndDocumentTypeAndFileContentIsNotNull(destination.getRegistrationId(),"OWNERSHIP")||!documents.existsByRegistration_RegistrationIdAndDocumentTypeAndFileContentIsNotNull(destination.getRegistrationId(),"ID_CARD"))throw new BadRequestException("Cần giấy phép kinh doanh và CCCD để gửi xét duyệt.");
        events.save(PropertySubmissionEvent.builder().registration(destination).actor(owner).action(revision?"CHANGE_REQUESTED":"RESUBMITTED").previousDetails(json.writeValueAsString(old)).submittedDetails(json.writeValueAsString(value)).previousDocumentIds(json.writeValueAsString(previousIds)).previousReviewNote(previousNote).build());
        publisher.publishEvent(new AutomaticVerificationAssignment.Submitted(destination.getRegistrationId()));
        return PropertyRegistrationResponse.from(destination);
    }
}
