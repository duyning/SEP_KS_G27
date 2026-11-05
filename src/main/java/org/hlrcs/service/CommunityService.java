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
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.HashSet;

@Service
@RequiredArgsConstructor
public class CommunityService {
    private final PostRepository posts;
    private final ModerationLogRepository logs;
    private final AuthService auth;
    private final CommunityImageService images;
    private final CommunityVideoService videos;
    private final CommentRepository comments;
    private final ObjectMapper json;

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> published() {
        // No client-supplied status can broaden the public feed.
        return responses(posts.findByStatusOrderByCreatedAtDescPostIdDesc(PostStatus.APPROVED), false);
    }

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> mine() {
        return responses(posts.findByAuthor_UserIdOrderByCreatedAtDescPostIdDesc(auth.getCurrentUser().getUserId()), true);
    }

    @Transactional
    public CommunityPostResponse submit(CommunityPostRequest request) {
        return submit(request, List.of());
    }

    @Transactional
    public CommunityPostResponse submit(CommunityPostRequest request, List<org.springframework.web.multipart.MultipartFile> photos) {
        return submit(request, photos, List.of());
    }

    @Transactional
    public CommunityPostResponse submit(CommunityPostRequest request, List<org.springframework.web.multipart.MultipartFile> photos,
                                        List<org.springframework.web.multipart.MultipartFile> clips) {
        Post post = Post.builder().author(auth.getCurrentUser()).status(PostStatus.PENDING).build();
        apply(post, request);
        posts.saveAndFlush(post);
        images.replace(post, request.retainedImageIds(), photos);
        videos.replace(post, request.retainedVideoIds(), clips);
        return response(posts.saveAndFlush(post), true);
    }

    @Transactional
    public CommunityPostResponse resubmit(Integer id, CommunityPostRequest request) {
        return resubmit(id, request, List.of());
    }

    @Transactional
    public CommunityPostResponse resubmit(Integer id, CommunityPostRequest request, List<org.springframework.web.multipart.MultipartFile> photos) {
        return resubmit(id, request, photos, List.of());
    }

    @Transactional
    public CommunityPostResponse resubmit(Integer id, CommunityPostRequest request, List<org.springframework.web.multipart.MultipartFile> photos,
                                          List<org.springframework.web.multipart.MultipartFile> clips) {
        Post post = locked(id);
        if (!post.getAuthor().getUserId().equals(auth.getCurrentUser().getUserId())) {
            throw new ResourceNotFoundException("Không tìm thấy bài viết của bạn.");
        }
        if (post.getStatus() != PostStatus.NEED_CHANGES) {
            throw new AppException("Chỉ được sửa và gửi lại bài đang được yêu cầu chỉnh sửa.", HttpStatus.CONFLICT);
        }
        if (!hasRevisionChanges(post, request, photos, clips)) {
            throw new BadRequestException("Bạn cần chỉnh sửa nội dung hoặc tệp đính kèm theo yêu cầu của nhân viên trước khi gửi lại.");
        }
        apply(post, request);
        images.replace(post, request.retainedImageIds(), photos);
        videos.replace(post, request.retainedVideoIds(), clips);
        post.setStatus(PostStatus.PENDING);
        post.setReviewer(null);
        post.setReviewedAt(null);
        post.setReviewNote(null);
        return response(posts.saveAndFlush(post), true);
    }

