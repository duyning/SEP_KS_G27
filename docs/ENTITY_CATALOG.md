# HL-RCS — Entity catalog

Đối chiếu source ngày **2026-11-28**: **53 @Entity, 2 @Embeddable và 12 enum độc lập và 6 enum lồng trong entity**. Bao gồm thay đổi hiện có trong working tree; không phải kiểm tra database live.

Danh mục dưới đây thay thế snapshot 2026-11-05. Mỗi trường liệt kê kiểu Java, tên cột khai báo (hoặc suy ra theo snake_case) và annotation nguồn để giữ đầy đủ nullable, length, unique, version, cascade và collection mapping. `—` nghĩa là quan hệ collection, embedded hoặc trường không lưu trực tiếp thành một cột.

`@Entity` không đồng nghĩa tổng số bảng: `@ElementCollection` có bảng riêng. ID scalar như `RentalContract.roomId`, `RoomTenancy.contractId` và `CommunityReportAnalysis.reportId` không được tự suy thành FK JPA. Constraint trên database cũ có thể khác annotation. Trạng thái String phải đọc service/DTO; không coi chúng là Java enum.

## Danh sách entity

| Entity | Bảng | Số trường |
| --- | --- | --- |
| [Amenity](../src/main/java/org/hlrcs/entity/Amenity.java) | `amenities` | 3 |
| [Booking](../src/main/java/org/hlrcs/entity/Booking.java) | `bookings` | 12 |
| [Capability](../src/main/java/org/hlrcs/entity/Capability.java) | `capabilities` | 3 |
| [CollectedPost](../src/main/java/org/hlrcs/entity/CollectedPost.java) | `collected_posts` | 14 |
| [Comment](../src/main/java/org/hlrcs/entity/Comment.java) | `comments` | 8 |
| [CommunityNotification](../src/main/java/org/hlrcs/entity/CommunityNotification.java) | `community_notifications` | 11 |
| [CommunityReportAnalysis](../src/main/java/org/hlrcs/entity/CommunityReportAnalysis.java) | `community_report_analyses` | 15 |
| [CommunityReportEvidence](../src/main/java/org/hlrcs/entity/CommunityReportEvidence.java) | `community_report_evidence` | 5 |
| [CommunityScan](../src/main/java/org/hlrcs/entity/CommunityScan.java) | `community_scans` | 10 |
| [Feedback](../src/main/java/org/hlrcs/entity/Feedback.java) | `feedbacks` | 6 |
| [HostApplication](../src/main/java/org/hlrcs/entity/HostApplication.java) | `host_applications` | 17 |
| [HostApplicationIdentity](../src/main/java/org/hlrcs/entity/HostApplicationIdentity.java) | `host_application_identity` | 7 |
| [ModerationLog](../src/main/java/org/hlrcs/entity/ModerationLog.java) | `moderation_logs` | 7 |
| [PassItemPostDetail](../src/main/java/org/hlrcs/entity/PassItemPostDetail.java) | `pass_item_post_details` | 3 |
| [PassRoomPostDetail](../src/main/java/org/hlrcs/entity/PassRoomPostDetail.java) | `pass_room_post_details` | 8 |
| [PhoneVerification](../src/main/java/org/hlrcs/entity/PhoneVerification.java) | `phone_verifications` | 10 |
| [Post](../src/main/java/org/hlrcs/entity/Post.java) | `posts` | 19 |
| [PostMedia](../src/main/java/org/hlrcs/entity/PostMedia.java) | `post_media` | 7 |
| [Property](../src/main/java/org/hlrcs/entity/Property.java) | `properties` | 13 |
| [PropertyAssignmentEvent](../src/main/java/org/hlrcs/entity/PropertyAssignmentEvent.java) | `property_assignment_events` | 8 |
| [PropertyDocument](../src/main/java/org/hlrcs/entity/PropertyDocument.java) | `property_documents` | 11 |
| [PropertyRegistration](../src/main/java/org/hlrcs/entity/PropertyRegistration.java) | `property_registrations` | 21 |
| [PropertySubmissionEvent](../src/main/java/org/hlrcs/entity/PropertySubmissionEvent.java) | `property_submission_events` | 9 |
| [RegistrationOtp](../src/main/java/org/hlrcs/entity/RegistrationOtp.java) | `registration_otps` | 7 |
| [RentalContract](../src/main/java/org/hlrcs/entity/RentalContract.java) | `rental_contracts` | 16 |
| [Report](../src/main/java/org/hlrcs/entity/Report.java) | `reports` | 12 |
| [Room](../src/main/java/org/hlrcs/entity/Room.java) | `rooms` | 13 |
| [RoomBill](../src/main/java/org/hlrcs/entity/RoomBill.java) | `room_bills` | 22 |
| [RoomBillPayment](../src/main/java/org/hlrcs/entity/RoomBillPayment.java) | `room_bill_payments` | 8 |
| [RoommatePostDetail](../src/main/java/org/hlrcs/entity/RoommatePostDetail.java) | `roommate_post_details` | 7 |
| [RoomOccupant](../src/main/java/org/hlrcs/entity/RoomOccupant.java) | `room_occupants` | 7 |
| [RoomTenancy](../src/main/java/org/hlrcs/entity/RoomTenancy.java) | `room_tenancies` | 15 |
| [RoomType](../src/main/java/org/hlrcs/entity/RoomType.java) | `room_types` | 18 |
| [RoomTypeAmenity](../src/main/java/org/hlrcs/entity/RoomTypeAmenity.java) | `room_type_amenities` | 3 |
| [RoomTypeImage](../src/main/java/org/hlrcs/entity/RoomTypeImage.java) | `room_type_images` | 6 |
| [RoomTypeVideo](../src/main/java/org/hlrcs/entity/RoomTypeVideo.java) | `room_type_videos` | 3 |
| [RoomUtilityReading](../src/main/java/org/hlrcs/entity/RoomUtilityReading.java) | `room_utility_readings` | 19 |
| [Service](../src/main/java/org/hlrcs/entity/Service.java) | `services` | 17 |
| [ServiceCategory](../src/main/java/org/hlrcs/entity/ServiceCategory.java) | `service_categories` | 3 |
| [ServiceComplaint](../src/main/java/org/hlrcs/entity/ServiceComplaint.java) | `service_complaints` | 10 |
| [ServiceComplaintEvent](../src/main/java/org/hlrcs/entity/ServiceComplaintEvent.java) | `service_complaint_events` | 7 |
| [ServiceDocument](../src/main/java/org/hlrcs/entity/ServiceDocument.java) | `service_documents` | 7 |
| [ServiceRating](../src/main/java/org/hlrcs/entity/ServiceRating.java) | `service_ratings` | 9 |
| [ServiceRegistration](../src/main/java/org/hlrcs/entity/ServiceRegistration.java) | `service_registrations` | 33 |
| [ServiceRequest](../src/main/java/org/hlrcs/entity/ServiceRequest.java) | `service_requests` | 14 |
| [SupportLog](../src/main/java/org/hlrcs/entity/SupportLog.java) | `support_logs` | 5 |
| [SupportRequest](../src/main/java/org/hlrcs/entity/SupportRequest.java) | `support_requests` | 8 |
| [User](../src/main/java/org/hlrcs/entity/User.java) | `users` | 15 |
| [UserCapability](../src/main/java/org/hlrcs/entity/UserCapability.java) | `user_capabilities` | 5 |
| [UserNotice](../src/main/java/org/hlrcs/entity/UserNotice.java) | `user_notices` | 13 |
| [VerificationAssignmentQueue](../src/main/java/org/hlrcs/entity/VerificationAssignmentQueue.java) | `verification_assignment_queue` | 1 |
| [ViewingNotification](../src/main/java/org/hlrcs/entity/ViewingNotification.java) | `viewing_notifications` | 7 |
| [Wishlist](../src/main/java/org/hlrcs/entity/Wishlist.java) | `wishlists` | 4 |

## Amenity

Nguồn: [Amenity.java](../src/main/java/org/hlrcs/entity/Amenity.java).

Mapping bảng: `@Table(name = "amenities")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `amenityId` | `Integer` | `amenity_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "amenity_id")` |
| `name` | `String` | `name` | `@Column(name = "name", nullable = false)` |
| `category` | `String` | `category` | `@Column(name = "category")` |

## Booking

Nguồn: [Booking.java](../src/main/java/org/hlrcs/entity/Booking.java).

Mapping bảng: `@Table(name = "bookings")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `bookingId` | `Integer` | `booking_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "booking_id")` |
| `renter` | `User` | `renter_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "renter_id", nullable = false)` |
| `roomType` | `RoomType` | `room_type_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_type_id", nullable = false)` |
| `scheduledDate` | `LocalDateTime` | `scheduled_date` | `@Column(name = "scheduled_date", nullable = false)` |
| `status` | `BookingStatus` | `status` | `@Enumerated(EnumType.STRING) @Column(name = "status", nullable = false)` |
| `note` | `String` | `note` | `@Column(name = "note", columnDefinition = "TEXT")` |
| `contactName` | `String` | `contact_name` | `@Column(name = "contact_name", length = 120)` |
| `contactPhone` | `String` | `contact_phone` | `@Column(name = "contact_phone", length = 20)` |
| `decisionReason` | `String` | `decision_reason` | `@Column(name = "decision_reason", length = 500)` |
| `processedBy` | `User` | `processed_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "processed_by")` |
| `processedAt` | `LocalDateTime` | `processed_at` | `@Column(name = "processed_at")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@Column(name = "created_at", updatable = false)` |

## Capability

Nguồn: [Capability.java](../src/main/java/org/hlrcs/entity/Capability.java).

