package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ServiceImage {
    @Lob @Column(name = "image_content", columnDefinition = "LONGBLOB", nullable = false)
    private byte[] content;
    @Column(name = "content_type", length = 100, nullable = false)
    private String contentType;
}