    @Transactional
    public void delete(Integer id) {
        Post post = locked(id);
        if (!post.getAuthor().getUserId().equals(auth.getCurrentUser().getUserId())) {
            throw new ResourceNotFoundException("Không tìm thấy bài viết của bạn.");
        }
        // Use the same lock as moderation; authors may delete in every status.
        // Remove dependent rows even in databases created by Hibernate without ON DELETE CASCADE.
        posts.deleteCommentsForPost(id);
        posts.deleteMediaForPost(id);
        posts.deleteRoommateDetailForPost(id);
        posts.deleteRoomTransferDetailForPost(id);
        posts.deleteItemDetailForPost(id);
        posts.delete(post);
        posts.flush();
    }

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> moderationList() {
        return responses(posts.findAllByOrderByCreatedAtDescPostIdDesc(), true);
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

    private boolean hasRevisionChanges(Post post, CommunityPostRequest request,
                                       List<org.springframework.web.multipart.MultipartFile> photos,
                                       List<org.springframework.web.multipart.MultipartFile> clips) {
        if (photos != null && !photos.isEmpty() || clips != null && !clips.isEmpty()) return true;
        String type = switch (post.getPostType()) { case PASS_ROOM -> "ROOM_TRANSFER"; case ROOMMATE -> "ROOMMATE"; case PASS_ITEM -> "SECOND_HAND"; };
        boolean samePrice = post.getPrice() == null ? request.price() == null
                : request.price() != null && post.getPrice().compareTo(request.price()) == 0;
        if (!type.equals(request.type()) || !Objects.equals(post.getTitle(), request.title())
                || !Objects.equals(post.getDescription(), request.content()) || !samePrice
                || (request.contentFormat() != null && !Objects.equals(post.getContentFormat(),
                        CommunityPostFormatting.validate(json, request.contentFormat(), request.content())))
                || !Objects.equals(post.getLocation(), request.location()) || !Objects.equals(post.getContactName(), request.authorName())
                || !Objects.equals(post.getContactPhone(), request.authorPhone())
                || !Objects.equals(Objects.toString(post.getFacebookUrl(), ""), Objects.toString(request.facebookUrl(), ""))
                || !Objects.equals(Objects.toString(post.getZaloUrl(), ""), Objects.toString(request.zaloUrl(), ""))) return true;
        var imageIds = images.metadata(post.getPostId()).stream().map(CommunityPostResponse.Image::id).toList();
        var videoIds = videos.metadata(post.getPostId()).stream().map(CommunityPostResponse.Image::id).toList();
        return retainedChanged(request.retainedImageIds(), imageIds) || retainedChanged(request.retainedVideoIds(), videoIds);
    }

    private boolean retainedChanged(List<Integer> requested, List<Integer> existing) {
        return requested != null && (requested.size() != existing.size() || !new HashSet<>(requested).equals(new HashSet<>(existing)));
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
        if (request.contentFormat() != null) {
            post.setContentFormat(CommunityPostFormatting.validate(json, request.contentFormat(), request.content()));
        }
        post.setPrice(request.price());
        post.setLocation(request.location());
        post.setContactName(request.authorName());
        post.setContactPhone(request.authorPhone());
        post.setFacebookUrl(request.facebookUrl());
        post.setZaloUrl(request.zaloUrl());
    }

    private CommunityPostResponse response(Post post, boolean privateView) {
        return response(post, privateView, comments.countByPost_PostId(post.getPostId()));
    }

    private List<CommunityPostResponse> responses(List<Post> values, boolean privateView) {
        if (values.isEmpty()) return List.of();
        var counts = comments.countForPosts(values.stream().map(Post::getPostId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(CommentRepository.PostCount::getPostId, CommentRepository.PostCount::getTotal));
        return values.stream().map(post -> response(post, privateView, counts.getOrDefault(post.getPostId(), 0L))).toList();
    }

    private CommunityPostResponse response(Post post, boolean privateView, long commentCount) {
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
        return new CommunityPostResponse(post.getPostId(), post.getAuthor().getUserId(), type, label, post.getTitle(), post.getDescription(),
                post.getPrice(), post.getLocation(), post.getContactName() == null ? post.getAuthor().getFullName() : post.getContactName(),
                post.getContactPhone(), post.getFacebookUrl(), post.getZaloUrl(), post.getStatus().name(), post.getCreatedAt(), post.getUpdatedAt(),
                privateView ? post.getReviewNote() : null,
                privateView && post.getReviewer() != null ? post.getReviewer().getFullName() : null,
                privateView ? post.getReviewedAt() : null, images.metadata(post.getPostId()), videos.metadata(post.getPostId()),
                commentCount, post.getContentFormat());
    }
}