Mapping bảng: `@Table(name = "capabilities")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `capabilityId` | `Integer` | `capability_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "capability_id")` |
| `name` | `String` | `name` | `@Column(name = "name", nullable = false)` |
| `code` | `String` | `code` | `@Column(name = "code", nullable = false, unique = true)` |

## CollectedPost

Nguồn: [CollectedPost.java](../src/main/java/org/hlrcs/entity/CollectedPost.java).

Mapping bảng: `@Table(name = "collected_posts", indexes = @Index(name = "idx_collected_visibility_id", columnList = "published,id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `externalId` | `String` | `external_id` | `@Column(nullable = false, unique = true, length = 64)` |
| `sourceUrl` | `String` | `source_url` | `@Column(nullable = false, length = 512)` |
| `groupUrl` | `String` | `group_url` | `@Column(nullable = false, length = 512)` |
| `author` | `String` | `author` | `@Column(nullable = false, length = 255)` |
| `caption` | `String` | `caption` | `@Column(nullable = false, columnDefinition = "TEXT")` |
| `images` | `List<String>` | `—` | `@ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "collected_post_images", joinColumns = @JoinColumn(name = "post_id")) @OrderColumn(name = "image_order") @Column(name = "image_url", length = 2048, nullable = false)` |
| `sourcePublishedAt` | `Instant` | `source_published_at` | `@Column(nullable = false)` |
| `collectedAt` | `Instant` | `collected_at` | `@Column(nullable = false)` |
| `published` | `boolean` | `published` | `@Column(nullable = false)` |
| `deleted` | `boolean` | `deleted` | `@Column(nullable = false, columnDefinition = "boolean default false")` |
| `publishedAt` | `Instant` | `published_at` | Mặc định JPA; không có annotation trên trường |
| `collectedBy` | `User` | `collected_by` | `@ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "collected_by", nullable = false)` |
| `publishedBy` | `User` | `published_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "published_by")` |

## Comment

Nguồn: [Comment.java](../src/main/java/org/hlrcs/entity/Comment.java).

Mapping bảng: `@Table(name = "comments", indexes = @Index(name = "idx_comment_thread", columnList = "post_id,parent_comment_id,created_at,comment_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `commentId` | `Integer` | `comment_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "comment_id")` |
| `post` | `Post` | `post_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "post_id", nullable = false)` |
| `author` | `User` | `author_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false)` |
| `content` | `String` | `content` | `@Column(name = "content", columnDefinition = "TEXT", nullable = false)` |
| `parentCommentId` | `Integer` | `parent_comment_id` | `@Column(name = "parent_comment_id")` |
| `replyToCommentId` | `Integer` | `reply_to_comment_id` | `@Column(name = "reply_to_comment_id")` |
| `updatedAt` | `LocalDateTime` | `updated_at` | `@Column(name = "updated_at")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## CommunityNotification

Nguồn: [CommunityNotification.java](../src/main/java/org/hlrcs/entity/CommunityNotification.java).

Mapping bảng: `@Table(name = "community_notifications", uniqueConstraints = @UniqueConstraint( name = "uk_community_notification_event", columnNames = {"recipient_id", "event_key"}), indexes = @Index(name = "idx_community_notification_inbox", columnList = "recipient_id,is_read,notification_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `notificationId` | `Integer` | `notification_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `recipient` | `User` | `recipient_id` | `@ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "recipient_id", nullable = false)` |
| `eventKey` | `String` | `event_key` | `@Column(name = "event_key", nullable = false, length = 100)` |
| `kind` | `String` | `kind` | `@Column(nullable = false, length = 30)` |
| `postId` | `Integer` | `post_id` | `@Column(nullable = false)` |
| `commentId` | `Integer` | `comment_id` | Mặc định JPA; không có annotation trên trường |
| `postTitle` | `String` | `post_title` | `@Column(nullable = false, length = 200)` |
| `actor` | `String` | `actor` | `@Column(length = 200)` |
| `reason` | `String` | `reason` | `@Column(length = 2000)` |
| `read` | `boolean` | `is_read` | `@Column(name = "is_read", nullable = false)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@Column(nullable = false, updatable = false)` |

## CommunityReportAnalysis

Nguồn: [CommunityReportAnalysis.java](../src/main/java/org/hlrcs/entity/CommunityReportAnalysis.java).

Mapping bảng: `@Table(name = "community_report_analyses", indexes = @Index(columnList = "state,report_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `reportId` | `Integer` | `report_id` | `@Id @Column(name = "report_id")` |
| `postId` | `Integer` | `post_id` | `@Column(nullable = false)` |
| `state` | `State` | `state` | `@Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)` |
| `generation` | `int` | `generation` | `@Column(nullable = false)` |
| `fingerprint` | `String` | `fingerprint` | `@Column(length = 64)` |
| `rulesVersion` | `String` | `rules_version` | `@Column(length = 40)` |
| `model` | `String` | `model` | `@Column(length = 100)` |
| `findings` | `String` | `findings` | `@Column(columnDefinition = "TEXT")` |
| `recommendation` | `String` | `recommendation` | `@Column(length = 30)` |
| `errorCode` | `String` | `error_code` | `@Column(length = 40)` |
| `completedChecks` | `int` | `completed_checks` | Mặc định JPA; không có annotation trên trường |
| `totalChecks` | `int` | `total_checks` | Mặc định JPA; không có annotation trên trường |
| `requestedAt` | `LocalDateTime` | `requested_at` | Mặc định JPA; không có annotation trên trường |
| `startedAt` | `LocalDateTime` | `started_at` | Mặc định JPA; không có annotation trên trường |
| `finishedAt` | `LocalDateTime` | `finished_at` | Mặc định JPA; không có annotation trên trường |

## CommunityReportEvidence

Nguồn: [CommunityReportEvidence.java](../src/main/java/org/hlrcs/entity/CommunityReportEvidence.java).

Mapping bảng: `@Table(name = "community_report_evidence")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `reportId` | `Integer` | `report_id` | `@Id` |
| `report` | `Report` | `report_id` | `@MapsId @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "report_id")` |
| `fileName` | `String` | `file_name` | `@Column(nullable = false, length = 200)` |
| `contentType` | `String` | `content_type` | `@Column(nullable = false, length = 40)` |
| `fileContent` | `byte[]` | `file_content` | `@Lob @Column(nullable = false, columnDefinition = "LONGBLOB")` |

## CommunityScan

Nguồn: [CommunityScan.java](../src/main/java/org/hlrcs/entity/CommunityScan.java).

