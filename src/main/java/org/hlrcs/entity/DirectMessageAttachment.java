package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="messaging_attachments",indexes=@Index(columnList="message_id"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DirectMessageAttachment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="message_id",nullable=false) private DirectMessage message;
    @Column(nullable=false,length=10) private String type;
    @Column(nullable=false,length=200) private String fileName;
    @Column(nullable=false,length=50) private String contentType;
    @Column(nullable=false) private long byteSize;
    @Column(nullable=false,length=64) private String digest;
    @Lob @Column(nullable=false,columnDefinition="LONGBLOB") private byte[] content;
}
