package org.hlrcs.repository;

import org.hlrcs.entity.DirectMessageAttachment;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface DirectMessageAttachmentRepository extends JpaRepository<DirectMessageAttachment,Long> {
    interface Metadata {Long getId();String getType();String getFileName();String getContentType();long getByteSize();String getDigest();}
    @Query("select a.id as id,a.type as type,a.fileName as fileName,a.contentType as contentType,a.byteSize as byteSize,a.digest as digest from DirectMessageAttachment a where a.message.id=:id order by a.id")
    List<Metadata> metadata(Long id);
}