Mapping bảng: `@Table(name = "community_scans", uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "revision"}), indexes = @Index(columnList = "state,id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Integer` | `id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `postId` | `Integer` | `post_id` | `@Column(name = "post_id", nullable = false)` |
| `revision` | `int` | `revision` | `@Column(nullable = false)` |
| `autoEligible` | `boolean` | `auto_eligible` | `@Column(nullable = false)` |
| `state` | `State` | `state` | `@Enumerated(EnumType.STRING) @Column(nullable = false)` |
| `findings` | `String` | `findings` | `@Column(columnDefinition = "TEXT")` |
| `startedAt` | `LocalDateTime` | `started_at` | Mặc định JPA; không có annotation trên trường |
| `finishedAt` | `LocalDateTime` | `finished_at` | Mặc định JPA; không có annotation trên trường |
| `decision` | `PostStatus` | `decision` | `@Enumerated(EnumType.STRING)` |
| `decisionNote` | `String` | `decision_note` | `@Column(length = 2000)` |

## Feedback

Nguồn: [Feedback.java](../src/main/java/org/hlrcs/entity/Feedback.java).

Mapping bảng: `@Table(name = "feedbacks")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `feedbackId` | `Integer` | `feedback_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "feedback_id")` |
| `user` | `User` | `user_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)` |
| `property` | `Property` | `property_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "property_id", nullable = false)` |
| `rating` | `Integer` | `rating` | `@Column(name = "rating", nullable = false)` |
| `content` | `String` | `content` | `@Column(name = "content", columnDefinition = "TEXT")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## HostApplication

Nguồn: [HostApplication.java](../src/main/java/org/hlrcs/entity/HostApplication.java).

Mapping bảng: `@Table(name="host_applications",uniqueConstraints=@UniqueConstraint(name="uk_host_application_user",columnNames="user_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Integer` | `id` | `@Id @GeneratedValue(strategy=GenerationType.IDENTITY)` |
| `user` | `User` | `user_id` | `@OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false)` |
| `status` | `String` | `status` | `@Column(nullable=false,length=40)` |
| `targetCommune` | `String` | `target_commune` | `@Column(length=100)` |
| `expectedScale` | `String` | `expected_scale` | `@Column(length=100)` |
| `introduction` | `String` | `introduction` | `@Column(nullable=false,length=1000)` |
| `applicantCapacity` | `String` | `applicant_capacity` | `@Column(length=40)` |
| `rentalExperience` | `String` | `rental_experience` | `@Column(length=30)` |
| `agreementAccepted` | `boolean` | `agreement_accepted` | `@Column(nullable=false)` |
| `submittedAt` | `LocalDateTime` | `submitted_at` | Mặc định JPA; không có annotation trên trường |
| `updatedAt` | `LocalDateTime` | `updated_at` | Mặc định JPA; không có annotation trên trường |
| `reviewedBy` | `User` | `reviewed_by` | `@ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="reviewed_by")` |
| `reviewedAt` | `LocalDateTime` | `reviewed_at` | Mặc định JPA; không có annotation trên trường |
| `reviewerNote` | `String` | `reviewer_note` | `@Column(length=2000)` |
| `allowResubmit` | `boolean` | `allow_resubmit` | `@Column(nullable=false)` |
| `requestedFields` | `String` | `requested_fields` | `@Column(name="requested_fields",length=1000)` |
| `version` | `Long` | `version` | `@Version` |

## HostApplicationIdentity

Nguồn: [HostApplicationIdentity.java](../src/main/java/org/hlrcs/entity/HostApplicationIdentity.java).

Mapping bảng: `@Table(name="host_application_identity")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `applicationId` | `Integer` | `application_id` | `@Id` |
| `application` | `HostApplication` | `application_id` | `@OneToOne(fetch=FetchType.LAZY) @MapsId @JoinColumn(name="application_id")` |
| `contentType` | `String` | `content_type` | `@Column(nullable=false,length=32)` |
| `content` | `byte[]` | `content` | `@Lob @Basic(fetch=FetchType.LAZY) @Column(nullable=false,columnDefinition="LONGBLOB")` |
| `backContentType` | `String` | `back_content_type` | `@Column(length=32)` |
| `backContent` | `byte[]` | `back_content` | `@Lob @Basic(fetch=FetchType.LAZY) @Column(columnDefinition="LONGBLOB")` |
| `uploadedAt` | `java.time.LocalDateTime` | `uploaded_at` | Mặc định JPA; không có annotation trên trường |

## ModerationLog

Nguồn: [ModerationLog.java](../src/main/java/org/hlrcs/entity/ModerationLog.java).

Mapping bảng: `@Table(name = "moderation_logs")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `logId` | `Integer` | `log_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "log_id")` |
| `staff` | `User` | `staff_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "staff_id", nullable = false)` |
| `targetType` | `String` | `target_type` | `@Column(name = "target_type", nullable = false)` |
| `targetId` | `Integer` | `target_id` | `@Column(name = "target_id", nullable = false)` |
| `action` | `String` | `action` | `@Column(name = "action", nullable = false)` |
| `note` | `String` | `note` | `@Column(name = "note", columnDefinition = "TEXT")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## PassItemPostDetail

Nguồn: [PassItemPostDetail.java](../src/main/java/org/hlrcs/entity/PassItemPostDetail.java).

Mapping bảng: `@Table(name = "pass_item_post_details")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | `@Id @Column(name = "post_id")` |
| `post` | `Post` | `post_id` | `@OneToOne(fetch = FetchType.LAZY) @MapsId @JoinColumn(name = "post_id")` |
| `itemDescription` | `String` | `item_description` | `@Column(name = "item_description", columnDefinition = "TEXT")` |

## PassRoomPostDetail

Nguồn: [PassRoomPostDetail.java](../src/main/java/org/hlrcs/entity/PassRoomPostDetail.java).

Mapping bảng: `@Table(name = "pass_room_post_details")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | `@Id @Column(name = "post_id")` |
| `post` | `Post` | `post_id` | `@OneToOne(fetch = FetchType.LAZY) @MapsId @JoinColumn(name = "post_id")` |
| `property` | `Property` | `property_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "property_id")` |
| `propertyInfo` | `String` | `property_info` | `@Column(name = "property_info", columnDefinition = "TEXT")` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |
| `passReason` | `String` | `pass_reason` | `@Column(name = "pass_reason", columnDefinition = "TEXT")` |
| `availableDate` | `LocalDateTime` | `available_date` | `@Column(name = "available_date")` |
| `contractExpireDate` | `LocalDateTime` | `contract_expire_date` | `@Column(name = "contract_expire_date")` |

## PhoneVerification

Nguồn: [PhoneVerification.java](../src/main/java/org/hlrcs/entity/PhoneVerification.java).

Mapping bảng: `@Table(name = "phone_verifications")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `userId` | `Integer` | `user_id` | `@Id` |
| `phone` | `String` | `phone` | `@Column(length = 16)` |
| `providerSid` | `String` | `provider_sid` | `@Column(length = 40)` |
| `otpHash` | `String` | `otp_hash` | `@Column(length = 100)` |
| `sentAt` | `Instant` | `sent_at` | Mặc định JPA; không có annotation trên trường |
| `expiresAt` | `Instant` | `expires_at` | Mặc định JPA; không có annotation trên trường |
| `verifiedAt` | `Instant` | `verified_at` | Mặc định JPA; không có annotation trên trường |
| `windowStart` | `Instant` | `window_start` | Mặc định JPA; không có annotation trên trường |
| `sends` | `int` | `sends` | Mặc định JPA; không có annotation trên trường |
| `attempts` | `int` | `attempts` | Mặc định JPA; không có annotation trên trường |

## Post

Nguồn: [Post.java](../src/main/java/org/hlrcs/entity/Post.java).

Mapping bảng: `@Table(name = "posts")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "post_id")` |
| `author` | `User` | `author_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false)` |
| `postType` | `PostType` | `post_type` | `@Enumerated(EnumType.STRING) @Column(name = "post_type", nullable = false)` |
| `title` | `String` | `title` | `@Column(name = "title", nullable = false)` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |
| `contentFormat` | `String` | `content_format` | `@Column(name = "content_format", columnDefinition = "MEDIUMTEXT")` |
| `price` | `BigDecimal` | `price` | `@Column(name = "price", precision = 12, scale = 0)` |
| `location` | `String` | `location` | `@Column(name = "location", length = 255)` |
| `contactName` | `String` | `contact_name` | `@Column(name = "contact_name", length = 100)` |
| `contactPhone` | `String` | `contact_phone` | `@Column(name = "contact_phone", length = 20)` |
| `facebookUrl` | `String` | `facebook_url` | `@Column(name = "facebook_url", length = 500)` |
| `zaloUrl` | `String` | `zalo_url` | `@Column(name = "zalo_url", length = 500)` |
| `reviewNote` | `String` | `review_note` | `@Column(name = "review_note", length = 2000)` |
| `status` | `PostStatus` | `status` | `@Enumerated(EnumType.STRING) @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR) @Column(name = "status", nullable = false, length = 50)` |
| `reviewer` | `User` | `reviewed_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reviewed_by")` |
| `reviewedAt` | `LocalDateTime` | `reviewed_at` | `@Column(name = "reviewed_at")` |
| `submissionRevision` | `Integer` | `submission_revision` | Mặc định JPA; không có annotation trên trường |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |
| `updatedAt` | `LocalDateTime` | `updated_at` | `@UpdateTimestamp @Column(name = "updated_at")` |

## PostMedia

Nguồn: [PostMedia.java](../src/main/java/org/hlrcs/entity/PostMedia.java).

Mapping bảng: `@Table(name = "post_media")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `mediaId` | `Integer` | `media_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "media_id")` |
| `post` | `Post` | `post_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "post_id", nullable = false)` |
| `mediaType` | `MediaType` | `media_type` | `@Enumerated(EnumType.STRING) @Column(name = "media_type", nullable = false)` |
| `mediaUrl` | `String` | `media_url` | `@Column(name = "media_url", nullable = false)` |
| `fileName` | `String` | `file_name` | `@Column(length = 200)` |
| `contentType` | `String` | `content_type` | Mặc định JPA; không có annotation trên trường |
| `fileContent` | `byte[]` | `file_content` | `@Lob @Column(columnDefinition = "LONGBLOB")` |

## Property

Nguồn: [Property.java](../src/main/java/org/hlrcs/entity/Property.java).

Mapping bảng: `@Table(name = "properties")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `propertyId` | `Integer` | `property_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "property_id")` |
| `owner` | `User` | `owner_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "owner_id", nullable = false)` |
| `registration` | `PropertyRegistration` | `registration_id` | `@OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "registration_id")` |
| `name` | `String` | `name` | `@Column(name = "name", nullable = false)` |
| `address` | `String` | `address` | `@Column(name = "address")` |
| `contactInfo` | `String` | `contact_info` | `@Column(name = "contact_info")` |
| `googleMapLink` | `String` | `google_map_link` | `@Column(name = "google_map_link")` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |
| `status` | `String` | `status` | `@Column(name = "status")` |
| `reverificationRequired` | `boolean` | `reverification_required` | `@Builder.Default @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")` |
| `reverificationReasonsJson` | `String` | `reverification_reasons_json` | `@Column(columnDefinition = "TEXT")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |
| `updatedAt` | `LocalDateTime` | `updated_at` | `@UpdateTimestamp @Column(name = "updated_at")` |

## PropertyAssignmentEvent

Nguồn: [PropertyAssignmentEvent.java](../src/main/java/org/hlrcs/entity/PropertyAssignmentEvent.java).

Mapping bảng: `@Table(name = "property_assignment_events", uniqueConstraints = @UniqueConstraint(columnNames = {"registration_id", "assignment_version"}))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `eventId` | `Long` | `event_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `registration` | `PropertyRegistration` | `registration_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "registration_id", nullable = false)` |
| `assignmentVersion` | `long` | `assignment_version` | `@Column(name = "assignment_version", nullable = false)` |
| `previousStaffId` | `Integer` | `previous_staff_id` | Mặc định JPA; không có annotation trên trường |
| `newStaffId` | `Integer` | `new_staff_id` | Mặc định JPA; không có annotation trên trường |
| `actor` | `String` | `actor` | `@Column(nullable = false, length = 100)` |
| `action` | `String` | `action` | `@Column(nullable = false, length = 20)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(nullable = false, updatable = false)` |

## PropertyDocument

Nguồn: [PropertyDocument.java](../src/main/java/org/hlrcs/entity/PropertyDocument.java).

Mapping bảng: `@Table(name = "property_documents")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `documentId` | `Integer` | `document_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "document_id")` |
| `registration` | `PropertyRegistration` | `registration_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "registration_id", nullable = false)` |
| `documentType` | `String` | `document_type` | `@Column(name = "document_type")` |
| `documentUrl` | `String` | `document_url` | `@Column(name = "document_url")` |
| `verificationStatus` | `String` | `verification_status` | `@Column(name = "verification_status")` |
| `fileName` | `String` | `file_name` | `@Column(name = "file_name")` |
| `contentType` | `String` | `content_type` | `@Column(name = "content_type")` |
| `fileSize` | `Long` | `file_size` | `@Column(name = "file_size")` |
| `archivedAt` | `java.time.LocalDateTime` | `archived_at` | `@Column(columnDefinition = "DATETIME(6)")` |
| `uploadedAt` | `java.time.LocalDateTime` | `uploaded_at` | `@org.hibernate.annotations.CreationTimestamp @Column(name = "uploaded_at", updatable = false, columnDefinition = "DATETIME(6)")` |
| `fileContent` | `byte[]` | `file_content` | `@Lob @Basic(fetch = FetchType.LAZY) @Column(name = "file_content", columnDefinition = "LONGBLOB")` |

