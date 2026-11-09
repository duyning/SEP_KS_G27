package org.hlrcs.repository;

import org.hlrcs.entity.PostMedia;
import org.hlrcs.entity.enums.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostMediaRepository extends JpaRepository<PostMedia, Integer> {
    interface Metadata { Integer getMediaId(); String getFileName(); }
    List<PostMedia> findByPost_PostIdOrderByMediaIdAsc(Integer postId);
    List<Metadata> findByPost_PostIdAndMediaTypeAndFileContentIsNotNullOrderByMediaIdAsc(Integer postId, MediaType type);
}
