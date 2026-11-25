package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.AppException;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class ServiceComplaintService {
    private static final List<String> OPEN = List.of("PENDING", "NEEDS_EXPLANATION", "EXPLAINED");
    private final AuthService auth;
    private final ServiceComplaintRepository complaints;
    private final ServiceComplaintEventRepository events;
    private final ServiceRepository services;
    private final UserRepository users;
    private final ModerationLogRepository logs;
    private final ServicePublicationService publication;
    private final jakarta.persistence.EntityManager entityManager;

    public record Summary(Integer complaintId, Integer serviceId, String serviceName, String providerName,
                          String content, String status, Instant createdAt, int revision, boolean moderationHidden, String outcome, boolean responseRequested) {}
    public record Event(Integer eventId, String actorName, String action, String content, Instant createdAt, List<String> imageUrls) {}
    public record Detail(Summary complaint, String reporterName, List<String> imageUrls, List<Event> history,
                         boolean canReview, boolean canExplain) {}
    private AppException missing() { return new AppException("Không tìm thấy báo cáo dịch vụ.", HttpStatus.NOT_FOUND); }
    private boolean staff(User actor) { return actor.getStatus() == UserStatus.ACTIVE && Set.of(UserRole.STAFF, UserRole.ADMIN).contains(actor.getRole()); }
    private void requireStaff() { if (!staff(auth.getCurrentUser())) throw new AppException("Chỉ nhân viên hoặc quản trị viên được xử lý báo cáo.", HttpStatus.FORBIDDEN); }
    private boolean owner(ServiceComplaint c, User actor) { return c.getService().getProvider().getUserId().equals(actor.getUserId()); }
    private boolean impartial(ServiceComplaint c, User actor) { return !owner(c, actor) && !c.getReporter().getUserId().equals(actor.getUserId()); }
    private ServiceComplaint accessible(Integer id) {
        var c = complaints.findById(id).orElseThrow(this::missing);
        var actor = auth.getCurrentUser();
        if (!staff(actor) && !owner(c, actor) && !c.getReporter().getUserId().equals(actor.getUserId())) throw missing();
        return c;
    }
    private Summary summary(ServiceComplaint c) {
        return new Summary(c.getComplaintId(), c.getService().getServiceId(), c.getService().getServiceName(), c.getService().getProvider().getFullName(),
                c.getContent(), c.workflowStatus(), c.getCreatedAt(), c.getRevision(), c.getService().isModerationHidden(), c.resolution(), c.awaitingResponse());
    }
    private List<String> urls(String base, int count) { return java.util.stream.IntStream.range(0, count).mapToObj(i -> base + i).toList(); }
    public List<Summary> list(String scope) {
        var id = auth.getCurrentUser().getUserId();
        List<ServiceComplaint> rows;
        switch (scope) {
            case "staff" -> { requireStaff(); rows = complaints.findAllByOrderByComplaintIdDesc(); }
            case "incoming" -> rows = complaints.findByService_Provider_UserIdOrderByComplaintIdDesc(id);
            case "mine" -> rows = complaints.findByReporter_UserIdOrderByComplaintIdDesc(id);
            default -> throw new AppException("Danh sách báo cáo không hợp lệ.");
        }
        return rows.stream().map(this::summary).toList();
    }
    public Detail detail(Integer id) {
        var c = accessible(id); var actor = auth.getCurrentUser();
        String base = "/api/service-complaints/" + id;
        return new Detail(summary(c), staff(actor) && !owner(c, actor) ? c.getReporter().getFullName() : null,
                urls(base + "/images/", c.getImages().size()),
                events.findByComplaint_ComplaintIdOrderByEventIdAsc(id).stream().map(e -> new Event(e.getEventId(), e.getActor().getFullName(),
                        e.getAction(), e.getContent(), e.getCreatedAt(), urls(base + "/events/" + e.getEventId() + "/images/", e.getImages().size()))).toList(),
                staff(actor) && impartial(c, actor) && OPEN.contains(c.getStatus()), owner(c, actor) && c.awaitingResponse());
    }
    @Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_COMMITTED)
    public Detail submit(Integer serviceId, String content, List<MultipartFile> images) throws IOException {
        var actor = auth.getCurrentUser();
        var listing = services.findById(serviceId).orElseThrow(this::missing);
        users.findForRegistrationUpdate(listing.getProvider().getUserId()).orElseThrow(this::missing);
        entityManager.refresh(listing);
        if (!publication.isPublic(listing)) throw new AppException("Dịch vụ không còn công khai.", HttpStatus.CONFLICT);
        if (listing.getProvider().getUserId().equals(actor.getUserId())) throw new AppException("Không thể báo cáo dịch vụ của chính mình.", HttpStatus.FORBIDDEN);
        if (complaints.existsByService_ServiceIdAndReporter_UserIdAndStatusIn(serviceId, actor.getUserId(), OPEN))
            throw new AppException("Bạn đã có báo cáo đang chờ xử lý cho dịch vụ này.", HttpStatus.CONFLICT);
        var c = new ServiceComplaint();
        c.setService(listing); c.setReporter(actor); c.setContent(ServiceFeedbackImages.text(content, 10));
        c.setImages(ServiceFeedbackImages.read(images)); c.setStatus("PENDING"); c.setCreatedAt(Instant.now());
        complaints.saveAndFlush(c);
        return detail(c.getComplaintId());
    }
    private void fresh(ServiceComplaint c, int revision) {
        if (c.getRevision() != revision || !OPEN.contains(c.getStatus())) throw new AppException("Báo cáo đã thay đổi hoặc đã xử lý. Vui lòng tải lại.", HttpStatus.CONFLICT);
    }
    private void event(ServiceComplaint c, String action, String content, List<ServiceImage> images) {
        var e = new ServiceComplaintEvent(); e.setComplaint(c); e.setActor(auth.getCurrentUser());
        e.setAction(action); e.setContent(content); e.setCreatedAt(Instant.now()); e.setImages(images);
        events.save(e);
        logs.save(ModerationLog.builder().staff(auth.getCurrentUser()).targetType("SERVICE_COMPLAINT").targetId(c.getComplaintId())
                .action(action).note(content).build());
        c.setRevision(c.getRevision() + 1); complaints.saveAndFlush(c);
    }
    @Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_COMMITTED)
    public Detail explain(Integer id, int revision, String content, List<MultipartFile> images) throws IOException {
        var c = complaints.findForReview(id).orElseThrow(this::missing);
        if (!owner(c, auth.getCurrentUser())) throw missing();
        fresh(c, revision);
        if (!c.awaitingResponse()) throw new AppException("Báo cáo không chờ giải trình.", HttpStatus.CONFLICT);
        String note = ServiceFeedbackImages.text(content, 10);
        var photos = ServiceFeedbackImages.read(images);
        c.setStatus("PENDING"); c.setResponseRequested(false); event(c, "EXPLAINED", note, photos);
        return detail(id);
    }
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail review(Integer id, int revision, String action, String content) {
        requireStaff();
        var c = complaints.findForReview(id).orElseThrow(this::missing);
        if (!impartial(c, auth.getCurrentUser())) throw new AppException("Không được xử lý báo cáo liên quan đến dịch vụ của mình hoặc do mình gửi.", HttpStatus.FORBIDDEN);
        fresh(c, revision);
        if (!Set.of("REQUEST_EXPLANATION", "DISMISS", "REMOVE").contains(action)) throw new AppException("Quyết định không hợp lệ.");
        if (action.equals("REQUEST_EXPLANATION") && c.awaitingResponse()) throw new AppException("Đang chờ nhà cung cấp giải trình.", HttpStatus.CONFLICT);
        String note = ServiceFeedbackImages.text(content, 10);
        var listing = c.getService();
        users.findForRegistrationUpdate(listing.getProvider().getUserId()).orElseThrow(this::missing);
        entityManager.refresh(listing);
        switch (action) {
            case "REQUEST_EXPLANATION" -> { c.setStatus("PENDING"); c.setResponseRequested(true); }
            case "DISMISS" -> { c.setStatus("RESOLVED"); c.setOutcome("DISMISS"); c.setResponseRequested(false); }
            case "REMOVE" -> {
                listing.setModerationHidden(true); listing.setRevision(listing.getRevision() + 1);
                services.saveAndFlush(listing); c.setStatus("RESOLVED"); c.setOutcome("REMOVE"); c.setResponseRequested(false);
            }
        }
        event(c, action, note, new ArrayList<>());
        return detail(id);
    }
    public StaffService.FileContent image(Integer id, Integer eventId, int index) {
        var c = accessible(id);
        List<ServiceImage> images;
        if (eventId == null) images = c.getImages();
        else {
            var e = events.findById(eventId).orElseThrow(this::missing);
            if (!e.getComplaint().getComplaintId().equals(id)) throw missing();
            images = e.getImages();
        }
        if (index < 0 || index >= images.size()) throw missing();
        var image = images.get(index);
        return new StaffService.FileContent(image.getContent(), image.getContentType());
    }
}