## PropertyRegistration

Nguồn: [PropertyRegistration.java](../src/main/java/org/hlrcs/entity/PropertyRegistration.java).

Mapping bảng: `@Table(name = "property_registrations", indexes = @Index(name = "idx_property_assignment_queue", columnList = "assigned_staff_id,created_at"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `registrationId` | `Integer` | `registration_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "registration_id")` |
| `user` | `User` | `user_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)` |
| `name` | `String` | `name` | `@Column(name = "name", nullable = false)` |
| `address` | `String` | `address` | `@Column(name = "address")` |
| `contactInfo` | `String` | `contact_info` | `@Column(name = "contact_info")` |
| `googleMapLink` | `String` | `google_map_link` | `@Column(name = "google_map_link")` |
| `status` | `RegistrationStatus` | `status` | `@Enumerated(EnumType.STRING) @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR) @Column(name = "status", nullable = false, length = 50)` |
| `targetPropertyId` | `Integer` | `target_property_id` | Mặc định JPA; không có annotation trên trường |
| `baseRegistrationId` | `Integer` | `base_registration_id` | Mặc định JPA; không có annotation trên trường |
| `hostOnboarding` | `boolean` | `host_onboarding` | `@Builder.Default @Column(nullable = false, columnDefinition = "boolean default false")` |
| `reverificationReasonsJson` | `String` | `reverification_reasons_json` | `@Column(columnDefinition = "TEXT")` |
| `requestedFieldsJson` | `String` | `requested_fields_json` | `@Column(columnDefinition = "TEXT")` |
| `fieldNotesJson` | `String` | `field_notes_json` | `@Column(columnDefinition = "TEXT")` |
| `submittedAt` | `LocalDateTime` | `submitted_at` | `@Column(columnDefinition = "DATETIME(6)")` |
| `reviewer` | `User` | `reviewed_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reviewed_by")` |
| `assignedStaff` | `User` | `assigned_staff_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assigned_staff_id")` |
| `assignmentVersion` | `long` | `assignment_version` | `@Builder.Default @Column(name = "assignment_version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")` |
| `reasonNote` | `String` | `reason_note` | `@Column(name = "reason_note", columnDefinition = "TEXT")` |
| `registrationDetails` | `String` | `registration_details` | `@Column(name = "registration_details", columnDefinition = "TEXT")` |
| `reviewedAt` | `LocalDateTime` | `reviewed_at` | `@Column(name = "reviewed_at")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## PropertySubmissionEvent

Nguồn: [PropertySubmissionEvent.java](../src/main/java/org/hlrcs/entity/PropertySubmissionEvent.java).

Mapping bảng: `@Table(name="property_submission_events")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `eventId` | `Integer` | `event_id` | `@Id @GeneratedValue(strategy=GenerationType.IDENTITY)` |
| `registration` | `PropertyRegistration` | `registration_id` | `@ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="registration_id",nullable=false)` |
| `actor` | `User` | `actor_id` | `@ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_id",nullable=false)` |
| `action` | `String` | `action` | `@Column(nullable=false)` |
| `previousDetails` | `String` | `previous_details` | `@Column(columnDefinition="TEXT")` |
| `submittedDetails` | `String` | `submitted_details` | `@Column(columnDefinition="TEXT")` |
| `previousDocumentIds` | `String` | `previous_document_ids` | `@Column(columnDefinition="TEXT")` |
| `previousReviewNote` | `String` | `previous_review_note` | `@Column(columnDefinition="TEXT")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@org.hibernate.annotations.CreationTimestamp` |

## RegistrationOtp

Nguồn: [RegistrationOtp.java](../src/main/java/org/hlrcs/entity/RegistrationOtp.java).

Mapping bảng: `@Table(name = "registration_otps")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `String` | `id` | `@Id @Column(length = 64)` |
| `version` | `Long` | `version` | `@Version` |
| `secretHash` | `String` | `secret_hash` | `@Column(length = 100)` |
| `sentAt` | `Instant` | `sent_at` | `@Column(nullable = false)` |
| `expiresAt` | `Instant` | `expires_at` | `@Column(nullable = false)` |
| `failedAttempts` | `int` | `failed_attempts` | `@Column(nullable = false)` |
| `verified` | `boolean` | `verified` | `@Column(nullable = false)` |

## RentalContract

Nguồn: [RentalContract.java](../src/main/java/org/hlrcs/entity/RentalContract.java).

Mapping bảng: `@Table(name="rental_contracts",indexes=@Index(name="ix_rental_contract_room_owner",columnList="room_id,owner_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy=GenerationType.IDENTITY)` |
| `roomId` | `Integer` | `room_id` | `@Column(name="room_id",nullable=false)` |
| `ownerId` | `Integer` | `owner_id` | `@Column(name="owner_id",nullable=false)` |
| `status` | `String` | `status` | `@Column(nullable=false,length=20)` |
| `propertyName` | `String` | `property_name` | `@Column(nullable=false,length=150)` |
| `propertyAddress` | `String` | `property_address` | `@Column(length=500)` |
| `roomNumber` | `String` | `room_number` | `@Column(nullable=false,length=30)` |
| `startDate` | `LocalDate` | `start_date` | `@Column(nullable=false)` |
| `endDate` | `LocalDate` | `end_date` | `@Column(nullable=false)` |
| `detailsJson` | `String` | `details_json` | `@Column(nullable=false,columnDefinition="MEDIUMTEXT")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp` |
| `closedAt` | `LocalDateTime` | `closed_at` | Mặc định JPA; không có annotation trên trường |
| `signingTokenHash` | `String` | `signing_token_hash` | `@Column(length=64, unique=true)` |
| `signingLinkExpiresAt` | `Instant` | `signing_link_expires_at` | Mặc định JPA; không có annotation trên trường |
| `ownerSignatureJson` | `String` | `owner_signature_json` | `@Column(columnDefinition="MEDIUMTEXT")` |
| `tenantSignatureJson` | `String` | `tenant_signature_json` | `@Column(columnDefinition="MEDIUMTEXT")` |

## Report

Nguồn: [Report.java](../src/main/java/org/hlrcs/entity/Report.java).

Mapping bảng: `@Table(name = "reports", indexes = { @Index(name = "idx_report_target", columnList = "target_type,target_id"), @Index(name = "idx_report_queue", columnList = "target_type,status,created_at") })`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `reportId` | `Integer` | `report_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "report_id")` |
| `reporter` | `User` | `reporter_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reporter_id", nullable = false)` |
| `targetType` | `ReportTargetType` | `target_type` | `@Enumerated(EnumType.STRING) @Column(name = "target_type", nullable = false)` |
| `targetId` | `Integer` | `target_id` | `@Column(name = "target_id", nullable = false)` |
| `reason` | `String` | `reason` | `@Column(name = "reason", columnDefinition = "TEXT")` |
| `reasonCode` | `String` | `reason_code` | `@Column(length = 40)` |
| `postTitle` | `String` | `post_title` | Mặc định JPA; không có annotation trên trường |
| `status` | `ReportStatus` | `status` | `@Enumerated(EnumType.STRING) @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR) @Column(name = "status", nullable = false, length = 50)` |
| `handler` | `User` | `handler_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "handler_id")` |
| `resolutionNote` | `String` | `resolution_note` | `@Column(length = 1000)` |
| `resolvedAt` | `LocalDateTime` | `resolved_at` | Mặc định JPA; không có annotation trên trường |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## Room

Nguồn: [Room.java](../src/main/java/org/hlrcs/entity/Room.java).

Mapping bảng: `@Table(name="rooms",uniqueConstraints=@UniqueConstraint(name="uk_room_property_number",columnNames={"property_id","room_number"}))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `roomId` | `Integer` | `room_id` | `@Id @GeneratedValue(strategy=GenerationType.IDENTITY)` |
| `property` | `Property` | `property_id` | `@ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="property_id",nullable=false)` |
| `roomType` | `RoomType` | `room_type_id` | `@ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="room_type_id",nullable=false)` |
| `roomNumber` | `String` | `room_number` | `@Column(name="room_number",nullable=false,length=30)` |
| `floor` | `String` | `floor` | `@Column(nullable=false,length=50)` |
| `status` | `String` | `status` | `@Column(nullable=false,length=20)` |
| `customPrice` | `BigDecimal` | `custom_price` | `@Column(precision=12,scale=2)` |
| `publicVisible` | `boolean` | `public_visible` | `@Builder.Default @Column(nullable=false, columnDefinition="boolean default false")` |
| `confirmedAt` | `LocalDateTime` | `confirmed_at` | Mặc định JPA; không có annotation trên trường |
| `leaseStartDate` | `java.time.LocalDate` | `lease_start_date` | Mặc định JPA; không có annotation trên trường |
| `leaseEndDate` | `java.time.LocalDate` | `lease_end_date` | Mặc định JPA; không có annotation trên trường |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp` |
| `updatedAt` | `LocalDateTime` | `updated_at` | `@UpdateTimestamp` |

