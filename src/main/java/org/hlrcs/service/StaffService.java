package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.dto.response.StaffResponse.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StaffService {
    private final AuthService auth;
    private final UserRepository users;
    private final PropertyRegistrationRepository registrations;
    private final PropertyDocumentRepository documents;
    private final PropertyRepository properties;
    private final ModerationLogRepository logs;
    private final ReportRepository reports;
    private final SupportRequestRepository support;
    private final PostRepository posts;
    private final ObjectMapper json;
    private final PropertySubmissionEventRepository submissionEvents;

    private final ServiceRegistrationRepository serviceApplications;

    private PropertyRegistrationRequest submission(PropertyRegistration registration) {
        if (registration.getRegistrationDetails() == null) return null;
        try { return json.readValue(registration.getRegistrationDetails(), PropertyRegistrationRequest.class); }
        catch (tools.jackson.core.JacksonException exception) { return null; }
    }
    private Verification summary(PropertyRegistration registration) {
        var details = submission(registration);
        var files = documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(registration.getRegistrationId());
        int count = (int) files.stream().filter(file -> Set.of("OWNERSHIP", "ID_CARD", "FIRE_SAFETY").contains(Objects.toString(file.getDocumentType(), ""))).count();
        int required = (int) files.stream().filter(file -> Set.of("OWNERSHIP", "ID_CARD").contains(Objects.toString(file.getDocumentType(), ""))).map(PropertyDocumentRepository.Metadata::getDocumentType).distinct().count();
        var cover = files.stream().filter(file -> Objects.toString(file.getDocumentType(), "").matches("PHOTO_\\d+")).findFirst().map(PropertyDocumentRepository.Metadata::getDocumentId).orElse(null);
        return new Verification(registration.getRegistrationId(), registration.getName(), registration.getAddress(),
                registration.getUser().getFullName(), registration.getUser().getEmail(), registration.getUser().getPhoneNumber(),
                details == null ? null : details.managerName(), details == null ? null : details.contactPhone(), details == null ? null : details.propertyType(),
                registration.getStatus().name(), registration.getCreatedAt(), registration.getReviewedAt(),
                registration.getReviewer() == null ? null : registration.getReviewer().getFullName(), count, required, cover, registration.getUser().getUserId(),registration.getTargetPropertyId(),registration.getSubmittedAt());
    }
    private Activity activity(ModerationLog log) {
        return new Activity(log.getLogId(), log.getStaff().getFullName(), log.getTargetType(), log.getTargetId(), log.getAction(), log.getNote(), log.getCreatedAt());
    }
    @Transactional(readOnly = true)
    public List<Verification> verifications() { return registrations.findAllByOrderByCreatedAtDesc().stream().map(this::summary).toList(); }

    @Transactional(readOnly = true)
    public Detail detail(Integer id) {
        var registration = registrations.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ xác minh."));
        var photos = new ArrayList<Attachment>();
        var privateFiles = new ArrayList<Attachment>();
        for (var file : documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id)) {
            var value = new Attachment(file.getDocumentId(), file.getDocumentType(), file.getFileName(), file.getVerificationStatus(),file.getContentType(),file.getFileSize(),file.getUploadedAt());
            if (Objects.toString(file.getDocumentType(), "").matches("PHOTO_\\d+")) photos.add(value);
            else if (Set.of("OWNERSHIP", "ID_CARD", "FIRE_SAFETY").contains(Objects.toString(file.getDocumentType(), ""))) privateFiles.add(value);
        }
        var published=registration.getTargetPropertyId()==null?null:properties.findById(registration.getTargetPropertyId()).filter(p->p.getOwner().getUserId().equals(registration.getUser().getUserId())).map(Property::getRegistration).map(this::submission).orElse(null);
        return new Detail(summary(registration), submission(registration), photos, privateFiles, registration.getReasonNote(),
                logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION", id).stream().map(this::activity).toList(),published,
                submissionEvents.findByRegistration_RegistrationIdOrderByCreatedAtAsc(id).stream().map(event->new SubmissionEvent(event.getEventId(),event.getActor().getFullName(),event.getAction(),event.getCreatedAt())).toList());
    }
    public record FileContent(byte[] bytes, String contentType) {}
    @Transactional(readOnly = true)
    public FileContent file(Integer registrationId, Integer documentId) {
        var file = documents.findById(documentId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu."));
        if (!file.getRegistration().getRegistrationId().equals(registrationId) || file.getFileContent() == null
                || !Set.of("image/jpeg", "image/png", "image/webp", "application/pdf").contains(Objects.toString(file.getContentType(), ""))) throw new ResourceNotFoundException("Không tìm thấy tài liệu.");
        return new FileContent(file.getFileContent(), file.getContentType());
    }
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail review(Integer id, String decision, String note,List<String> requestedFields) {
        if (decision == null || !Set.of("APPROVE", "REJECT", "REQUEST_SUPPLEMENT").contains(decision)) throw new BadRequestException("Quyết định xét duyệt không hợp lệ.");
        String reason = note == null ? "" : note.trim();
        if (reason.length() > 2000 || (!decision.equals("APPROVE") && reason.length() < 10)) throw new BadRequestException("Nội dung phản hồi cần từ 10 đến 2000 ký tự.");
        var ownerId=registrations.findOwnerId(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hồ sơ."));
        var owner=users.findForRegistrationUpdate(ownerId).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy chủ trọ."));
        var registration = registrations.findForReview(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ."));
        boolean supplement = decision.equals("REQUEST_SUPPLEMENT");
        if (registration.getStatus() != RegistrationStatus.PENDING && (supplement || registration.getStatus() != RegistrationStatus.NEEDS_SUPPLEMENT)) throw new AppException("Hồ sơ đã được xử lý. Vui lòng tải lại để xem kết quả mới nhất.", HttpStatus.CONFLICT);
        if(supplement)registration.setRequestedFieldsJson(requestedFields==null?null:json.writeValueAsString(RegistrationEditPolicy.check(requestedFields)));
        var reviewer = users.findById(auth.getCurrentUser().getUserId()).orElseThrow();
        boolean approve = decision.equals("APPROVE");
        if (approve) {
            var data = submission(registration);
            if (data == null || !Boolean.TRUE.equals(data.termsAccepted()) || !documents.existsByRegistration_RegistrationIdAndDocumentTypeAndFileContentIsNotNull(id, "PHOTO_0") || !documents.existsByRegistration_RegistrationIdAndDocumentTypeAndFileContentIsNotNull(id, "OWNERSHIP") || !documents.existsByRegistration_RegistrationIdAndDocumentTypeAndFileContentIsNotNull(id, "ID_CARD")) throw new BadRequestException("Hồ sơ thiếu dữ liệu hoặc tài liệu bắt buộc, chưa thể phê duyệt.");
            if (properties.existsByRegistration_RegistrationId(id)) throw new AppException("Hồ sơ này đã được tạo thành nhà trọ.", HttpStatus.CONFLICT);
            if(registration.getTargetPropertyId()==null){
                properties.save(Property.builder().owner(owner).registration(registration).name(registration.getName()).address(registration.getAddress())
                        .contactInfo(registration.getContactInfo()).googleMapLink(registration.getGoogleMapLink()).description(data.description()).status("ACTIVE").build());
            }else{
                var property=properties.findById(registration.getTargetPropertyId()).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy nhà trọ cần cập nhật."));
                if(!property.getOwner().getUserId().equals(owner.getUserId())||property.getRegistration()==null||!Objects.equals(registration.getBaseRegistrationId(),property.getRegistration().getRegistrationId()))throw new AppException("Phiên bản công khai đã thay đổi. Không thể phê duyệt đề nghị cũ.",HttpStatus.CONFLICT);
                property.getRegistration().setTargetPropertyId(property.getPropertyId());
                property.setRegistration(registration);property.setName(registration.getName());property.setAddress(registration.getAddress());property.setContactInfo(registration.getContactInfo());property.setGoogleMapLink(registration.getGoogleMapLink());property.setDescription(data.description());
                properties.save(property);
            }
            for (var document : documents.findByRegistration_RegistrationId(id)) if (!Objects.toString(document.getDocumentType(), "").startsWith("PHOTO_")) document.setVerificationStatus("APPROVED");
        }
        registration.setStatus(supplement ? RegistrationStatus.NEEDS_SUPPLEMENT : approve ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED);
        registration.setReviewer(reviewer);
        registration.setReviewedAt(LocalDateTime.now());
        registration.setReasonNote(reason.isBlank() ? "Hồ sơ đã được phê duyệt." : reason);
        registrations.saveAndFlush(registration);
        logs.saveAndFlush(ModerationLog.builder().staff(reviewer).targetType("PROPERTY_REGISTRATION").targetId(id)
                .action(supplement ? "REQUESTED_SUPPLEMENT" : approve ? "APPROVED" : "REJECTED").note(registration.getReasonNote()).build());
        return detail(id);
    }
    @Transactional(readOnly = true)
    public Dashboard dashboard() {
        var verification = registrations.findAllByOrderByCreatedAtDesc();
        var reportRows = reports.findAllByOrderByCreatedAtAsc();
        var supportRows = support.findAllByOrderByCreatedAtAsc();
        var postRows = posts.findAllByOrderByCreatedAtAsc();
        var queue = new ArrayList<QueueItem>();
        var serviceRows = serviceApplications.findAllByOrderByRegistrationIdDesc();
        for (var row : serviceRows) if (row.getStatus() == RegistrationStatus.PENDING) {
            queue.add(new QueueItem("SERVICE-" + row.getRegistrationId(), "SERVICE", row.getServiceName(), row.getApplicantName(),
                    row.getDescription(), "PENDING", row.getCreatedAt(), "/staff/service-applications?id=" + row.getRegistrationId()));
        }
        for (var row : verification) if (row.getStatus() == RegistrationStatus.PENDING) {
            var details = submission(row);
            queue.add(new QueueItem("PROPERTY-" + row.getRegistrationId(), "PROPERTY", (row.getTargetPropertyId()!=null?"Đề nghị cập nhật: ":"")+row.getName(), row.getUser().getFullName(), details == null ? row.getAddress() : details.description(), "PENDING", row.getSubmittedAt()!=null?row.getSubmittedAt():row.getCreatedAt(), "/staff/verifications/detail?id=" + row.getRegistrationId()));
        }
        for (var row : reportRows) if (row.getStatus() == ReportStatus.PENDING) queue.add(new QueueItem("REPORT-" + row.getReportId(), "REPORT", "Báo cáo #" + row.getReportId(), row.getReporter().getFullName(), row.getReason(), row.getStatus().name(), row.getCreatedAt(), null));
        for (var row : supportRows) if (row.getStatus() != SupportStatus.COMPLETED) queue.add(new QueueItem("SUPPORT-" + row.getRequestId(), "SUPPORT", row.getRequestType(), row.getRequester().getFullName(), row.getDescription(), row.getStatus().name(), row.getCreatedAt(), null));
        for (var row : postRows) if (row.getStatus() == PostStatus.PENDING) queue.add(new QueueItem("COMMUNITY-" + row.getPostId(), "COMMUNITY", row.getTitle(), row.getAuthor().getFullName(), row.getDescription(), row.getStatus().name(), row.getCreatedAt(), "/staff/community/detail?id=" + row.getPostId()));
        queue.sort(Comparator.comparing(QueueItem::createdAt, Comparator.nullsLast(Comparator.naturalOrder())));
        var activityRows = logs.findAllByOrderByCreatedAtDesc();
        long processed = activityRows.stream().filter(row -> Set.of("APPROVED", "REJECTED", "RESOLVED", "DISMISSED", "COMPLETED").contains(row.getAction())).map(row -> row.getTargetType() + ":" + row.getTargetId()).distinct().count();
        return new Dashboard(verification.stream().filter(row -> row.getStatus() == RegistrationStatus.PENDING).count(), reportRows.stream().filter(row -> row.getStatus() == ReportStatus.PENDING).count(), null,
                supportRows.stream().filter(row -> row.getStatus() != SupportStatus.COMPLETED).count(), postRows.stream().filter(row -> row.getStatus() == PostStatus.PENDING).count(),
                properties.findAll().stream().filter(row -> "ACTIVE".equalsIgnoreCase(row.getStatus())).count(), processed, null, null, queue, activityRows.stream().limit(20).map(this::activity).toList());
    }
}
