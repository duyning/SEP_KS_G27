package org.hlrcs.repository;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.enums.PostStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.*;
import java.util.List;
import java.util.Optional;
public interface PostRepository extends JpaRepository<Post, Integer> {
    long countByAuthor_UserId(Integer userId);
    @EntityGraph(attributePaths = "author")
    List<Post> findAllByOrderByCreatedAtAsc();

    @EntityGraph(attributePaths = {"author", "reviewer"})
    List<Post> findByStatusOrderByCreatedAtDescPostIdDesc(PostStatus status);

    @EntityGraph(attributePaths = {"author", "reviewer"})
    List<Post> findByAuthor_UserIdOrderByCreatedAtDescPostIdDesc(Integer userId);

    @EntityGraph(attributePaths = {"author", "reviewer"})
    List<Post> findAllByOrderByCreatedAtDescPostIdDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Post p where p.postId = :id")
    Optional<Post> findForReview(@Param("id") Integer id);

    @Modifying
    @Query("delete from Comment c where c.post.postId = :id")
    void deleteCommentsForPost(@Param("id") Integer id);

    @Modifying
    @Query("delete from PostMedia m where m.post.postId = :id")
    void deleteMediaForPost(@Param("id") Integer id);

    @Modifying
    @Query("delete from RoommatePostDetail d where d.postId = :id")
    void deleteRoommateDetailForPost(@Param("id") Integer id);

    @Modifying
    @Query("delete from PassRoomPostDetail d where d.postId = :id")
    void deleteRoomTransferDetailForPost(@Param("id") Integer id);

    @Modifying
    @Query("delete from PassItemPostDetail d where d.postId = :id")
    void deleteItemDetailForPost(@Param("id") Integer id);
}