## RoomBill

Nguồn: [RoomBill.java](../src/main/java/org/hlrcs/entity/RoomBill.java).

Mapping bảng: `@Table(name = "room_bills", uniqueConstraints = @UniqueConstraint(name = "uk_room_bill_period_kind", columnNames = {"tenancy_id", "billing_month", "kind"}), indexes = @Index(name = "ix_room_bill_property_period", columnList = "owner_id,property_id,billing_month"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `revision` | `Long` | `revision` | `@Version` |
| `ownerId` | `Integer` | `owner_id` | `@Column(name = "owner_id", nullable = false)` |
| `propertyId` | `Integer` | `property_id` | `@Column(name = "property_id", nullable = false)` |
| `roomId` | `Integer` | `room_id` | `@Column(nullable = false)` |
| `tenancyId` | `Long` | `tenancy_id` | `@Column(name = "tenancy_id", nullable = false)` |
| `roomNumber` | `String` | `room_number` | `@Column(nullable = false, length = 30)` |
| `tenantName` | `String` | `tenant_name` | `@Column(nullable = false, length = 150)` |
| `billingMonth` | `LocalDate` | `billing_month` | `@Column(name = "billing_month", nullable = false)` |
| `kind` | `Kind` | `kind` | `@Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)` |
| `dueDate` | `LocalDate` | `due_date` | `@Column(nullable = false)` |
| `rentFrom` | `LocalDate` | `rent_from` | Mặc định JPA; không có annotation trên trường |
| `rentThrough` | `LocalDate` | `rent_through` | Mặc định JPA; không có annotation trên trường |
| `rentAmount` | `BigDecimal` | `rent_amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `utilityReadingId` | `Long` | `utility_reading_id` | `@Column(unique = true)` |
| `utilityRevision` | `Long` | `utility_revision` | Mặc định JPA; không có annotation trên trường |
| `electricityAmount` | `BigDecimal` | `electricity_amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `waterAmount` | `BigDecimal` | `water_amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `chargesJson` | `String` | `charges_json` | `@Column(nullable = false, columnDefinition = "TEXT")` |
| `totalAmount` | `BigDecimal` | `total_amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `paidAmount` | `BigDecimal` | `paid_amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `issuedAt` | `Instant` | `issued_at` | Mặc định JPA; không có annotation trên trường |

## RoomBillPayment

Nguồn: [RoomBillPayment.java](../src/main/java/org/hlrcs/entity/RoomBillPayment.java).

Mapping bảng: `@Table(name = "room_bill_payments", uniqueConstraints = @UniqueConstraint(name = "uk_room_bill_payment_request", columnNames = {"bill_id", "request_key"}))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `billId` | `Long` | `bill_id` | `@Column(name = "bill_id", nullable = false)` |
| `requestKey` | `String` | `request_key` | `@Column(name = "request_key", nullable = false, length = 36)` |
| `amount` | `BigDecimal` | `amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `paidOn` | `LocalDate` | `paid_on` | `@Column(nullable = false)` |
| `method` | `Method` | `method` | `@Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)` |
| `note` | `String` | `note` | `@Column(length = 400)` |
| `recordedAt` | `Instant` | `recorded_at` | `@Column(nullable = false)` |

## RoommatePostDetail

Nguồn: [RoommatePostDetail.java](../src/main/java/org/hlrcs/entity/RoommatePostDetail.java).

Mapping bảng: `@Table(name = "roommate_post_details")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | `@Id @Column(name = "post_id")` |
| `post` | `Post` | `post_id` | `@OneToOne(fetch = FetchType.LAZY) @MapsId @JoinColumn(name = "post_id")` |
| `roommateType` | `RoommateType` | `roommate_type` | `@Enumerated(EnumType.STRING) @Column(name = "roommate_type")` |
| `requirements` | `String` | `requirements` | `@Column(name = "requirements", columnDefinition = "TEXT")` |
| `location` | `String` | `location` | `@Column(name = "location")` |
| `property` | `Property` | `property_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "property_id")` |
| `propertyDescription` | `String` | `property_description` | `@Column(name = "property_description", columnDefinition = "TEXT")` |

## RoomOccupant

Nguồn: [RoomOccupant.java](../src/main/java/org/hlrcs/entity/RoomOccupant.java).

Mapping bảng: `@Table(name = "room_occupants", indexes = @Index(name = "ix_occupant_tenancy", columnList = "tenancy_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `tenancy` | `RoomTenancy` | `tenancy_id` | `@ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "tenancy_id", nullable = false)` |
| `name` | `String` | `name` | `@Column(nullable = false, length = 150)` |
| `phone` | `String` | `phone` | `@Column(length = 30)` |
| `joinedOn` | `LocalDate` | `joined_on` | `@Column(nullable = false)` |
| `leftOn` | `LocalDate` | `left_on` | Mặc định JPA; không có annotation trên trường |
| `primaryTenant` | `boolean` | `primary_tenant` | `@Column(nullable = false)` |

## RoomTenancy

Nguồn: [RoomTenancy.java](../src/main/java/org/hlrcs/entity/RoomTenancy.java).

Mapping bảng: `@Table(name = "room_tenancies", indexes = @Index(name = "ix_tenancy_room_owner", columnList = "room_id,owner_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `roomId` | `Integer` | `room_id` | `@Column(name = "room_id", nullable = false)` |
| `ownerId` | `Integer` | `owner_id` | `@Column(name = "owner_id", nullable = false)` |
| `activeRoomId` | `Integer` | `active_room_id` | `@Column(unique = true)` |
| `contractId` | `Long` | `contract_id` | `@Column(unique = true)` |
| `startDate` | `LocalDate` | `start_date` | `@Column(nullable = false)` |
| `endDate` | `LocalDate` | `end_date` | `@Column(nullable = false)` |
| `closedDate` | `LocalDate` | `closed_date` | Mặc định JPA; không có annotation trên trường |
| `monthlyRent` | `BigDecimal` | `monthly_rent` | `@Column(precision = 12, scale = 2)` |
| `deposit` | `BigDecimal` | `deposit` | `@Column(precision = 12, scale = 2)` |
| `rentCycleMonths` | `Integer` | `rent_cycle_months` | Mặc định JPA; không có annotation trên trường |
| `rentDueDay` | `Integer` | `rent_due_day` | Mặc định JPA; không có annotation trên trường |
| `firstRentDueDate` | `LocalDate` | `first_rent_due_date` | Mặc định JPA; không có annotation trên trường |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp` |
| `occupants` | `List<RoomOccupant>` | `—` | `@OneToMany(mappedBy = "tenancy", cascade = CascadeType.PERSIST) @OrderBy("id ASC")` |

## RoomType

Nguồn: [RoomType.java](../src/main/java/org/hlrcs/entity/RoomType.java).

Mapping bảng: `@Table(name = "room_types")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `roomTypeId` | `Integer` | `room_type_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "room_type_id")` |
| `property` | `Property` | `property_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "property_id", nullable = false)` |
| `roomType` | `String` | `room_type` | `@Column(name = "room_type", nullable = false)` |
| `price` | `BigDecimal` | `price` | `@Column(name = "price", precision = 12, scale = 2)` |
| `areaSqm` | `Float` | `area_sqm` | `@Column(name = "area_sqm")` |
| `servicePrice` | `BigDecimal` | `service_price` | `@Column(name = "service_price", precision = 12, scale = 2)` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |
| `capacity` | `Integer` | `capacity` | Mặc định JPA; không có annotation trên trường |
| `availabilityConfirmedAt` | `java.time.Instant` | `availability_confirmed_at` | Mặc định JPA; không có annotation trên trường |
| `availabilityConfirmedBy` | `User` | `availability_confirmed_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "availability_confirmed_by")` |
| `deposit` | `BigDecimal` | `deposit` | `@Column(precision = 12, scale = 2)` |
| `imageUrl` | `String` | `image_url` | `@Column(length = 1000)` |
| `amenitiesJson` | `String` | `amenities_json` | `@Column(columnDefinition = "TEXT")` |
| `electricityPrice` | `BigDecimal` | `electricity_price` | `@Column(precision = 12, scale = 2)` |
| `waterPrice` | `BigDecimal` | `water_price` | `@Column(precision = 12, scale = 2)` |
| `internetPrice` | `BigDecimal` | `internet_price` | `@Column(precision = 12, scale = 2)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |
| `updatedAt` | `LocalDateTime` | `updated_at` | `@UpdateTimestamp @Column(name = "updated_at")` |

## RoomTypeAmenity

Nguồn: [RoomTypeAmenity.java](../src/main/java/org/hlrcs/entity/RoomTypeAmenity.java).

