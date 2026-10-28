package org.hlrcs.repository;

import org.hlrcs.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Integer> {
    interface PostCount {
        Integer getPostId();
        long getTotal();
    }

    @Query("select c.post.postId as postId, count(c) as total from Comment c where c.post.postId in :ids group by c.post.postId")
    List<PostCount> countForPosts(@Param("ids") List<Integer> ids);

    long countByPost_PostId(Integer postId);

    interface ReplyCount {
        Integer getParentId();
        long getTotal();
    }

    @Query("select c.parentCommentId as parentId, count(c) as total from Comment c where c.parentCommentId in :ids group by c.parentCommentId")
    List<ReplyCount> countForParents(@Param("ids") List<Integer> ids);

    @EntityGraph(attributePaths = "author")
    List<Comment> findByCommentIdIn(List<Integer> ids);

    long countByPost_PostIdAndParentCommentId(Integer postId, Integer parentId);

    @EntityGraph(attributePaths = "author")
    Page<Comment> findByPost_PostIdAndParentCommentIdIsNull(Integer postId, Pageable pageable);

    @EntityGraph(attributePaths = "author")
    Page<Comment> findByPost_PostIdAndParentCommentId(Integer postId, Integer parentId, Pageable pageable);

    @Modifying
    @Query("delete from Comment c where c.post.postId = :postId and c.parentCommentId = :parentId")
    void deleteReplies(@Param("postId") Integer postId, @Param("parentId") Integer parentId);

    @Modifying
    @Query("update Comment c set c.replyToCommentId = null where c.post.postId = :postId and c.replyToCommentId = :id")
    void clearReplyTargets(@Param("postId") Integer postId, @Param("id") Integer id);

    Optional<Comment> findByCommentIdAndPost_PostId(Integer commentId, Integer postId);
}
