package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityPostRequest;
import org.hlrcs.dto.request.CommunityReviewRequest;
import org.hlrcs.dto.response.CommunityPostResponse;
import org.hlrcs.dto.response.CommunityPostResponse.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityService {
    private final PostRepository posts;
    private final ModerationLogRepository logs;
    private final AuthService auth;

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> published() {
        // No client-supplied status can broaden the public feed.
        return posts.findByStatusOrderByCreatedAtDescPostIdDesc(PostStatus.APPROVED).stream()
                .map(post -> response(post, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> mine() {
        return posts.findByAuthor_UserIdOrderByCreatedAtDescPostIdDesc(auth.getCurrentUser().getUserId())
                .stream().map(post -> response(post, true)).toList();
    }

    @Transactional
    public CommunityPostResponse submit(CommunityPostRequest request) {
        Post post = Post.builder().author(auth.getCurrentUser()).status(PostStatus.PENDING).build();
        apply(post, request);
        return response(posts.saveAndFlush(post), true);
    }

    @Transactional
    public CommunityPostResponse resubmit(Integer id, CommunityPostRequest request) {
        Post post = locked(id);
        if (!post.getAuthor().getUserId().equals(auth.getCurrentUser().getUserId())) {
            throw new ResourceNotFoundException("Không tìm thấy bài viết của bạn.");
        }
        if (post.getStatus() != PostStatus.NEED_CHANGES) {
            throw new AppException("Chỉ được sửa và gửi lại bài đang được yêu cầu chỉnh sửa.", HttpStatus.CONFLICT);
        }
        apply(post, request);
        post.setStatus(PostStatus.PENDING);
        post.setReviewer(null);
        post.setReviewedAt(null);
        post.setReviewNote(null);
        return response(posts.saveAndFlush(post), true);
    }

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> moderationList() {
        return posts.findAllByOrderByCreatedAtDescPostIdDesc().stream().map(post -> response(post, true)).toList();
    }

    @Transactional(readOnly = true)
    public Detail detail(Integer id) {
        Post post = posts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết."));
        return new Detail(response(post, true), post.getAuthor().getFullName(),
                logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("COMMUNITY_POST", id).stream()
                        .map(log -> new Activity(log.getLogId(), log.getAction(), log.getNote(),
                                log.getStaff().getFullName(), log.getCreatedAt())).toList());
    }

    @Transactional
    public Detail review(Integer id, CommunityReviewRequest request) {
        if (!request.decision().equals("APPROVE") && request.note().length() < 10) {
            throw new FieldValidationException("note", "Lý do / hướng dẫn chỉnh sửa cần từ 10 đến 2000 ký tự.");
        }
        Post post = locked(id);
        if (post.getStatus() != PostStatus.PENDING) {
            throw new AppException("Bài viết không còn chờ duyệt. Vui lòng tải lại trạng thái mới nhất.", HttpStatus.CONFLICT);
        }
        User reviewer = auth.getCurrentUser();
        if (post.getAuthor().getUserId().equals(reviewer.getUserId())) {
            throw new AppException("Bạn không thể tự kiểm duyệt bài viết của mình.", HttpStatus.FORBIDDEN);
        }
        PostStatus status = switch (request.decision()) {
            case "APPROVE" -> PostStatus.APPROVED;
            case "REJECT" -> PostStatus.REJECTED;
            case "REQUEST_CHANGES" -> PostStatus.NEED_CHANGES;
            default -> throw new BadRequestException("Quyết định kiểm duyệt không hợp lệ.");
        };
        post.setStatus(status);
        post.setReviewer(reviewer);
        post.setReviewedAt(LocalDateTime.now());
        post.setReviewNote(request.note().isBlank() ? "Nội dung phù hợp quy chuẩn cộng đồng." : request.note());
        posts.saveAndFlush(post);
        logs.saveAndFlush(ModerationLog.builder().staff(reviewer).targetType("COMMUNITY_POST")
                .targetId(id).action(status.name()).note(post.getReviewNote()).build());
        return detail(id);
    }

    private Post locked(Integer id) {
        return posts.findForReview(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết."));
    }

    private void apply(Post post, CommunityPostRequest request) {
        if (request.price() != null && request.price().signum() == 0 && !"SECOND_HAND".equals(request.type())) {
            throw new FieldValidationException("price", "Giá thuê phải lớn hơn 0; để trống nếu thỏa thuận.");
        }
        post.setPostType(switch (request.type()) {
            case "ROOM_TRANSFER" -> PostType.PASS_ROOM;
            case "ROOMMATE" -> PostType.ROOMMATE;
            case "SECOND_HAND" -> PostType.PASS_ITEM;
            default -> throw new BadRequestException("Chuyên mục bài viết không hợp lệ.");
        });
        post.setTitle(request.title());
        post.setDescription(request.content());
        post.setPrice(request.price());
        post.setLocation(request.location());
        post.setContactName(request.authorName());
        post.setContactPhone(request.authorPhone());
    }

    private CommunityPostResponse response(Post post, boolean privateView) {
        String type = switch (post.getPostType()) {
            case PASS_ROOM -> "ROOM_TRANSFER";
            case ROOMMATE -> "ROOMMATE";
            case PASS_ITEM -> "SECOND_HAND";
        };
        String label = switch (post.getPostType()) {
            case PASS_ROOM -> "Nhượng phòng";
            case ROOMMATE -> "Tìm người ở ghép";
            case PASS_ITEM -> "Đồ cũ sinh viên";
        };
        return new CommunityPostResponse(post.getPostId(), type, label, post.getTitle(), post.getDescription(),
                post.getPrice(), post.getLocation(), post.getContactName() == null ? post.getAuthor().getFullName() : post.getContactName(),
                post.getContactPhone(), post.getStatus().name(), post.getCreatedAt(), post.getUpdatedAt(),
                privateView ? post.getReviewNote() : null,
                privateView && post.getReviewer() != null ? post.getReviewer().getFullName() : null,
                privateView ? post.getReviewedAt() : null);
    }
}
