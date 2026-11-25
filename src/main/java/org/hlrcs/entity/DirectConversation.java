package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name="messaging_conversations", uniqueConstraints=@UniqueConstraint(name="uk_messaging_pair",columnNames={"low_user_id","high_user_id"}),
        indexes={@Index(columnList="low_user_id,updated_at"),@Index(columnList="high_user_id,updated_at")})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DirectConversation {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="low_user_id",nullable=false) private User lowUser;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="high_user_id",nullable=false) private User highUser;
    @Column(nullable=false) private long lastSequence;
    @Column(nullable=false) private long lowReadSequence;
    @Column(nullable=false) private long highReadSequence;
    @Column(nullable=false) private LocalDateTime createdAt;
    @Column(nullable=false) private LocalDateTime updatedAt;
}
