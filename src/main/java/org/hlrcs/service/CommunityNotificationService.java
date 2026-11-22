package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@Service @RequiredArgsConstructor
public class CommunityNotificationService {
    private final CommunityNotificationRepository notifications;
    private final PostRepository posts;
    private final CommentRepository comments;
    private final AuthService auth;
    private final org.springframework.context.ApplicationEventPublisher events;

    public record Item(Integer notificationId, String kind, Integer postId, Integer commentId, String postTitle,
                       String actor, String reason, boolean read, LocalDateTime createdAt) {}
    public record Inbox(List<Item> items, boolean hasNext, long unreadCount) {}

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(CommunityNotificationEvent event) {
        var recipient = event.recipient();
        if (recipient.getRole() != UserRole.USER && recipient.getRole() != UserRole.ROOM_HOST) return;
        if (notifications.existsByRecipient_UserIdAndEventKey(recipient.getUserId(), event.key())) return;
        notifications.save(CommunityNotification.builder().recipient(recipient).eventKey(event.key())
                .postId(event.post().getPostId()).commentId(event.commentId()).kind(event.kind())
                .postTitle(event.post().getTitle()).actor(event.actor()).reason(event.reason())
                .createdAt(LocalDateTime.now()).build());
        events.publishEvent(CommunityRealtimeEvent.notifications(recipient.getUserId()));
    }

    @Transactional(readOnly = true)
    public Inbox inbox(int page, boolean unread) {
        if (page < 0 || page > 1000000) throw new BadRequestException("Số trang không hợp lệ.");
        var userId = user().getUserId();
        var pageable = PageRequest.of(page, 20, Sort.by("notificationId").descending());
        var rows = unread ? notifications.findByRecipient_UserIdAndReadFalse(userId, pageable)
                : notifications.findByRecipient_UserId(userId, pageable);
        return new Inbox(rows.stream().map(n -> new Item(n.getNotificationId(), n.getKind(), n.getPostId(),
                n.getCommentId(), n.getPostTitle(), n.getActor(), n.getReason(), n.isRead(), n.getCreatedAt())).toList(),
                rows.hasNext(), notifications.countByRecipient_UserIdAndReadFalse(userId));
    }

    @Transactional(readOnly = true)
    public long unread() { return notifications.countByRecipient_UserIdAndReadFalse(user().getUserId()); }

    @Transactional
    public void read(Integer id) { var notice = owned(id); notice.setRead(true); events.publishEvent(CommunityRealtimeEvent.notifications(notice.getRecipient().getUserId())); }

    @Transactional
    public void readAll() { var id = user().getUserId(); notifications.readAll(id); events.publishEvent(CommunityRealtimeEvent.notifications(id)); }

    @Transactional
    public int deleteRead() { var id = user().getUserId(); var count = notifications.deleteRead(id); events.publishEvent(CommunityRealtimeEvent.notifications(id)); return count; }

    @Transactional(readOnly = true)
    public String destination(Integer id) {
        var notification = owned(id);
        var viewer = user();
        var post = posts.findById(notification.getPostId())
                .orElseThrow(() -> new ResourceNotFoundException("Bài viết đã bị xóa."));
        boolean owner = post.getAuthor().getUserId().equals(viewer.getUserId());
        if (!owner && post.getStatus() != PostStatus.APPROVED)
            throw new ResourceNotFoundException("Bài viết hiện không còn công khai.");
        String url = "/community?" + (owner ? "view=mine&" : "") + "notification=" + id;
        if (notification.getCommentId() != null) {
            var target = comments.findByCommentIdAndPost_PostId(notification.getCommentId(), post.getPostId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bình luận này đã bị xóa."));
            if (post.getStatus() != PostStatus.APPROVED)
                throw new ResourceNotFoundException("Bình luận hiện không còn khả dụng.");
            int root = target.getParentCommentId() == null ? target.getCommentId() : target.getParentCommentId();
            var rootComment = comments.findByCommentIdAndPost_PostId(root, post.getPostId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bình luận này đã bị xóa."));
            long before = comments.countRootsBefore(post.getPostId(), rootComment.getCreatedAt(), root);
            url += "&comment=" + target.getCommentId() + "&root=" + root + "&commentPage=" + before / 20;
        }
        return url + "#post-" + post.getPostId();
    }

    private CommunityNotification owned(Integer id) {
        return notifications.findByNotificationIdAndRecipient_UserId(id, user().getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo."));
    }
    private User user() {
        var user = auth.getCurrentUser();
        if (user.getStatus() != UserStatus.ACTIVE)
            throw new AppException("Tài khoản không hoạt động.", HttpStatus.FORBIDDEN);
        return user;
    }
}
