package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ServiceRegistrationRequest;
import org.hlrcs.dto.request.ServiceResubmissionRequest;
import org.hlrcs.entity.ServiceDocument;
import org.hlrcs.entity.ServiceRegistration;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ServiceRegistrationService {
    private final AuthService auth;
    private final UserRepository users;
    private final ServiceCategoryRepository categories;
    private final ServiceRegistrationRepository registrations;
    private final ServiceDocumentRepository documents;
    private final ServiceRepository listings;
    private final ServicePublicationService publication;
    private final ModerationLogRepository logs;
    private final tools.jackson.databind.ObjectMapper json;

    public record DocumentInfo(Integer documentId, String name, String contentType) {}
    public record RegistrationInfo(Integer registrationId, Integer applicantId, String applicantName,
            Integer categoryId, String categoryName, String serviceName, String description,
            String pricingType, BigDecimal price, String serviceArea, String contactPhone, String contactEmail,
            RegistrationStatus status, String reasonNote, LocalDateTime createdAt, List<DocumentInfo> documents,
            Integer assignedStaffId, String assignedStaffName, LocalDateTime assignedAt,
            String capabilityDecision, String listingDecision, LocalDateTime reviewedAt, String reviewerName,
            Integer providerId, Integer serviceId, boolean capabilityActive, String serviceState, boolean publicEligible,
            int revision, String requestedChanges, LocalDateTime supplementRequestedAt,
            LocalDateTime resubmittedAt, String resubmissionNote, String operation, Integer targetServiceId, Integer serviceRevision, boolean hasImage, int imageCount, String customServiceAreas, String priceUnit) {}
    public record State(boolean canRegister, String reason, RegistrationInfo registration) {}

    @Transactional(readOnly = true)
    public State current() {
        var userId = auth.getCurrentUser().getUserId();
        var rows = registrations.findByUser_UserIdOrderByRegistrationIdDesc(userId);
        String reason = restriction(userId);
        return new State(reason.equals("ELIGIBLE"), reason, rows.isEmpty() ? null : info(rows.get(0)));
    }

    @Transactional(readOnly = true)
    public List<RegistrationInfo> mine() {
        return registrations.findByUser_UserIdOrderByRegistrationIdDesc(auth.getCurrentUser().getUserId()).stream().map(this::info).toList();
    }

    @Transactional(readOnly = true)
    public List<RegistrationInfo> myServices() {
        return listings.findByProvider_UserIdOrderByServiceIdDesc(auth.getCurrentUser().getUserId()).stream()
                .filter(listing -> !"DELETED".equals(listing.getStatus()) && listing.getRegistration() != null)
                .map(listing -> info(listing.getRegistration())).toList();
    }

    public boolean canManage(Integer userId) { return publication.hasCapability(userId); }

    @Transactional(rollbackFor = Exception.class, isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public RegistrationInfo change(Integer serviceId, org.hlrcs.dto.request.ServiceChangeRequest request, List<MultipartFile> images) throws IOException {
        var owner = users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var listing = listings.findById(serviceId).filter(s -> s.getProvider().getUserId().equals(owner.getUserId()))
                .orElseThrow(() -> new AppException("Không tìm thấy dịch vụ của bạn.", HttpStatus.NOT_FOUND));
        if (!publication.hasCapability(owner.getUserId()) || "DELETED".equals(listing.getStatus()) || listing.getRevision() != request.serviceRevision())
            throw new AppException("Dịch vụ đã thay đổi hoặc tài khoản không còn quyền quản lý. Vui lòng tải lại.", HttpStatus.CONFLICT);
        if (registrations.existsByTargetService_ServiceIdAndStatusIn(serviceId, List.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT)))
            throw new AppException("Dịch vụ đang có yêu cầu chờ xử lý. Hãy xem hồ sơ hiện tại.", HttpStatus.CONFLICT);
        if (request.note().trim().length() < 10) throw new BadRequestException("Lý do thay đổi cần ít nhất 10 ký tự.");
        var previous = listing.getRegistration();
        if (previous == null) throw new AppException("Dịch vụ thiếu hồ sơ gốc.", HttpStatus.CONFLICT);
        var row = ServiceRegistration.builder().user(owner).category(listing.getCategory()).targetService(listing)
                .operation(request.operation()).serviceRevision(listing.getRevision()).status(RegistrationStatus.PENDING)
                .applicantName(previous.getApplicantName()).serviceName(listing.getServiceName()).description(listing.getDescription())
                .contactInfo(listing.getContactInfo()).contactEmail(listing.getContactEmail()).pricingType(listing.getPricingType())
                .priceUnit(listing.getPriceUnit()).price(listing.getPrice()).serviceArea(listing.getServiceArea()).customServiceAreas(listing.getCustomServiceAreas()).resubmissionNote(request.note().trim())
                .imageContent(previous.getImageContent()).imageContentType(previous.getImageContentType()).build();
        if ("UPDATE".equals(request.operation())) {
            if (request.details() == null) throw new BadRequestException("Thiếu thông tin cập nhật.");
            var value = request.details(); validate(value);
            var areas = ServiceAreaPolicy.normalize(value.serviceArea(), value.customServiceAreas(), Boolean.TRUE.equals(value.otherAreasEnabled()));
            if (listings.findByProvider_UserIdOrderByServiceIdDesc(owner.getUserId()).stream().anyMatch(s -> !s.getServiceId().equals(serviceId)
                    && !"DELETED".equals(s.getStatus()) && s.getServiceName().equalsIgnoreCase(value.serviceName().trim())))
                throw new AppException("Bạn đã có dịch vụ khác trùng tên.", HttpStatus.CONFLICT);
            row.setCategory(categories.findById(value.categoryId()).orElseThrow(() -> new BadRequestException("Danh mục không hợp lệ.")));
            row.setApplicantName(value.applicantName().trim()); row.setServiceName(value.serviceName().trim()); row.setDescription(value.description().trim());
            row.setContactInfo(value.contactPhone().replaceAll("[\\s.-]", "")); row.setContactEmail(value.contactEmail());
            row.setPricingType(value.pricingType()); row.setPrice(value.price()); row.setPriceUnit(normalizePriceUnit(value.priceUnit())); row.setServiceArea(areas.standard()); row.setCustomServiceAreas(areas.custom());
        }
        row.getAdditionalImages().addAll(previous.getAdditionalImages().stream().map(i -> new org.hlrcs.entity.ServiceImage(i.getContent(), i.getContentType())).toList());
        if ("UPDATE".equals(request.operation())) saveImages(row, images);
        registrations.save(row);
        for (var file : documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(previous.getRegistrationId()))
            documents.save(ServiceDocument.builder().registration(row).documentName(file.getDocumentName()).contentType(file.getContentType())
                    .fileContent(file.getFileContent()).verificationStatus("PENDING").build());
        logs.save(org.hlrcs.entity.ModerationLog.builder().staff(owner).targetType("SERVICE_REGISTRATION").targetId(row.getRegistrationId())
                .action("CHANGE_REQUESTED").note(request.operation() + ": " + request.note().trim()).build());
        return info(row);
    }

    private void saveImages(ServiceRegistration row, List<MultipartFile> images) throws IOException {
        if (images == null || images.isEmpty()) return;
        if (images.size() > 5) throw new BadRequestException("Chọn tối đa 5 ảnh dịch vụ.");
        var validated = new ArrayList<org.hlrcs.entity.ServiceImage>();
        for (var image : images) validated.add(validateImage(image));
        row.setImageContent(validated.get(0).getContent()); row.setImageContentType(validated.get(0).getContentType());
        row.getAdditionalImages().clear(); row.getAdditionalImages().addAll(validated.subList(1, validated.size()));
    }

    private org.hlrcs.entity.ServiceImage validateImage(MultipartFile image) throws IOException {
        if (image.isEmpty() || image.getSize() > 5L * 1024 * 1024) throw new BadRequestException("Ảnh phải có nội dung, tối đa 5 MB.");
        byte[] bytes = image.getBytes(); String mime = Objects.toString(image.getContentType(), "");
        boolean valid = switch (mime) {
            case "image/jpeg" -> bytes.length > 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
            case "image/png" -> bytes.length > 8 && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[]{(byte)137,80,78,71,13,10,26,10});
            case "image/webp" -> bytes.length > 12 && new String(bytes,0,4,StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes,8,4,StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
        if (!valid) throw new BadRequestException("Ảnh chỉ nhận JPG, PNG, WEBP đúng định dạng.");
        return new org.hlrcs.entity.ServiceImage(bytes, mime);
    }

    @Transactional(readOnly = true)
    public StaffService.FileContent image(Integer id, int index) {
        var row = registrations.findById(id).orElseThrow(() -> new AppException("Không tìm thấy ảnh.", HttpStatus.NOT_FOUND));
        var actor = auth.getCurrentUser();
        if ((!row.getUser().getUserId().equals(actor.getUserId()) && !Set.of(org.hlrcs.entity.enums.UserRole.STAFF, org.hlrcs.entity.enums.UserRole.ADMIN).contains(actor.getRole())) || row.getImageContent() == null)
            throw new AppException("Không tìm thấy ảnh.", HttpStatus.NOT_FOUND);
        var source = row.imageAt(index);
        return new StaffService.FileContent(source.getContent(), source.getContentType());
    }

    private String restriction(Integer userId) {
        if (publication.hasCapability(userId)) return "ELIGIBLE";
        if (registrations.existsByUser_UserIdAndStatusIn(userId, List.of(RegistrationStatus.APPROVED))) return "APPROVED";
        if (registrations.existsByUser_UserIdAndStatusIn(userId, List.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT))) return "IN_REVIEW";
        return "ELIGIBLE";
    }

    private String normalizePriceUnit(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        String unit = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFC).trim().replaceAll("\\s+", " ").toLowerCase(java.util.Locale.forLanguageTag("vi-VN"));
        if (unit.length() < 2 || unit.length() > 20) throw new BadRequestException("Đơn vị tính phải có từ 2 đến 20 ký tự.");
        return Set.of("lần", "giờ", "kg", "chuyến", "m²").contains(unit) ? unit : unit.substring(0, 1).toUpperCase(java.util.Locale.forLanguageTag("vi-VN")) + unit.substring(1);
    }

    private void validate(ServiceRegistrationRequest value) {
        normalizePriceUnit(value.priceUnit());
        ServiceAreaPolicy.normalize(value.serviceArea(), value.customServiceAreas(), Boolean.TRUE.equals(value.otherAreasEnabled()));
        if (value.applicantName().trim().length() < 2 || value.serviceName().trim().length() < 3
                || value.description().trim().length() < 20)
            throw new BadRequestException("Vui lòng nhập đầy đủ tên người đăng ký, tên dịch vụ, mô tả (ít nhất 20 ký tự) và khu vực phục vụ.");
        String phone = value.contactPhone().replaceAll("[\\s.-]", "");
        if (!phone.matches("(?:0|\\+84)[35789]\\d{8}")) throw new BadRequestException("Số điện thoại Việt Nam không hợp lệ.");
        if ("NEGOTIABLE".equals(value.pricingType()) ? value.price() != null : value.price() == null || value.price().signum() <= 0)
            throw new BadRequestException("Giá cố định / giá từ phải lớn hơn 0; giá thỏa thuận không nhập số tiền.");
    }

    @Transactional(rollbackFor = Exception.class, isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public RegistrationInfo submit(ServiceRegistrationRequest value, List<MultipartFile> files, List<MultipartFile> images) throws IOException {
        validate(value);
        var areas = ServiceAreaPolicy.normalize(value.serviceArea(), value.customServiceAreas(), Boolean.TRUE.equals(value.otherAreasEnabled()));
        if (files == null || files.isEmpty() || files.size() > 5) throw new BadRequestException("Cần đính kèm từ 1 đến 5 tài liệu xác minh.");
        var category = categories.findById(value.categoryId()).orElseThrow(() -> new BadRequestException("Danh mục dịch vụ không hợp lệ."));
        // Serialize submissions for this applicant, including concurrent requests.
        var user = users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow(() -> new BadRequestException("Không tìm thấy người đăng ký."));
        if (!restriction(user.getUserId()).equals("ELIGIBLE")) throw new AppException("Bạn đã có quyền cung cấp dịch vụ hoặc hồ sơ đang được xử lý / đã được duyệt.", HttpStatus.CONFLICT);
        if (listings.existsByProvider_UserIdAndServiceNameIgnoreCaseAndStatusNot(user.getUserId(), value.serviceName().trim(), "DELETED"))
            throw new AppException("Tên dịch vụ đã có trong danh sách của bạn.", HttpStatus.CONFLICT);
        if (registrations.existsByUser_UserIdAndServiceNameIgnoreCaseAndStatusIn(user.getUserId(), value.serviceName().trim(), List.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT)))
            throw new AppException("Bạn đã có yêu cầu đang xử lý cho tên dịch vụ này.", HttpStatus.CONFLICT);
        var row = registrations.save(ServiceRegistration.builder().user(user).category(category)
                .applicantName(value.applicantName().trim()).serviceName(value.serviceName().trim())
                .description(value.description().trim()).pricingType(value.pricingType()).priceUnit(normalizePriceUnit(value.priceUnit())).price(value.price())
                .serviceArea(areas.standard()).customServiceAreas(areas.custom()).contactInfo(value.contactPhone().replaceAll("[\\s.-]", ""))
                .contactEmail(value.contactEmail() == null ? null : value.contactEmail().trim())
                .status(RegistrationStatus.PENDING).build());
        for (var file : files) saveFile(row, file);
        saveImages(row, images);
        return info(row);
    }

    @Transactional(rollbackFor = Exception.class, isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public RegistrationInfo resubmit(Integer id, ServiceResubmissionRequest request, List<MultipartFile> uploads, List<MultipartFile> images) throws IOException {
        var row = registrations.findForReview(id).filter(r -> r.getUser().getUserId().equals(auth.getCurrentUser().getUserId()))
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ của bạn.", HttpStatus.NOT_FOUND));
        if (row.getStatus() != RegistrationStatus.NEEDS_SUPPLEMENT || row.getRevision() != request.revision())
            throw new AppException("Hồ sơ đã thay đổi hoặc không còn chờ bổ sung. Vui lòng cập nhật kết quả.", HttpStatus.CONFLICT);
        users.findForRegistrationUpdate(row.getUser().getUserId()).orElseThrow();
        if ((row.getTargetService() == null && listings.existsByRegistration_RegistrationId(id)) || (row.getTargetService() != null && (!publication.hasCapability(row.getUser().getUserId()) || "DELETED".equals(row.getTargetService().getStatus()))))
            throw new AppException("Hồ sơ đã có quyền hoặc dịch vụ, không thể nộp bổ sung.", HttpStatus.CONFLICT);
        validate(request.details());
        saveImages(row, images);
        String note = request.note().trim();
        if (note.length() < 10) throw new BadRequestException("Nội dung bổ sung cần ít nhất 10 ký tự.");
        var oldFiles = documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id);
        var keep = request.retainedDocumentIds();
        if (new HashSet<>(keep).size() != keep.size() || keep.stream().anyMatch(key -> oldFiles.stream().noneMatch(f -> key.equals(f.getDocumentId()))))
            throw new BadRequestException("Tài liệu giữ lại không hợp lệ hoặc không thuộc hồ sơ.");
        var files = uploads == null ? List.<MultipartFile>of() : uploads;
        if (keep.size() + files.size() < 1 || keep.size() + files.size() > 5) throw new BadRequestException("Hồ sơ cần tổng cộng từ 1 đến 5 tài liệu.");
        var value = request.details();
        var areas = ServiceAreaPolicy.normalize(value.serviceArea(), value.customServiceAreas(), Boolean.TRUE.equals(value.otherAreasEnabled()));
        row.setCategory(categories.findById(value.categoryId()).orElseThrow(() -> new BadRequestException("Danh mục không hợp lệ.")));
        row.setApplicantName(value.applicantName().trim()); row.setServiceName(value.serviceName().trim());
        row.setDescription(value.description().trim()); row.setPricingType(value.pricingType()); row.setPrice(value.price()); row.setPriceUnit(normalizePriceUnit(value.priceUnit()));
        row.setServiceArea(areas.standard()); row.setCustomServiceAreas(areas.custom()); row.setContactInfo(value.contactPhone().replaceAll("[\\s.-]", ""));
        row.setContactEmail(value.contactEmail() == null ? null : value.contactEmail().trim());
        for (var file : files) saveFile(row, file);
        for (var file : oldFiles) {
            if (!keep.contains(file.getDocumentId())) documents.delete(file);
            else file.setVerificationStatus("PENDING");
        }
        row.setStatus(RegistrationStatus.PENDING); row.setRevision(row.getRevision() + 1);
        row.setResubmittedAt(LocalDateTime.now()); row.setResubmissionNote(note);
        row.setCapabilityDecision(null); row.setListingDecision(null); row.setReasonNote(null);
        row.setReviewer(null); row.setReviewedAt(null);
        registrations.saveAndFlush(row);
        logs.saveAndFlush(org.hlrcs.entity.ModerationLog.builder().staff(auth.getCurrentUser()).targetType("SERVICE_REGISTRATION")
                .targetId(id).action("RESUBMITTED").note("Revision " + row.getRevision() + ": " + json.writeValueAsString(request)).build());
        return info(row);
    }

    private void saveFile(ServiceRegistration row, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() > 10L * 1024 * 1024) throw new BadRequestException("Mỗi tài liệu phải có nội dung và tối đa 10 MB.");
        byte[] bytes = file.getBytes();
        String mime = file.getContentType();
        boolean valid = switch (mime == null ? "" : mime) {
            case "application/pdf" -> bytes.length > 5 && new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-");
            case "image/jpeg" -> bytes.length > 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
            case "image/png" -> bytes.length > 8 && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[]{(byte)137, 80, 78, 71, 13, 10, 26, 10});
            case "image/webp" -> bytes.length > 12 && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
        if (!valid) throw new BadRequestException("Tài liệu chỉ chấp nhận PDF, JPG, PNG, WEBP có nội dung đúng định dạng.");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("document").replaceAll("[\\p{Cntrl}\\\\/]", "_");
        documents.save(ServiceDocument.builder().registration(row).documentName(name.substring(0, Math.min(200, name.length())))
                .verificationStatus("PENDING").contentType(mime).fileContent(bytes).build());
    }

    public RegistrationInfo info(ServiceRegistration row) {
        var listing = row.getTargetService() != null ? row.getTargetService() : listings.findByRegistration_RegistrationId(row.getRegistrationId()).orElse(null);
        return new RegistrationInfo(row.getRegistrationId(), row.getUser().getUserId(), row.getApplicantName(),
                row.getCategory().getCategoryId(), row.getCategory().getName(), row.getServiceName(), row.getDescription(),
                row.getPricingType(), row.getPrice(), row.getServiceArea(), row.getContactInfo(), row.getContactEmail(),
                row.getStatus(), row.getReasonNote(), row.getCreatedAt(),
                documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(row.getRegistrationId()).stream()
                        .map(d -> new DocumentInfo(d.getDocumentId(), d.getDocumentName(), d.getContentType())).toList(),
                row.getAssignedStaff() == null ? null : row.getAssignedStaff().getUserId(),
                row.getAssignedStaff() == null ? null : row.getAssignedStaff().getFullName(), row.getAssignedAt(),
                row.getCapabilityDecision(), row.getListingDecision(), row.getReviewedAt(),
                row.getReviewer() == null ? null : row.getReviewer().getFullName(), row.getUser().getUserId(),
                listing == null ? null : listing.getServiceId(), publication.hasCapability(row.getUser().getUserId()),
                listing == null ? null : listing.getStatus(), listing != null && publication.isPublic(listing),
                row.getRevision(), row.getRequestedChanges(), row.getSupplementRequestedAt(), row.getResubmittedAt(), row.getResubmissionNote(), row.getOperation() == null ? "CREATE" : row.getOperation(),
                row.getTargetService() == null ? null : row.getTargetService().getServiceId(), listing == null ? null : listing.getRevision(), row.getImageContent() != null, row.imageCount(), row.getCustomServiceAreas(), row.getPriceUnit());
    }

    @Transactional(readOnly = true)
    public ServiceDocument document(Integer id) {
        return documents.findByDocumentIdAndRegistration_User_UserId(id, auth.getCurrentUser().getUserId())
                .orElseThrow(() -> new AppException("Không tìm thấy tài liệu.", HttpStatus.NOT_FOUND));
    }
}
