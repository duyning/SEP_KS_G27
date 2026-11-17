package org.hlrcs.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="host_application_identity") @Getter @Setter @NoArgsConstructor
public class HostApplicationIdentity {
 @Id private Integer applicationId;
 @OneToOne(fetch=FetchType.LAZY) @MapsId @JoinColumn(name="application_id") private HostApplication application;
 @Column(nullable=false,length=32) private String contentType;
 @Lob @Basic(fetch=FetchType.LAZY) @Column(nullable=false,columnDefinition="LONGBLOB") private byte[] content;
 @Column(length=32) private String backContentType;
 @Lob @Basic(fetch=FetchType.LAZY) @Column(columnDefinition="LONGBLOB") private byte[] backContent;
 private java.time.LocalDateTime uploadedAt;
}
