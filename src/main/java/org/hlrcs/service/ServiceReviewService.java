package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ServiceReviewService {
    private final AuthService auth;
    private final UserRepository users;
    private final ServiceRegistrationRepository registrations;
    private final ServiceDocumentRepository documents;
    private final ServiceRepository listings;
    private final UserCapabilityRepository capabilities;
    private final CapabilityRepository capabilityTypes;
    private final ModerationLogRepository logs;
    private final ServiceRegistrationService submissions;

    public record Audit(Integer id, String actor, String action, String reason, LocalDateTime time) {}
    public record Snapshot(String serviceName, String description, String pricingType, java.math.BigDecimal price,
                           String serviceArea, int revision, String customServiceAreas, String priceUnit) {}
    public record Detail(ServiceRegistrationService.RegistrationInfo application, List<Audit> history, Snapshot currentListing) {}

    @Transactional(readOnly = true)
    public List<ServiceRegistrationService.RegistrationInfo> list() {
        requireReviewer();
        return registrations.findAllByOrderByRegistrationIdDesc().stream().map(submissions::info).toList();
    }
    private ServiceRegistration accessible(Integer id) {
        var row = registrations.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ dịch vụ."));
        requireReviewer();
        return row;
    }
    private void requireReviewer() {
        var actor = auth.getCurrentUser();
        if (!Set.of(UserRole.STAFF, UserRole.ADMIN).contains(actor.getRole()) || actor.getStatus() != UserStatus.ACTIVE)
            throw new AppException("Chỉ Staff hoặc Admin đang hoạt động được xét duyệt hồ sơ dịch vụ.", HttpStatus.FORBIDDEN);
    }
    @Transactional(readOnly = true)
    public Detail detail(Integer id) {
        var application = accessible(id);
        var target = application.getTargetService();
        return new Detail(submissions.info(application), logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION", id)
                .stream().map(l -> new Audit(l.getLogId(), l.getStaff().getFullName(), l.getAction(), l.getNote(), l.getCreatedAt())).toList(),
                target == null ? null : new Snapshot(target.getServiceName(), target.getDescription(), target.getPricingType(), target.getPrice(), target.getServiceArea(), target.getRevision(), target.getCustomServiceAreas(), target.getPriceUnit()));
    }
    @Transactional(readOnly = true)
    public StaffService.FileContent file(Integer id, Integer fileId) {
        accessible(id);
        var file = documents.findById(fileId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu."));
        if (!file.getRegistration().getRegistrationId().equals(id) || file.getFileContent() == null
                || !Set.of("application/pdf", "image/jpeg", "image/png", "image/webp").contains(Objects.toString(file.getContentType(), "")))
            throw new ResourceNotFoundException("Không tìm thấy tài liệu.");
        return new StaffService.FileContent(file.getFileContent(), file.getContentType());
    }
    private void pending(ServiceRegistration row) {
        if (row.getStatus() != RegistrationStatus.PENDING) throw new AppException("Hồ sơ đã được xử lý. Vui lòng tải lại.", HttpStatus.CONFLICT);
    }
    private void audit(ServiceRegistration row, String action, String reason) {
        logs.saveAndFlush(ModerationLog.builder().staff(auth.getCurrentUser()).targetType("SERVICE_REGISTRATION")
                .targetId(row.getRegistrationId()).action(action).note(reason).build());
    }
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail review(Integer id, String capabilityDecision, String listingDecision, String reason, int revision) {
        if (!Set.of("APPROVE", "REJECT").contains(Objects.toString(capabilityDecision, "")) || !Set.of("APPROVE", "REJECT").contains(Objects.toString(listingDecision, "")))
            throw new BadRequestException("Cần quyết định duyệt hoặc từ chối cho capability và nội dung dịch vụ.");
        String note = reason == null ? "" : reason.trim();
        boolean approved = "APPROVE".equals(capabilityDecision) && "APPROVE".equals(listingDecision);
        if (approved && note.isEmpty()) note = "Đã kiểm tra và duyệt thành công.";
        if ((!approved && note.length() < 10) || note.length() > 2000) throw new BadRequestException("Lý do từ chối phải có từ 10 đến 2000 ký tự.");
        if (capabilityDecision.equals("REJECT") && listingDecision.equals("APPROVE")) throw new BadRequestException("Không thể công khai dịch vụ khi từ chối capability.");
        var row = registrations.findForReview(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ."));
        requireReviewer();
        var actor = auth.getCurrentUser();
        if (actor.getUserId().equals(row.getUser().getUserId()))
            throw new AppException("Không được tự xét duyệt hồ sơ của mình.", HttpStatus.FORBIDDEN);
        pending(row);
        if (row.getRevision() != revision) throw new AppException("Hồ sơ đã có phiên bản mới. Vui lòng tải lại trước khi duyệt.", HttpStatus.CONFLICT);
        var owner = users.findForRegistrationUpdate(row.getUser().getUserId()).orElseThrow();
        if (owner.getStatus() != UserStatus.ACTIVE) throw new AppException("Tài khoản người đăng ký không còn hoạt động.", HttpStatus.CONFLICT);
        var target = row.getTargetService();
        if (target != null && "APPROVE".equals(listingDecision) && (!submissions.canManage(owner.getUserId()) || "DELETED".equals(target.getStatus()) || !Objects.equals(row.getServiceRevision(), target.getRevision())))
            throw new AppException("Dịch vụ gốc đã thay đổi hoặc quyền quản lý đã ngừng. Không thể áp dụng yêu cầu cũ.", HttpStatus.CONFLICT);
        var files = documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id);
        boolean approveCapability = capabilityDecision.equals("APPROVE");
        if (approveCapability && target == null) {
            if (!"DELETE".equals(row.getOperation()) && (files.isEmpty() || files.stream().anyMatch(f -> f.getFileContent() == null || f.getFileContent().length == 0)))
                throw new BadRequestException("Hồ sơ thiếu tài liệu xác minh, chưa thể cấp capability.");
            var type = capabilityTypes.findByCode("MANAGE_SERVICE").orElseThrow(() -> new BadRequestException("Chưa cấu hình capability MANAGE_SERVICE."));
            var existing = capabilities.findByUser_UserId(owner.getUserId()).stream().filter(c -> c.getCapability().getCode().equals("MANAGE_SERVICE")).findFirst();
            var capability = existing.orElseGet(() -> UserCapability.builder().user(owner).capability(type).build());
            if (!"ACTIVE".equals(capability.getStatus())) { capability.setStatus("ACTIVE"); capability.setGrantedAt(LocalDateTime.now()); capabilities.save(capability); }
        }
        if (listingDecision.equals("APPROVE")) {
            if (!"DELETE".equals(row.getOperation()) && listings.findByProvider_UserIdOrderByServiceIdDesc(owner.getUserId()).stream()
                    .anyMatch(s -> (target == null || !s.getServiceId().equals(target.getServiceId())) && !"DELETED".equals(s.getStatus())
                            && s.getServiceName().equalsIgnoreCase(row.getServiceName().trim())))
                throw new AppException("Tên dịch vụ trùng với dịch vụ khác của nhà cung cấp.", HttpStatus.CONFLICT);
            if (row.getServiceName() == null || row.getServiceName().isBlank() || row.getDescription() == null || row.getDescription().isBlank()
                    || (row.getServiceArea() == null || row.getServiceArea().isBlank()) && (row.getCustomServiceAreas() == null || row.getCustomServiceAreas().isBlank()) || row.getContactInfo() == null || row.getContactInfo().isBlank()
                    || !Set.of("FIXED", "FROM", "NEGOTIABLE").contains(Objects.toString(row.getPricingType(), ""))
                    || (!"NEGOTIABLE".equals(row.getPricingType()) && (row.getPrice() == null || row.getPrice().signum() <= 0)))
                throw new BadRequestException("Thông tin dịch vụ chưa đầy đủ để công khai.");
            if (listings.existsByRegistration_RegistrationId(id)) throw new AppException("Hồ sơ đã có dịch vụ.", HttpStatus.CONFLICT);
            var listing = target == null ? org.hlrcs.entity.Service.builder().provider(owner).build() : target;
            if (target != null && target.getRegistration() != null) target.getRegistration().setTargetService(target);
            if ("DELETE".equals(row.getOperation())) listing.setStatus("DELETED");
            else {
                listing.setCategory(row.getCategory()); listing.setServiceName(row.getServiceName()); listing.setDescription(row.getDescription());
                listing.setContactInfo(row.getContactInfo()); listing.setContactEmail(row.getContactEmail()); listing.setPricingType(row.getPricingType());
                listing.setPrice(row.getPrice()); listing.setPriceUnit(row.getPriceUnit()); listing.setServiceArea(row.getServiceArea()); listing.setCustomServiceAreas(row.getCustomServiceAreas()); listing.setStatus("ACTIVE");
            }
            listing.setRegistration(row); listing.setRevision(listing.getRevision() + 1);
            listings.saveAndFlush(listing); row.setTargetService(listing);
        }
        row.setCapabilityDecision(capabilityDecision); row.setListingDecision(listingDecision);
        row.setStatus(approveCapability ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED);
        row.setReviewer(actor); row.setReviewedAt(LocalDateTime.now()); row.setReasonNote(note);
        row.setRevision(row.getRevision() + 1);
        files.forEach(f -> f.setVerificationStatus(approveCapability ? "APPROVED" : "REJECTED"));
        registrations.saveAndFlush(row);
        audit(row, approveCapability ? "APPROVED" : "REJECTED", "Capability: " + capabilityDecision + "; Listing: " + listingDecision + ". " + note);
        return detail(id);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail requestSupplement(Integer id, String reason, int revision) {
        requireReviewer();
        var row = registrations.findForReview(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ."));
        if (row.getUser().getUserId().equals(auth.getCurrentUser().getUserId())) throw new AppException("Không được tự xét duyệt hồ sơ của mình.", HttpStatus.FORBIDDEN);
        pending(row);
        if (row.getRevision() != revision) throw new AppException("Hồ sơ đã có phiên bản mới. Vui lòng tải lại.", HttpStatus.CONFLICT);
        String note = reason.trim();
        if (note.length() < 10 || note.length() > 2000) throw new BadRequestException("Yêu cầu bổ sung cần từ 10 đến 2000 ký tự.");
        row.setStatus(RegistrationStatus.NEEDS_SUPPLEMENT); row.setRequestedChanges(note);
        row.setSupplementRequestedAt(LocalDateTime.now()); row.setReviewer(auth.getCurrentUser());
        row.setReviewedAt(LocalDateTime.now()); row.setReasonNote(note); row.setRevision(row.getRevision() + 1);
        registrations.saveAndFlush(row);
        audit(row, "REQUESTED_SUPPLEMENT", "Revision " + row.getRevision() + ": " + note);
        return detail(id);
    }
}