Mapping bảng: `@Table(name = "room_type_amenities")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `RoomTypeAmenityId` | `—` | `@EmbeddedId` |
| `roomType` | `RoomType` | `room_type_id` | `@ManyToOne(fetch = FetchType.LAZY) @MapsId("roomTypeId") @JoinColumn(name = "room_type_id", nullable = false)` |
| `amenity` | `Amenity` | `amenity_id` | `@ManyToOne(fetch = FetchType.LAZY) @MapsId("amenityId") @JoinColumn(name = "amenity_id", nullable = false)` |

## RoomTypeAmenityId

Nguồn: [RoomTypeAmenityId.java](../src/main/java/org/hlrcs/entity/RoomTypeAmenityId.java).

Embeddable: không phải entity/bảng độc lập.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `roomTypeId` | `Integer` | `room_type_id` | `@Column(name = "room_type_id")` |
| `amenityId` | `Integer` | `amenity_id` | `@Column(name = "amenity_id")` |

## RoomTypeImage

Nguồn: [RoomTypeImage.java](../src/main/java/org/hlrcs/entity/RoomTypeImage.java).

Mapping bảng: `@Table(name = "room_type_images")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `imageId` | `Integer` | `image_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "image_id")` |
| `roomType` | `RoomType` | `room_type_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_type_id", nullable = false)` |
| `imageUrl` | `String` | `image_url` | `@Column(name = "image_url", nullable = false)` |
| `fileName` | `String` | `file_name` | `@Column(length = 200)` |
| `contentType` | `String` | `content_type` | Mặc định JPA; không có annotation trên trường |
| `fileContent` | `byte[]` | `file_content` | `@Lob @Column(columnDefinition = "LONGBLOB")` |

## RoomTypeVideo

Nguồn: [RoomTypeVideo.java](../src/main/java/org/hlrcs/entity/RoomTypeVideo.java).

Mapping bảng: `@Table(name = "room_type_videos")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `videoId` | `Integer` | `video_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "video_id")` |
| `roomType` | `RoomType` | `room_type_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_type_id", nullable = false)` |
| `videoUrl` | `String` | `video_url` | `@Column(name = "video_url", nullable = false)` |

## RoomUtilityReading

Nguồn: [RoomUtilityReading.java](../src/main/java/org/hlrcs/entity/RoomUtilityReading.java).

Mapping bảng: `@Table(name = "room_utility_readings", uniqueConstraints = @UniqueConstraint(name = "uk_room_utility_tenancy_month", columnNames = {"tenancy_id", "billing_month"}), indexes = @Index(name = "ix_room_utility_room_month", columnList = "room_id,billing_month"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `revision` | `Long` | `revision` | `@Version` |
| `tenancyId` | `Long` | `tenancy_id` | `@Column(name = "tenancy_id", nullable = false)` |
| `roomId` | `Integer` | `room_id` | `@Column(name = "room_id", nullable = false)` |
| `ownerId` | `Integer` | `owner_id` | `@Column(nullable = false)` |
| `billingMonth` | `LocalDate` | `billing_month` | `@Column(name = "billing_month", nullable = false)` |
| `periodStart` | `LocalDate` | `period_start` | `@Column(nullable = false)` |
| `readOn` | `LocalDate` | `read_on` | `@Column(nullable = false)` |
| `electricityStart` | `BigDecimal` | `electricity_start` | `@Column(nullable = false, precision = 12, scale = 3)` |
| `electricityEnd` | `BigDecimal` | `electricity_end` | `@Column(nullable = false, precision = 12, scale = 3)` |
| `electricityRate` | `BigDecimal` | `electricity_rate` | `@Column(nullable = false, precision = 9, scale = 0)` |
| `electricityAmount` | `BigDecimal` | `electricity_amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `waterMode` | `WaterMode` | `water_mode` | `@Enumerated(EnumType.STRING) @Column(nullable = false, length = 14)` |
| `waterStart` | `BigDecimal` | `water_start` | `@Column(precision = 12, scale = 3)` |
| `waterEnd` | `BigDecimal` | `water_end` | `@Column(precision = 12, scale = 3)` |
| `waterRate` | `BigDecimal` | `water_rate` | `@Column(nullable = false, precision = 9, scale = 0)` |
| `occupantCount` | `Integer` | `occupant_count` | Mặc định JPA; không có annotation trên trường |
| `waterAmount` | `BigDecimal` | `water_amount` | `@Column(nullable = false, precision = 20, scale = 0)` |
| `updatedAt` | `LocalDateTime` | `updated_at` | `@UpdateTimestamp` |

## Service

Nguồn: [Service.java](../src/main/java/org/hlrcs/entity/Service.java).

Mapping bảng: `@Table(name = "services")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `serviceId` | `Integer` | `service_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "service_id")` |
| `provider` | `User` | `provider_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "provider_id", nullable = false)` |
| `category` | `ServiceCategory` | `category_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id", nullable = false)` |
| `registration` | `ServiceRegistration` | `registration_id` | `@OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "registration_id")` |
| `serviceName` | `String` | `service_name` | `@Column(name = "service_name", nullable = false)` |
| `contactInfo` | `String` | `contact_info` | `@Column(name = "contact_info")` |
| `contactEmail` | `String` | `contact_email` | `@Column(name = "contact_email")` |
| `pricingType` | `String` | `pricing_type` | `@Column(name = "pricing_type", length = 20)` |
| `serviceArea` | `String` | `service_area` | `@Column(name = "service_area", length = 500)` |
| `customServiceAreas` | `String` | `custom_service_areas` | `@Column(name = "custom_service_areas", length = 600)` |
| `price` | `BigDecimal` | `price` | `@Column(name = "price", precision = 12, scale = 2)` |
| `priceUnit` | `String` | `price_unit` | `@Column(name = "price_unit", length = 20)` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |
| `status` | `String` | `status` | `@Column(name = "status")` |
| `moderationHidden` | `boolean` | `moderation_hidden` | `@Column(nullable = false, columnDefinition = "boolean default false") @Builder.Default` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |
| `revision` | `int` | `revision` | `@Column(nullable = false, columnDefinition = "integer default 0") @Builder.Default` |

## ServiceCategory

Nguồn: [ServiceCategory.java](../src/main/java/org/hlrcs/entity/ServiceCategory.java).

Mapping bảng: `@Table(name = "service_categories")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `categoryId` | `Integer` | `category_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "category_id")` |
| `name` | `String` | `name` | `@Column(name = "name", nullable = false)` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |

## ServiceComplaint

Nguồn: [ServiceComplaint.java](../src/main/java/org/hlrcs/entity/ServiceComplaint.java).

Mapping bảng: `@Table(name = "service_complaints")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `complaintId` | `Integer` | `complaint_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `service` | `Service` | `service_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_id", nullable = false)` |
| `reporter` | `User` | `reporter_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reporter_id", nullable = false)` |
| `content` | `String` | `content` | `@Column(nullable = false, length = 3000)` |
| `status` | `String` | `status` | `@Column(nullable = false, length = 30)` |
| `outcome` | `String` | `outcome` | `@Column(length = 20)` |
| `responseRequested` | `Boolean` | `response_requested` | Mặc định JPA; không có annotation trên trường |
| `createdAt` | `Instant` | `created_at` | `@Column(nullable = false)` |
| `revision` | `int` | `revision` | `@Column(nullable = false)` |
| `images` | `List<ServiceImage>` | `—` | `@ElementCollection @CollectionTable(name = "service_complaint_images", joinColumns = @JoinColumn(name = "complaint_id")) @OrderColumn(name = "image_position")` |

## ServiceComplaintEvent

Nguồn: [ServiceComplaintEvent.java](../src/main/java/org/hlrcs/entity/ServiceComplaintEvent.java).

Mapping bảng: `@Table(name = "service_complaint_events")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `eventId` | `Integer` | `event_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `complaint` | `ServiceComplaint` | `complaint_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "complaint_id", nullable = false)` |
| `actor` | `User` | `actor_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "actor_id", nullable = false)` |
| `action` | `String` | `action` | `@Column(nullable = false, length = 30)` |
| `content` | `String` | `content` | `@Column(nullable = false, length = 3000)` |
| `createdAt` | `Instant` | `created_at` | `@Column(nullable = false)` |
| `images` | `List<ServiceImage>` | `—` | `@ElementCollection @CollectionTable(name = "service_complaint_event_images", joinColumns = @JoinColumn(name = "event_id")) @OrderColumn(name = "image_position")` |

## ServiceDocument

Nguồn: [ServiceDocument.java](../src/main/java/org/hlrcs/entity/ServiceDocument.java).

Mapping bảng: `@Table(name = "service_documents")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `documentId` | `Integer` | `document_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "document_id")` |
| `registration` | `ServiceRegistration` | `registration_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "registration_id", nullable = false)` |
| `documentName` | `String` | `document_name` | `@Column(name = "document_name")` |
| `documentUrl` | `String` | `document_url` | `@Column(name = "document_url")` |
| `verificationStatus` | `String` | `verification_status` | `@Column(name = "verification_status")` |
| `contentType` | `String` | `content_type` | `@Column(name = "content_type", length = 100)` |
| `fileContent` | `byte[]` | `file_content` | `@Lob @Column(name = "file_content", columnDefinition = "LONGBLOB")` |

## ServiceImage

Nguồn: [ServiceImage.java](../src/main/java/org/hlrcs/entity/ServiceImage.java).

Embeddable: không phải entity/bảng độc lập.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `content` | `byte[]` | `image_content` | `@Lob @Column(name = "image_content", columnDefinition = "LONGBLOB", nullable = false)` |
| `contentType` | `String` | `content_type` | `@Column(name = "content_type", length = 100, nullable = false)` |

## ServiceRating

Nguồn: [ServiceRating.java](../src/main/java/org/hlrcs/entity/ServiceRating.java).

Mapping bảng: `@Table(name = "service_ratings", uniqueConstraints = @UniqueConstraint(name = "uk_service_rating_author", columnNames = {"service_id", "author_id"}))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `ratingId` | `Integer` | `rating_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `service` | `Service` | `service_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_id", nullable = false)` |
| `author` | `User` | `author_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false)` |
| `stars` | `int` | `stars` | `@Column(nullable = false)` |
| `content` | `String` | `content` | `@Column(nullable = false, length = 3000)` |
| `createdAt` | `Instant` | `created_at` | `@Column(nullable = false)` |
| `reply` | `String` | `reply` | `@Column(length = 3000)` |
| `repliedAt` | `Instant` | `replied_at` | Mặc định JPA; không có annotation trên trường |
| `images` | `List<ServiceImage>` | `—` | `@ElementCollection @CollectionTable(name = "service_rating_images", joinColumns = @JoinColumn(name = "rating_id")) @OrderColumn(name = "image_position")` |

