package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityReportDecision;
import org.hlrcs.dto.request.CommunityReportRequest;
import org.hlrcs.dto.response.CommunityPostResponse;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.FieldValidationException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CommunityReportService {
    private static final ReportTargetType TARGET = ReportTargetType.POST;
    private static final Set<ReportStatus> OPEN = Set.of(ReportStatus.OPEN, ReportStatus.PENDING);
    private final ReportRepository reports;
    private final CommunityReportEvidenceRepository evidence;
    private final PostRepository posts;
    private final ModerationLogRepository logs;
    private final CommunityService community;
    private final AuthService auth;

    public record Receipt(Integer id, String postTitle, LocalDateTime createdAt) {}
    public record Summary(Integer id, Integer postId, String postTitle, String reasonCode, ReportStatus status,
                          String reporter, LocalDateTime createdAt) {}
    public record Detail(Summary report, String details, CommunityPostResponse post, boolean hasEvidence,
                         String handler, String resolutionNote, LocalDateTime resolvedAt) {}
    public record Page<T>(List<T> content, int number, int totalPages, long totalElements) {}

    @Transactional
    public Receipt submit(Integer postId, CommunityReportRequest request, List<MultipartFile> attachments) {
        var reporter = activeUser();
        var post = posts.findForReview(postId).filter(item -> item.getStatus() == PostStatus.APPROVED)
                .orElseThrow(() -> new ResourceNotFoundException("Bài viết không còn khả dụng để báo cáo."));
        // Use a current read under the post lock so simultaneous submissions cannot pass the same check.
        if (!reports.lockByReporter(TARGET, postId, reporter.getUserId()).isEmpty()) {
            throw new AppException("Bạn đã báo cáo bài viết này.", HttpStatus.CONFLICT);
        }
        String details = request.details() == null ? "" : request.details().strip();
        if (request.reason() == CommunityReportReason.OTHER && details.isBlank()) {
            throw new FieldValidationException("details", "Vui lòng mô tả lý do khác.");
        }
        if (attachments.size() > 1) throw new FieldValidationException("evidence", "Chỉ được đính kèm một ảnh.");
        var image = attachments.isEmpty() ? null : CommunityImageService.validate(attachments.get(0), "evidence");
        var report = reports.saveAndFlush(Report.builder().targetType(TARGET).targetId(postId)
                .reporter(reporter).postTitle(post.getTitle()).reasonCode(request.reason().name())
                .reason(details).status(ReportStatus.OPEN).build());
        if (image != null) {
            evidence.save(CommunityReportEvidence.builder().report(report).fileName(image.fileName())
                    .contentType(image.contentType()).fileContent(image.bytes()).build());
        }
        return receipt(report);
    }

    @Transactional(readOnly = true)
    public Page<Receipt> mine(int page) {
        var rows = reports.findByTargetTypeAndReporter_UserId(TARGET, activeUser().getUserId(), pageRequest(page));
        return new Page<>(rows.map(this::receipt).getContent(), rows.getNumber(), rows.getTotalPages(), rows.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<Summary> queue(String status, int page) {
        admin();
        Set<ReportStatus> statuses = switch (status) {
            case "ALL" -> EnumSet.allOf(ReportStatus.class);
            case "OPEN" -> OPEN;
            case "RESOLVED" -> Set.of(ReportStatus.RESOLVED);
            case "DISMISSED" -> Set.of(ReportStatus.DISMISSED);
            default -> throw new BadRequestException("Trạng thái báo cáo không hợp lệ.");
        };
        var rows = reports.findByTargetTypeAndStatusIn(TARGET, statuses, pageRequest(page));
        return new Page<>(rows.map(this::summary).getContent(), rows.getNumber(), rows.getTotalPages(), rows.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Detail detail(Integer id) {
        admin();
        var report = reports.findByReportIdAndTargetType(id, TARGET).orElseThrow(this::missing);
        return detail(report, posts.findById(report.getTargetId()).orElse(null));
    }

    @Transactional(readOnly = true)
    public CommunityReportEvidence evidence(Integer id) {
        admin();
        reports.findByReportIdAndTargetType(id, TARGET).orElseThrow(this::missing);
        return evidence.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh bằng chứng."));
    }

    @Transactional
    public Detail resolve(Integer id, CommunityReportDecision decision) {
        var handler = admin();
        Integer postId = reports.findTargetId(id, TARGET).orElseThrow(this::missing);
        // Match submission and deletion lock order. Report rows also serialize decisions for deleted posts.
        Post post = posts.findForReview(postId).orElse(null);
        var related = reports.lockForTarget(TARGET, postId);
        var report = related.stream().filter(row -> row.getReportId().equals(id)).findFirst().orElseThrow(this::missing);
        if (!OPEN.contains(report.getStatus())) {
            throw new AppException("Báo cáo đã đóng. Vui lòng tải lại.", HttpStatus.CONFLICT);
        }
        String note = decision.reason().strip();
        var resolvedAt = LocalDateTime.now();
        if (decision.action() == CommunityReportDecision.Action.DISMISS) {
            close(report, ReportStatus.DISMISSED, handler, note, resolvedAt);
        } else {
            if (post == null || post.getStatus() != PostStatus.APPROVED) {
                throw new AppException("Bài viết không còn công khai để ẩn.", HttpStatus.CONFLICT);
            }
            post.setStatus(PostStatus.HIDDEN);
            logs.save(ModerationLog.builder().staff(handler).targetType("COMMUNITY_POST")
                    .targetId(postId).action("HIDDEN").note(note).build());
            for (Report row : related) {
                if (OPEN.contains(row.getStatus())) close(row, ReportStatus.RESOLVED, handler, note, resolvedAt);
            }
        }
        return detail(report, post);
    }

    private void close(Report report, ReportStatus status, User handler, String note, LocalDateTime time) {
        report.setStatus(status);
        report.setHandler(handler);
        report.setResolutionNote(note);
        report.setResolvedAt(time);
        logs.save(ModerationLog.builder().staff(handler).targetType("COMMUNITY_POST_REPORT")
                .targetId(report.getReportId()).action(status.name()).note(note).build());
    }

    private Detail detail(Report report, Post post) {
        return new Detail(summary(report), report.getReason(), post == null ? null : community.response(post, false),
                evidence.existsById(report.getReportId()),
                report.getHandler() == null ? null : report.getHandler().getFullName(),
                report.getResolutionNote(), report.getResolvedAt());
    }

    private Receipt receipt(Report report) {
        return new Receipt(report.getReportId(), report.getPostTitle(), report.getCreatedAt());
    }

    private Summary summary(Report report) {
        return new Summary(report.getReportId(), report.getTargetId(), report.getPostTitle(), report.getReasonCode(),
                OPEN.contains(report.getStatus()) ? ReportStatus.OPEN : report.getStatus(),
                report.getReporter().getFullName(), report.getCreatedAt());
    }

    private User admin() {
        User user = activeUser();
        if (user.getRole() != UserRole.ADMIN) throw new AppException("Chỉ quản trị viên được xử lý báo cáo.", HttpStatus.FORBIDDEN);
        return user;
    }

    private User activeUser() {
        User user = auth.getCurrentUser();
        if (user.getStatus() != UserStatus.ACTIVE) throw new AppException("Tài khoản không hoạt động.", HttpStatus.FORBIDDEN);
        return user;
    }

    private PageRequest pageRequest(int page) {
        if (page < 0) throw new BadRequestException("Số trang không hợp lệ.");
        return PageRequest.of(page, 15, Sort.by(Sort.Direction.DESC, "createdAt", "reportId"));
    }

    private ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Không tìm thấy báo cáo.");
    }
}
