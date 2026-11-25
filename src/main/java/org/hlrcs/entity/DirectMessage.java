package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name="messaging_messages",uniqueConstraints={
        @UniqueConstraint(name="uk_message_sequence",columnNames={"conversation_id","message_seq"}),
        @UniqueConstraint(name="uk_message_retry",columnNames={"conversation_id","sender_id","client_message_id"})},
        indexes=@Index(columnList="conversation_id,message_seq"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DirectMessage {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="conversation_id",nullable=false) private DirectConversation conversation;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="sender_id",nullable=false) private User sender;
    @Column(name="message_seq",nullable=false) private long sequenceNumber;
    @Column(name="client_message_id",nullable=false,length=36) private String clientMessageId;
    @Column(nullable=false,length=2000) private String content;
    @Column(length=40) private String contextKind;
    private Integer contextReferenceId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="reply_to_id") private DirectMessage replyTo;
    @Column(nullable=false,updatable=false) private LocalDateTime createdAt;
}