## ServiceRegistration

Nguồn: [ServiceRegistration.java](../src/main/java/org/hlrcs/entity/ServiceRegistration.java).

Mapping bảng: `@Table(name = "service_registrations")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `registrationId` | `Integer` | `registration_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "registration_id")` |
| `user` | `User` | `user_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)` |
| `category` | `ServiceCategory` | `category_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id", nullable = false)` |
| `serviceName` | `String` | `service_name` | `@Column(name = "service_name", nullable = false)` |
| `contactInfo` | `String` | `contact_info` | `@Column(name = "contact_info")` |
| `applicantName` | `String` | `applicant_name` | `@Column(name = "applicant_name", length = 100)` |
| `contactEmail` | `String` | `contact_email` | `@Column(name = "contact_email")` |
| `pricingType` | `String` | `pricing_type` | `@Column(name = "pricing_type", length = 20)` |
| `serviceArea` | `String` | `service_area` | `@Column(name = "service_area", length = 500)` |
| `customServiceAreas` | `String` | `custom_service_areas` | `@Column(name = "custom_service_areas", length = 600)` |
| `price` | `BigDecimal` | `price` | `@Column(name = "price", precision = 12, scale = 2)` |
| `priceUnit` | `String` | `price_unit` | `@Column(name = "price_unit", length = 20)` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |
| `status` | `RegistrationStatus` | `status` | `@Enumerated(EnumType.STRING) @Column(name = "status", nullable = false)` |
| `reviewer` | `User` | `reviewed_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "reviewed_by")` |
| `assignedStaff` | `User` | `assigned_staff_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assigned_staff_id")` |
| `assignedAt` | `LocalDateTime` | `assigned_at` | `@Column(name = "assigned_at")` |
| `capabilityDecision` | `String` | `capability_decision` | `@Column(name = "capability_decision", length = 20)` |
| `listingDecision` | `String` | `listing_decision` | `@Column(name = "listing_decision", length = 20)` |
| `reasonNote` | `String` | `reason_note` | `@Column(name = "reason_note", columnDefinition = "TEXT")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |
| `reviewedAt` | `LocalDateTime` | `reviewed_at` | `@Column(name = "reviewed_at")` |
| `revision` | `int` | `revision` | `@Column(nullable = false, columnDefinition = "integer default 0") @Builder.Default` |
| `requestedChanges` | `String` | `requested_changes` | `@Column(columnDefinition = "TEXT")` |
| `supplementRequestedAt` | `LocalDateTime` | `supplement_requested_at` | Mặc định JPA; không có annotation trên trường |
| `resubmittedAt` | `LocalDateTime` | `resubmitted_at` | Mặc định JPA; không có annotation trên trường |
| `resubmissionNote` | `String` | `resubmission_note` | `@Column(length = 2000)` |
| `targetService` | `Service` | `target_service_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "target_service_id")` |
| `operation` | `String` | `operation` | `@Builder.Default @Column(length = 20)` |
| `serviceRevision` | `Integer` | `service_revision` | Mặc định JPA; không có annotation trên trường |
| `imageContent` | `byte[]` | `image_content` | `@Lob @Column(columnDefinition = "LONGBLOB")` |
| `imageContentType` | `String` | `image_content_type` | `@Column(length = 100)` |
| `additionalImages` | `java.util.List<ServiceImage>` | `—` | `@ElementCollection(fetch = FetchType.LAZY) @CollectionTable(name = "service_registration_images", joinColumns = @JoinColumn(name = "registration_id")) @OrderColumn(name = "image_position") @Builder.Default` |

## ServiceRequest

Nguồn: [ServiceRequest.java](../src/main/java/org/hlrcs/entity/ServiceRequest.java).

Mapping bảng: `@Table(name = "service_requests", indexes = { @Index(name = "idx_service_request_customer", columnList = "customer_id,request_id"), @Index(name = "idx_service_request_service", columnList = "service_id,request_id")})`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `requestId` | `Integer` | `request_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `service` | `Service` | `service_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "service_id", nullable = false)` |
| `customer` | `User` | `customer_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "customer_id", nullable = false)` |
| `contactName` | `String` | `contact_name` | `@Column(nullable = false, length = 100)` |
| `contactPhone` | `String` | `contact_phone` | `@Column(nullable = false, length = 20)` |
| `description` | `String` | `description` | `@Column(nullable = false, length = 2000)` |
| `address` | `String` | `address` | `@Column(length = 500)` |
| `scheduledAt` | `Instant` | `scheduled_at` | `@Column(nullable = false)` |
| `status` | `String` | `status` | `@Column(nullable = false, length = 20)` |
| `createdAt` | `Instant` | `created_at` | `@Column(nullable = false)` |
| `handledBy` | `User` | `handled_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "handled_by")` |
| `handledAt` | `Instant` | `handled_at` | Mặc định JPA; không có annotation trên trường |
| `responseReason` | `String` | `response_reason` | `@Column(length = 2000)` |
| `revision` | `int` | `revision` | `@Version` |

## SupportLog

Nguồn: [SupportLog.java](../src/main/java/org/hlrcs/entity/SupportLog.java).

Mapping bảng: `@Table(name = "support_logs")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `logId` | `Integer` | `log_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "log_id")` |
| `request` | `SupportRequest` | `request_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "request_id", nullable = false)` |
| `performedBy` | `User` | `performed_by` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "performed_by", nullable = false)` |
| `actionDescription` | `String` | `action_description` | `@Column(name = "action_description", columnDefinition = "TEXT")` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## SupportRequest

Nguồn: [SupportRequest.java](../src/main/java/org/hlrcs/entity/SupportRequest.java).

Mapping bảng: `@Table(name = "support_requests")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `requestId` | `Integer` | `request_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "request_id")` |
| `requester` | `User` | `requester_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "requester_id", nullable = false)` |
| `targetProperty` | `Property` | `target_property_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "target_property_id")` |
| `requestType` | `String` | `request_type` | `@Column(name = "request_type", nullable = false)` |
| `description` | `String` | `description` | `@Column(name = "description", columnDefinition = "TEXT")` |
| `status` | `SupportStatus` | `status` | `@Enumerated(EnumType.STRING) @Column(name = "status", nullable = false)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |
| `completedAt` | `LocalDateTime` | `completed_at` | `@Column(name = "completed_at")` |

## User

Nguồn: [User.java](../src/main/java/org/hlrcs/entity/User.java).

Mapping bảng: `@Table(name = "users")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `userId` | `Integer` | `user_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "user_id")` |
| `fullName` | `String` | `full_name` | `@Column(name = "full_name")` |
| `email` | `String` | `email` | `@Column(name = "email", nullable = false, unique = true)` |
| `phoneNumber` | `String` | `phone_number` | `@Column(name = "phone_number")` |
| `phoneVerifiedAt` | `java.time.Instant` | `phone_verified_at` | Mặc định JPA; không có annotation trên trường |
| `passwordHash` | `String` | `password_hash` | `@Column(name = "password_hash", nullable = false)` |
| `role` | `UserRole` | `role` | `@Enumerated(EnumType.STRING) @Column(name = "role", nullable = false)` |
| `status` | `UserStatus` | `status` | `@Enumerated(EnumType.STRING) @Column(name = "status", nullable = false)` |
| `sessionVersion` | `long` | `session_version` | `@Column(name = "session_version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")` |
| `organization` | `String` | `organization` | `@Column(name = "organization", length = 255)` |
| `preferredArea` | `String` | `preferred_area` | `@Column(name = "preferred_area", length = 255)` |
| `avatar` | `String` | `avatar` | `@Column(name = "avatar", columnDefinition = "MEDIUMTEXT")` |
| `authProvider` | `String` | `auth_provider` | `@Column(name = "auth_provider", length = 50)` |
| `googleSubject` | `String` | `google_subject` | `@Column(name = "google_subject", unique = true)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## UserCapability

Nguồn: [UserCapability.java](../src/main/java/org/hlrcs/entity/UserCapability.java).

