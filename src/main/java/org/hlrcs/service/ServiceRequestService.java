package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ServiceRequestInput;
import org.hlrcs.entity.ServiceRequest;
import org.hlrcs.exception.AppException;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceRequestService {
    private final AuthService auth;
    private final ServiceRequestRepository requests;
    private final ServiceRepository services;
    private final UserRepository users;
    private final ServicePublicationService publication;
    private final jakarta.persistence.EntityManager entityManager;

    public record Result(Integer requestId, Integer serviceId, String serviceName, String contactName,
            String contactPhone, String description, String address, Instant scheduledAt, String status,
            Instant createdAt, Integer handledBy, Instant handledAt, String responseReason, int revision,
            boolean canAccept) {}

    private Result dto(ServiceRequest r) {
        return new Result(r.getRequestId(), r.getService().getServiceId(), r.getService().getServiceName(),
                r.getContactName(), r.getContactPhone(), r.getDescription(), r.getAddress(), r.getScheduledAt(),
                r.getStatus(), r.getCreatedAt(), r.getHandledBy() == null ? null : r.getHandledBy().getUserId(),
                r.getHandledAt(), r.getResponseReason(), r.getRevision(),
                "PENDING".equals(r.getStatus()) && r.getScheduledAt().isAfter(Instant.now()) && publication.isPublic(r.getService()));
    }
    public List<Result> mine() {
        return requests.findByCustomer_UserIdOrderByRequestIdDesc(auth.getCurrentUser().getUserId()).stream().map(this::dto).toList();
    }
    public List<Result> incoming() {
        return requests.findByService_Provider_UserIdOrderByRequestIdDesc(auth.getCurrentUser().getUserId()).stream().map(this::dto).toList();
    }
    public Result detail(Integer id) {
        var r = requests.findById(id).orElseThrow(this::missing);
        var actor = auth.getCurrentUser().getUserId();
        if (!r.getCustomer().getUserId().equals(actor) && !r.getService().getProvider().getUserId().equals(actor)) throw missing();
        return dto(r);
    }
    private AppException missing() { return new AppException("Không tìm thấy yêu cầu dịch vụ.", HttpStatus.NOT_FOUND); }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Result submit(ServiceRequestInput input) {
        var customer = auth.getCurrentUser();
        var listing = services.findById(input.serviceId()).orElseThrow(this::missing);
        users.findForRegistrationUpdate(listing.getProvider().getUserId()).orElseThrow(this::missing);
        entityManager.refresh(listing);
        if (!publication.isPublic(listing)) throw new AppException("Dịch vụ không còn nhận yêu cầu.", HttpStatus.CONFLICT);
        if (listing.getProvider().getUserId().equals(customer.getUserId())) throw new AppException("Không thể gửi yêu cầu cho dịch vụ của chính mình.");
        if (!input.scheduledAt().toInstant().isAfter(Instant.now())) throw new AppException("Lịch sử dụng dịch vụ phải nằm trong tương lai.");
        if (input.description().trim().length() < 10) throw new AppException("Mô tả cần ít nhất 10 ký tự.");
        var r = new ServiceRequest();
        r.setService(listing); r.setCustomer(customer); r.setContactName(input.contactName().trim());
        r.setContactPhone(input.contactPhone()); r.setDescription(input.description().trim());
        r.setAddress(input.address() == null ? null : input.address().trim());
        r.setScheduledAt(input.scheduledAt().toInstant()); r.setStatus("PENDING"); r.setCreatedAt(Instant.now());
        return dto(requests.saveAndFlush(r));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Result respond(Integer id, String decision, String reason, int revision) {
        var r = requests.findForResponse(id).orElseThrow(this::missing);
        var actor = auth.getCurrentUser();
        if (!r.getService().getProvider().getUserId().equals(actor.getUserId())) throw missing();
        users.findForRegistrationUpdate(actor.getUserId()).orElseThrow(this::missing);
        entityManager.refresh(r.getService());
        if (!"PENDING".equals(r.getStatus()) || revision != r.getRevision()) throw new AppException("Yêu cầu đã được xử lý. Vui lòng tải lại.", HttpStatus.CONFLICT);
        if (!Set.of("ACCEPTED", "REJECTED").contains(decision)) throw new AppException("Quyết định không hợp lệ.");
        String note = reason == null ? "" : reason.trim();
        if (note.length() > 2000 || ("REJECTED".equals(decision) && note.length() < 10)) throw new AppException("Lý do từ chối cần từ 10 đến 2000 ký tự.");
        if ("ACCEPTED".equals(decision) && (!publication.isPublic(r.getService()) || !r.getScheduledAt().isAfter(Instant.now())))
            throw new AppException("Không thể nhận: dịch vụ đã ngừng công khai hoặc lịch đã qua.", HttpStatus.CONFLICT);
        r.setStatus(decision); r.setResponseReason(note); r.setHandledBy(actor); r.setHandledAt(Instant.now());
        return dto(requests.saveAndFlush(r));
    }
}
