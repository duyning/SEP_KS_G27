package org.hlrcs.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity
@Table(name="host_applications",uniqueConstraints=@UniqueConstraint(name="uk_host_application_user",columnNames="user_id"))
@Getter @Setter @NoArgsConstructor
public class HostApplication {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
 @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
 @Column(nullable=false,length=40) private String status;
 @Column(nullable=false,length=100) private String targetCommune;
 @Column(nullable=false,length=100) private String expectedScale;
 @Column(nullable=false,length=1000) private String introduction;
 @Column(length=40) private String applicantCapacity;
 @Column(length=30) private String rentalExperience;
 @Column(nullable=false) private boolean agreementAccepted;
 private LocalDateTime submittedAt;
 private LocalDateTime updatedAt;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="reviewed_by") private User reviewedBy;
 private LocalDateTime reviewedAt;
 @Column(length=2000) private String reviewerNote;
 @Column(nullable=false) private boolean allowResubmit=true;
 @Column(name="requested_fields",length=1000) private String requestedFields;
 @Version private Long version;
}
