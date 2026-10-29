package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ServiceRegistrationRequest;
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
    private final UserCapabilityRepository capabilities;
    private final ServiceCategoryRepository categories;
    private final ServiceRegistrationRepository registrations;
    private final ServiceDocumentRepository documents;
    private final ServiceRepository listings;
    private final ServicePublicationService publication;

    public record DocumentInfo(Integer documentId, String name, String contentType) {}
    public record RegistrationInfo(Integer registrationId, Integer applicantId, String applicantName,
            Integer categoryId, String categoryName, String serviceName, String description,
            String pricingType, BigDecimal price, String serviceArea, String contactPhone, String contactEmail,
            RegistrationStatus status, String reasonNote, LocalDateTime createdAt, List<DocumentInfo> documents,
            Integer assignedStaffId, String assignedStaffName, LocalDateTime assignedAt,
            String capabilityDecision, String listingDecision, LocalDateTime reviewedAt, String reviewerName,
            Integer providerId, Integer serviceId, boolean capabilityActive, String serviceState, boolean publicEligible) {}
    public record State(boolean canRegister, String reason, RegistrationInfo registration) {}

    @Transactional(readOnly = true)
    public State current() {
        var userId = auth.getCurrentUser().getUserId();
        var rows = registrations.findByUser_UserIdOrderByRegistrationIdDesc(userId);
        String reason = restriction(userId);
        return new State(reason.equals("ELIGIBLE"), reason, rows.isEmpty() ? null : info(rows.get(0)));
    }

    private String restriction(Integer userId) {
        if (capabilities.findByUser_UserIdAndStatus(userId, "ACTIVE").stream()
                .anyMatch(value -> "MANAGE_SERVICE".equals(value.getCapability().getCode()))) return "HAS_CAPABILITY";
        if (registrations.existsByUser_UserIdAndStatusIn(userId, List.of(RegistrationStatus.APPROVED))) return "APPROVED";
        if (registrations.existsByUser_UserIdAndStatusIn(userId, List.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT))) return "IN_REVIEW";
        return "ELIGIBLE";
    }

    @Transactional(rollbackFor = Exception.class, isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public RegistrationInfo submit(ServiceRegistrationRequest value, List<MultipartFile> files) throws IOException {
        if (value.applicantName().trim().length() < 2 || value.serviceName().trim().length() < 3
                || value.description().trim().length() < 20 || value.serviceArea().trim().length() < 2)
            throw new BadRequestException("Vui lòng nhập đầy đủ tên người đăng ký, tên dịch vụ, mô tả (ít nhất 20 ký tự) và khu vực phục vụ.");
        String phone = value.contactPhone().replaceAll("[\\s.-]", "");
        if (!phone.matches("(?:0|\\+84)[35789]\\d{8}")) throw new BadRequestException("Số điện thoại Việt Nam không hợp lệ.");
        if ("NEGOTIABLE".equals(value.pricingType()) ? value.price() != null : value.price() == null || value.price().signum() <= 0)
            throw new BadRequestException("Giá cố định / giá từ phải lớn hơn 0; giá thỏa thuận không nhập số tiền.");
        if (files == null || files.isEmpty() || files.size() > 5) throw new BadRequestException("Cần đính kèm từ 1 đến 5 tài liệu xác minh.");
        var category = categories.findById(value.categoryId()).orElseThrow(() -> new BadRequestException("Danh mục dịch vụ không hợp lệ."));
        // Serialize submissions for this applicant, including concurrent requests.
        var user = users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow(() -> new BadRequestException("Không tìm thấy người đăng ký."));
        if (!restriction(user.getUserId()).equals("ELIGIBLE")) throw new AppException("Bạn đã có quyền cung cấp dịch vụ hoặc hồ sơ đang được xử lý / đã được duyệt.", HttpStatus.CONFLICT);
        var row = registrations.save(ServiceRegistration.builder().user(user).category(category)
                .applicantName(value.applicantName().trim()).serviceName(value.serviceName().trim())
                .description(value.description().trim()).pricingType(value.pricingType()).price(value.price())
                .serviceArea(value.serviceArea().trim()).contactInfo(phone)
                .contactEmail(value.contactEmail() == null ? null : value.contactEmail().trim())
                .status(RegistrationStatus.PENDING).build());
        for (var file : files) saveFile(row, file);
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
        var listing = listings.findByRegistration_RegistrationId(row.getRegistrationId()).orElse(null);
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
                listing == null ? null : listing.getStatus(), listing != null && publication.isPublic(listing));
    }

    @Transactional(readOnly = true)
    public ServiceDocument document(Integer id) {
        return documents.findByDocumentIdAndRegistration_User_UserId(id, auth.getCurrentUser().getUserId())
                .orElseThrow(() -> new AppException("Không tìm thấy tài liệu.", HttpStatus.NOT_FOUND));
    }
}