Mapping bảng: `@Table(name = "user_capabilities")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `userCapabilityId` | `Integer` | `user_capability_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "user_capability_id")` |
| `user` | `User` | `user_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)` |
| `capability` | `Capability` | `capability_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "capability_id", nullable = false)` |
| `status` | `String` | `status` | `@Column(name = "status")` |
| `grantedAt` | `LocalDateTime` | `granted_at` | `@Column(name = "granted_at")` |

## UserNotice

Nguồn: [UserNotice.java](../src/main/java/org/hlrcs/entity/UserNotice.java).

Mapping bảng: `@Table(name="user_notices", indexes=@Index(name="idx_notice_recipient",columnList="recipient_id,created_at"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Long` | `id` | `@Id @GeneratedValue(strategy=GenerationType.IDENTITY)` |
| `recipient` | `User` | `recipient_id` | `@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="recipient_id")` |
| `category` | `String` | `category` | `@Column(nullable=false)` |
| `kind` | `String` | `kind` | `@Column(nullable=false)` |
| `title` | `String` | `title` | `@Column(nullable=false)` |
| `content` | `String` | `content` | `@Column(length=4000)` |
| `quote` | `String` | `quote` | `@Column(length=4000)` |
| `target` | `String` | `target` | Mặc định JPA; không có annotation trên trường |
| `referenceId` | `Integer` | `reference_id` | Mặc định JPA; không có annotation trên trường |
| `postId` | `Integer` | `post_id` | Mặc định JPA; không có annotation trên trường |
| `commentId` | `Integer` | `comment_id` | Mặc định JPA; không có annotation trên trường |
| `read` | `boolean` | `is_read` | `@Column(name="is_read",nullable=false)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@Column(nullable=false)` |

## VerificationAssignmentQueue

Nguồn: [VerificationAssignmentQueue.java](../src/main/java/org/hlrcs/entity/VerificationAssignmentQueue.java).

Mapping bảng: `@Table(name = "verification_assignment_queue")`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `id` | `Integer` | `id` | `@Id` |

## ViewingNotification

Nguồn: [ViewingNotification.java](../src/main/java/org/hlrcs/entity/ViewingNotification.java).

Mapping bảng: `@Table(name = "viewing_notifications", uniqueConstraints = @UniqueConstraint( name = "uk_viewing_notification_event", columnNames = {"booking_id", "event_key"}), indexes = @Index(name = "idx_viewing_notification_inbox", columnList = "recipient_id,is_read,notification_id"))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `notificationId` | `Integer` | `notification_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "notification_id")` |
| `recipient` | `User` | `recipient_id` | `@ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "recipient_id", nullable = false)` |
| `booking` | `Booking` | `booking_id` | `@ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "booking_id", nullable = false)` |
| `event` | `Event` | `event_key` | `@Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.VARCHAR) @Column(name = "event_key", nullable = false, length = 20)` |
| `content` | `String` | `content` | `@Column(nullable = false, length = 500)` |
| `read` | `boolean` | `is_read` | `@Column(name = "is_read", nullable = false)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@Column(name = "created_at", nullable = false, updatable = false)` |

## Wishlist

Nguồn: [Wishlist.java](../src/main/java/org/hlrcs/entity/Wishlist.java).

Mapping bảng: `@Table(name = "wishlists", uniqueConstraints = @UniqueConstraint(name = "uk_wishlist_user_room_type", columnNames = {"user_id", "room_type_id"}))`.

| Java field | Kiểu Java | Cột | Annotation nguồn |
| --- | --- | --- | --- |
| `wishlistId` | `Integer` | `wishlist_id` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "wishlist_id")` |
| `user` | `User` | `user_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)` |
| `roomType` | `RoomType` | `room_type_id` | `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_type_id", nullable = false)` |
| `createdAt` | `LocalDateTime` | `created_at` | `@CreationTimestamp @Column(name = "created_at", updatable = false)` |

## Enum inventory

| Enum | Giá trị |
| --- | --- |
| [BookingStatus](../src/main/java/org/hlrcs/entity/enums/BookingStatus.java) | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| [CommunityReportReason](../src/main/java/org/hlrcs/entity/enums/CommunityReportReason.java) | `FRAUD`, `SPAM`, `INAPPROPRIATE`, `MISLEADING`, `OTHER` |
| [MediaType](../src/main/java/org/hlrcs/entity/enums/MediaType.java) | `IMAGE`, `VIDEO` |
| [PostStatus](../src/main/java/org/hlrcs/entity/enums/PostStatus.java) | `PENDING`, `NEED_CHANGES`, `APPROVED`, `REJECTED`, `HIDDEN` |
| [PostType](../src/main/java/org/hlrcs/entity/enums/PostType.java) | `ROOMMATE`, `PASS_ROOM`, `PASS_ITEM` |
| [RegistrationStatus](../src/main/java/org/hlrcs/entity/enums/RegistrationStatus.java) | `PENDING`, `NEEDS_SUPPLEMENT`, `APPROVED`, `REJECTED`, `CANCELLED` |
| [ReportStatus](../src/main/java/org/hlrcs/entity/enums/ReportStatus.java) | `PENDING`, `OPEN`, `RESOLVED`, `DISMISSED` |
| [ReportTargetType](../src/main/java/org/hlrcs/entity/enums/ReportTargetType.java) | `POST`, `PROPERTY`, `SERVICE`, `USER` |
| [RoommateType](../src/main/java/org/hlrcs/entity/enums/RoommateType.java) | `HAS_ROOM`, `NO_ROOM` |
| [SupportStatus](../src/main/java/org/hlrcs/entity/enums/SupportStatus.java) | `PENDING`, `IN_PROGRESS`, `COMPLETED` |
| [UserRole](../src/main/java/org/hlrcs/entity/enums/UserRole.java) | `USER`, `ROOM_HOST`, `STAFF`, `ADMIN` |
| [UserStatus](../src/main/java/org/hlrcs/entity/enums/UserStatus.java) | `ACTIVE`, `INACTIVE` |

### Enum lồng trong entity

| Enum | Giá trị |
| --- | --- |
| [CommunityReportAnalysis.State](../src/main/java/org/hlrcs/entity/CommunityReportAnalysis.java) | `QUEUED`, `RUNNING`, `READY`, `FAILED`, `DISABLED`, `SKIPPED` |
| [CommunityScan.State](../src/main/java/org/hlrcs/entity/CommunityScan.java) | `QUEUED`, `RUNNING`, `CLEAR`, `FLAGGED`, `OFF_TOPIC`, `FAILED`, `SKIPPED` |
| [RoomBill.Kind](../src/main/java/org/hlrcs/entity/RoomBill.java) | `MAIN`, `UTILITIES` |
| [RoomBillPayment.Method](../src/main/java/org/hlrcs/entity/RoomBillPayment.java) | `CASH`, `TRANSFER`, `OTHER` |
| [RoomUtilityReading.WaterMode](../src/main/java/org/hlrcs/entity/RoomUtilityReading.java) | `METER`, `PER_PERSON`, `FIXED` |
| [ViewingNotification.Event](../src/main/java/org/hlrcs/entity/ViewingNotification.java) | `REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`, `EXPIRED` |

## Khác biệt với SQL tham khảo

`sql/schema.sql` khai báo 31 bảng CREATE TABLE. So sánh sau chỉ xét tên bảng/cột của entity; không phải migration, không so sánh toàn bộ kiểu/index/default/FK hoặc bảng collection. Không import schema cũ để đồng bộ tài liệu.

| Bảng entity | Thiếu trong SQL tham khảo |
| --- | --- |
| `collected_posts` | Chưa có bảng |
| `community_notifications` | Chưa có bảng |
| `community_report_analyses` | Chưa có bảng |
| `community_report_evidence` | Chưa có bảng |
| `host_applications` | Chưa có bảng |
| `host_application_identity` | Chưa có bảng |
| `phone_verifications` | Chưa có bảng |
| `posts` | `price`, `location`, `contact_name`, `contact_phone`, `review_note` |
| `property_assignment_events` | Chưa có bảng |
| `property_registrations` | `host_onboarding`, `reverification_reasons_json`, `field_notes_json`, `assigned_staff_id`, `assignment_version` |
| `registration_otps` | Chưa có bảng |
| `rental_contracts` | Chưa có bảng |
| `reports` | `reason_code`, `post_title`, `resolution_note`, `resolved_at` |
| `rooms` | Chưa có bảng |
| `room_bills` | Chưa có bảng |
| `room_bill_payments` | Chưa có bảng |
| `room_occupants` | Chưa có bảng |
| `room_tenancies` | Chưa có bảng |
| `room_types` | `capacity`, `deposit`, `image_url`, `amenities_json`, `electricity_price`, `water_price`, `internet_price` |
| `room_type_images` | `file_name`, `content_type`, `file_content` |
| `room_utility_readings` | Chưa có bảng |
| `services` | `contact_email`, `pricing_type`, `service_area`, `custom_service_areas`, `price_unit`, `moderation_hidden`, `revision` |
| `service_complaints` | Chưa có bảng |
| `service_complaint_events` | Chưa có bảng |
| `service_documents` | `content_type`, `file_content` |
| `service_ratings` | Chưa có bảng |
| `service_registrations` | `applicant_name`, `contact_email`, `pricing_type`, `service_area`, `custom_service_areas`, `price_unit`, `assigned_staff_id`, `assigned_at`, `capability_decision`, `listing_decision`, `revision`, `requested_changes`, `supplement_requested_at`, `resubmitted_at`, `resubmission_note`, `target_service_id`, `operation`, `service_revision`, `image_content`, `image_content_type` |
| `service_requests` | Chưa có bảng |
| `users` | `phone_verified_at`, `session_version`, `organization`, `preferred_area`, `avatar` |
| `user_notices` | Chưa có bảng |
| `verification_assignment_queue` | Chưa có bảng |

## Quy tắc nghiệp vụ liên quan

Service Owner là capability MANAGE_SERVICE, không phải role. Hồ sơ CREATE/UPDATE được duyệt trước khi thay snapshot công khai; chủ sở hữu gỡ trực tiếp bằng DELETED và OWNER_REMOVED. ServiceRequest chỉ có PENDING → ACCEPTED/REJECTED. Chi tiết tại [SERVICE_MANAGEMENT.md](SERVICE_MANAGEMENT.md), [SERVICE_REQUESTS.md](SERVICE_REQUESTS.md), [SERVICE_FEEDBACK.md](SERVICE_FEEDBACK.md).

ERD mô tả các quan hệ JPA tại [ERD.md](ERD.md).
