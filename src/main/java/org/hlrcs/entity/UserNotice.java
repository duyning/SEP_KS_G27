package org.hlrcs.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="user_notices", indexes=@Index(name="idx_notice_recipient",columnList="recipient_id,created_at"))
@Getter @Setter @NoArgsConstructor
public class UserNotice {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="recipient_id") private User recipient;
 @Column(nullable=false) private String category;
 @Column(nullable=false) private String kind;
 @Column(nullable=false) private String title;
 @Column(length=4000) private String content;
 @Column(length=4000) private String quote;
 private String target;
 private Integer referenceId;
 private Integer postId;
 private Integer commentId;
 @Column(name="is_read",nullable=false) private boolean read;
 @Column(nullable=false) private LocalDateTime createdAt;
}
