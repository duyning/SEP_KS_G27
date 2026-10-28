package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityCommentRequest;
import org.hlrcs.dto.response.CommunityCommentResponse;
import org.hlrcs.dto.response.CommunityCommentResponse.CommentPage;
import org.hlrcs.entity.Comment;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.enums.PostStatus;
import org.hlrcs.entity.enums.UserRole;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.CommentRepository;
import org.hlrcs.repository.PostRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class CommunityCommentService {
    private final CommentRepository comments;
    private final PostRepository posts;
    private final AuthService auth;

    @Transactional(readOnly = true)
    public CommentPage list(Integer postId, int page, int size) {
        var pageable = pageable(page, size);
        approvedPost(postId, false);
        return page(postId, comments.findByPost_PostIdAndParentCommentIdIsNull(postId, pageable));
    }

    @Transactional(readOnly = true)
    public CommentPage replies(Integer postId, Integer commentId, int page, int size) {
        var pageable = pageable(page, size);
        approvedPost(postId, false);
        Comment target = comment(postId, commentId);
        Integer rootId = target.getParentCommentId() == null ? target.getCommentId() : target.getParentCommentId();
        return page(postId, comments.findByPost_PostIdAndParentCommentId(postId, rootId, pageable));
    }

    @Transactional
    public CommunityCommentResponse reply(Integer postId, Integer commentId, CommunityCommentRequest request) {
        Post post = approvedPost(postId, true);
        Comment target = comment(postId, commentId);
        Integer rootId = target.getParentCommentId() == null ? target.getCommentId() : target.getParentCommentId();
        comment(postId, rootId);
        return response(comments.saveAndFlush(Comment.builder().post(post).author(auth.getCurrentUser())
                .content(request.content()).parentCommentId(rootId).replyToCommentId(commentId).build()));
    }

    @Transactional
    public CommunityCommentResponse create(Integer postId, CommunityCommentRequest request) {
        Post post = approvedPost(postId, true);
        return response(comments.saveAndFlush(Comment.builder().post(post).author(auth.getCurrentUser())
                .content(request.content()).build()));
    }

    @Transactional
    public CommunityCommentResponse update(Integer postId, Integer commentId, CommunityCommentRequest request) {
        approvedPost(postId, true);
        Comment comment = comment(postId, commentId);
        if (!comment.getAuthor().getUserId().equals(auth.getCurrentUser().getUserId())) {
            throw new ResourceNotFoundException("Không tìm thấy bình luận của bạn.");
        }
        if (!Objects.equals(comment.getContent(), request.content())) {
            comment.setContent(request.content());
            comment.setUpdatedAt(LocalDateTime.now().withNano(0));
        }
        return response(comments.saveAndFlush(comment));
    }

    @Transactional
    public void delete(Integer postId, Integer commentId) {
        approvedPost(postId, true);
        Comment comment = comment(postId, commentId);
        var user = auth.getCurrentUser();
        boolean moderator = user.getRole() == UserRole.STAFF || user.getRole() == UserRole.ADMIN;
        if (!comment.getAuthor().getUserId().equals(user.getUserId()) && !moderator) {
            throw new ResourceNotFoundException("Không tìm thấy bình luận của bạn.");
        }
        if (comment.getParentCommentId() == null) comments.deleteReplies(postId, commentId);
        else comments.clearReplyTargets(postId, commentId);
        comments.delete(comment);
        comments.flush();
    }

    private Post approvedPost(Integer postId, boolean lock) {
        // Serialize comment writes with post deletion, resubmission and moderation.
        Post post = (lock ? posts.findForReview(postId) : posts.findById(postId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết."));
        if (post.getStatus() != PostStatus.APPROVED) {
            throw new ResourceNotFoundException("Không tìm thấy bài viết công khai.");
        }
        return post;
    }

    private Comment comment(Integer postId, Integer commentId) {
        return comments.findByCommentIdAndPost_PostId(commentId, postId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bình luận."));
    }

    private CommunityCommentResponse response(Comment comment) {
        String targetName = comment.getReplyToCommentId() == null ? null
                : comments.findByCommentIdAndPost_PostId(comment.getReplyToCommentId(), comment.getPost().getPostId())
                        .map(target -> target.getAuthor().getFullName()).orElse(null);
        return response(comment, targetName, comments.countByPost_PostIdAndParentCommentId(comment.getPost().getPostId(), comment.getCommentId()));
    }

    private CommunityCommentResponse response(Comment comment, String targetName, long replyCount) {
        return new CommunityCommentResponse(comment.getCommentId(), comment.getPost().getPostId(),
                comment.getAuthor().getUserId(), comment.getAuthor().getFullName(),
                comment.getContent(), comment.getCreatedAt(), comment.getUpdatedAt(),
                comment.getParentCommentId(), comment.getReplyToCommentId(), targetName, replyCount);
    }

    private CommentPage page(Integer postId, Page<Comment> result) {
        List<Comment> values = result.getContent();
        var targetIds = values.stream().map(Comment::getReplyToCommentId).filter(Objects::nonNull).distinct().toList();
        Map<Integer, String> names = targetIds.isEmpty() ? Map.of() : comments.findByCommentIdIn(targetIds).stream()
                .filter(value -> value.getAuthor().getFullName() != null)
                .collect(Collectors.toMap(Comment::getCommentId, value -> value.getAuthor().getFullName()));
        Map<Integer, Long> counts = values.isEmpty() ? Map.of() : comments.countForParents(values.stream().map(Comment::getCommentId).toList()).stream()
                .collect(Collectors.toMap(CommentRepository.ReplyCount::getParentId, CommentRepository.ReplyCount::getTotal));
        return new CommentPage(values.stream().map(value -> response(value, value.getReplyToCommentId() == null ? null : names.get(value.getReplyToCommentId()), counts.getOrDefault(value.getCommentId(), 0L))).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), comments.countByPost_PostId(postId));
    }

    private Pageable pageable(int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE) {
            throw new BadRequestException("Trang phải từ 0; số bình luận mỗi trang từ 1 đến 100.");
        }
        return PageRequest.of(page, size, Sort.by("createdAt").ascending().and(Sort.by("commentId").ascending()));
    }
}
