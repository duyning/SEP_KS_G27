package org.hlrcs.repository;
import org.hlrcs.entity.Post;
import org.springframework.data.jpa.repository.*;
import java.util.List;
public interface PostRepository extends JpaRepository<Post, Integer> {
    @EntityGraph(attributePaths = "author")
    List<Post> findAllByOrderByCreatedAtAsc();
}
