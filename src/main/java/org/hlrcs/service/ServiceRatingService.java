package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.ServiceRating;
import org.hlrcs.exception.AppException;
import org.hlrcs.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class ServiceRatingService {
    private final AuthService auth;
    private final ServiceRatingRepository ratings;
    private final ServiceRepository services;
    private final UserRepository users;
    private final ServicePublicationService publication;
    private final jakarta.persistence.EntityManager entityManager;

    public record Rating(Integer ratingId, Integer authorId, String authorName, int stars, String content,
                         Instant createdAt, List<String> imageUrls, String reply, Instant repliedAt) {}
    public record Results(List<Rating> items, long filteredTotal, int page, int totalPages, long total,
                          Double average, List<Long> counts, Rating mine) {}
    private AppException missing() { return new AppException("Không tìm thấy đánh giá hoặc dịch vụ công khai.", HttpStatus.NOT_FOUND); }
    private org.hlrcs.entity.Service publicService(Integer id) {
        var row = services.findById(id).orElseThrow(this::missing);
        if (!publication.isPublic(row)) throw missing();
        return row;
    }
    private Rating dto(ServiceRating r) {
        var urls = new ArrayList<String>();
        for (int i = 0; i < r.getImages().size(); i++) urls.add("/api/services/" + r.getService().getServiceId() + "/ratings/" + r.getRatingId() + "/images/" + i);
        return new Rating(r.getRatingId(), r.getAuthor().getUserId(), r.getAuthor().getFullName(), r.getStars(), r.getContent(), r.getCreatedAt(), urls, r.getReply(), r.getRepliedAt());
    }
    public Results list(Integer serviceId, Integer stars, int page) {
        publicService(serviceId);
        if (stars != null && (stars < 0 || stars > 5) || page < 0) throw new AppException("Bộ lọc đánh giá không hợp lệ.");
        var rows = ratings.ratings(serviceId, stars, PageRequest.of(page, 10));
        var counts = new ArrayList<Long>(Collections.nCopies(6, 0L));
        long total = 0, sum = 0;
        for (var count : ratings.counts(serviceId)) {
            int star = ((Number) count[0]).intValue(); long amount = ((Number) count[1]).longValue();
            counts.set(star, amount); total += amount; sum += star * amount;
        }
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Rating mine = authentication == null || authentication instanceof AnonymousAuthenticationToken ? null
                : ratings.findByService_ServiceIdAndAuthor_UserId(serviceId, auth.getCurrentUser().getUserId()).map(this::dto).orElse(null);
        return new Results(rows.getContent().stream().map(this::dto).toList(), rows.getTotalElements(), page, rows.getTotalPages(), total,
                total == 0 ? null : (double) sum / total, counts, mine);
    }
    @Transactional(rollbackFor = Exception.class, isolation = Isolation.READ_COMMITTED)
    public Rating submit(Integer serviceId, int stars, String content, List<MultipartFile> images) throws IOException {
        var actor = auth.getCurrentUser();
        var row = services.findById(serviceId).orElseThrow(this::missing);
        // Same provider lock as listing approval/removal; also serializes duplicate submissions.
        users.findForRegistrationUpdate(row.getProvider().getUserId()).orElseThrow(this::missing);
        entityManager.refresh(row);
        if (!publication.isPublic(row)) throw missing();
        if (actor.getUserId().equals(row.getProvider().getUserId())) throw new AppException("Không thể tự đánh giá dịch vụ của mình.", HttpStatus.FORBIDDEN);
        if (stars < 0 || stars > 5) throw new AppException("Số sao phải từ 0 đến 5.");
        if (ratings.existsByService_ServiceIdAndAuthor_UserId(serviceId, actor.getUserId())) throw new AppException("Bạn đã đánh giá dịch vụ này. Mỗi người chỉ được đánh giá một lần.", HttpStatus.CONFLICT);
        var rating = new ServiceRating();
        rating.setService(row); rating.setAuthor(actor); rating.setStars(stars);
        rating.setContent(ServiceFeedbackImages.text(content, 1)); rating.setCreatedAt(Instant.now());
        rating.setImages(ServiceFeedbackImages.read(images));
        return dto(ratings.saveAndFlush(rating));
    }
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Rating reply(Integer id, String content) {
        var r = ratings.findForReply(id).orElseThrow(this::missing);
        var actor = auth.getCurrentUser();
        if (!r.getService().getProvider().getUserId().equals(actor.getUserId())) throw new AppException("Chỉ chủ dịch vụ được phản hồi đánh giá.", HttpStatus.FORBIDDEN);
        if (r.getReply() != null) throw new AppException("Đánh giá này đã được phản hồi.", HttpStatus.CONFLICT);
        r.setReply(ServiceFeedbackImages.text(content, 1)); r.setRepliedAt(Instant.now());
        return dto(ratings.saveAndFlush(r));
    }
    public StaffService.FileContent image(Integer serviceId, Integer ratingId, int index) {
        publicService(serviceId);
        var r = ratings.findById(ratingId).orElseThrow(this::missing);
        if (!r.getService().getServiceId().equals(serviceId) || index < 0 || index >= r.getImages().size()) throw missing();
        var image = r.getImages().get(index);
        return new StaffService.FileContent(image.getContent(), image.getContentType());
    }
}
