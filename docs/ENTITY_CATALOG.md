# HL-RCS — Entity catalog

Đối chiếu JPA source ngày **2026-11-05**, commit `350dc13`.

Có **29 @Entity**, **1 @Embeddable** (`RoomTypeAmenityId`) và **11 enums**.
Đây là mô hình nguồn, không phải kết quả introspection database live. Xem [context](PROJECT_CONTEXT.md) và [ERD](ERD.md).

Tên cột lấy từ @Column/@JoinColumn; trường không ghi tên dùng quy tắc camelCase → snake_case của cấu hình Spring Boot mặc định.
NOT NULL bên dưới phản ánh annotation/khóa chính; constraint thực tế cần kiểm tra database nếu đã có schema cũ.
PK = primary key, FK = relationship column; @MapsId có thể khiến cùng cột xuất hiện ở cả scalar ID và relationship.

## Tài khoản và quyền

### User → `users`

[Java source](../src/main/java/org/hlrcs/entity/User.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `userId` | `Integer` | `user_id` | PK; NOT NULL |
| `fullName` | `String` | `full_name` | nullable mặc định |
| `email` | `String` | `email` | NOT NULL; unique |
| `phoneNumber` | `String` | `phone_number` | nullable mặc định |
| `passwordHash` | `String` | `password_hash` | NOT NULL |
| `role` | `UserRole` | `role` | NOT NULL; EnumType.STRING |
| `status` | `UserStatus` | `status` | NOT NULL; EnumType.STRING |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

### Capability → `capabilities`

[Java source](../src/main/java/org/hlrcs/entity/Capability.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `capabilityId` | `Integer` | `capability_id` | PK; NOT NULL |
| `name` | `String` | `name` | NOT NULL |
| `code` | `String` | `code` | NOT NULL; unique |

### UserCapability → `user_capabilities`

[Java source](../src/main/java/org/hlrcs/entity/UserCapability.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `userCapabilityId` | `Integer` | `user_capability_id` | PK; NOT NULL |
| `user` | `User` | `user_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `capability` | `Capability` | `capability_id` | FK → Capability (ManyToOne, LAZY); NOT NULL |
| `status` | `String` | `status` | nullable mặc định |
| `grantedAt` | `LocalDateTime` | `granted_at` | nullable mặc định |

## Nhà trọ, loại phòng và phòng vật lý

### PropertyRegistration → `property_registrations`

Bổ sung 2026-11-11: `reverificationReasonsJson` (String/TEXT nullable) lưu các nhóm
thay đổi cần tái xác minh trên đề nghị; giữ lại sau xét duyệt để tra lịch sử.

[Java source](../src/main/java/org/hlrcs/entity/PropertyRegistration.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `registrationId` | `Integer` | `registration_id` | PK; NOT NULL |
| `user` | `User` | `user_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `name` | `String` | `name` | NOT NULL |
| `address` | `String` | `address` | nullable mặc định |
| `contactInfo` | `String` | `contact_info` | nullable mặc định |
| `googleMapLink` | `String` | `google_map_link` | nullable mặc định |
| `status` | `RegistrationStatus` | `status` | NOT NULL; EnumType.STRING |
| `reviewer` | `User` | `reviewed_by` | FK → User (ManyToOne, LAZY); nullable mặc định |
| `reasonNote` | `String` | `reason_note` | nullable mặc định; TEXT |
| `registrationDetails` | `String` | `registration_details` | nullable mặc định; TEXT |
| `reviewedAt` | `LocalDateTime` | `reviewed_at` | nullable mặc định |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

### PropertyDocument → `property_documents`

[Java source](../src/main/java/org/hlrcs/entity/PropertyDocument.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `documentId` | `Integer` | `document_id` | PK; NOT NULL |
| `registration` | `PropertyRegistration` | `registration_id` | FK → PropertyRegistration (ManyToOne, LAZY); NOT NULL |
| `documentType` | `String` | `document_type` | nullable mặc định |
| `documentUrl` | `String` | `document_url` | nullable mặc định |
| `verificationStatus` | `String` | `verification_status` | nullable mặc định |
| `fileName` | `String` | `file_name` | nullable mặc định |
| `contentType` | `String` | `content_type` | nullable mặc định |
| `fileContent` | `byte[]` | `file_content` | nullable mặc định; LONGBLOB; LOB |

### Property → `properties`

Bổ sung 2026-11-11: `reverificationRequired` (boolean NOT NULL DEFAULT FALSE) và
`reverificationReasonsJson` (String/TEXT nullable). Flag công khai độc lập với
status ACTIVE, không khóa quản lý Room. Chỉ phê duyệt tái xác minh đúng baseline
mới gỡ flag; không ảnh hưởng mốc xác nhận phòng trống.

[Java source](../src/main/java/org/hlrcs/entity/Property.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `propertyId` | `Integer` | `property_id` | PK; NOT NULL |
| `owner` | `User` | `owner_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `registration` | `PropertyRegistration` | `registration_id` | FK → PropertyRegistration (OneToOne, LAZY); nullable mặc định |
| `name` | `String` | `name` | NOT NULL |
| `address` | `String` | `address` | nullable mặc định |
| `contactInfo` | `String` | `contact_info` | nullable mặc định |
| `googleMapLink` | `String` | `google_map_link` | nullable mặc định |
| `description` | `String` | `description` | nullable mặc định; TEXT |
| `status` | `String` | `status` | nullable mặc định |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |
| `updatedAt` | `LocalDateTime` | `updated_at` | nullable mặc định; UpdateTimestamp |

### RoomType → `room_types`

Bổ sung 2026-11-11 (N01–N04): `availabilityConfirmedAt` (Instant, nullable,
`availability_confirmed_at`, UTC) và `availabilityConfirmedBy` (User, ManyToOne LAZY,
nullable FK `availability_confirmed_by` → users). Null cho dữ liệu chưa xác nhận.
Độ mới được tính lúc đọc, không lưu cột stale hoặc snapshot số phòng trống.

[Java source](../src/main/java/org/hlrcs/entity/RoomType.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `roomTypeId` | `Integer` | `room_type_id` | PK; NOT NULL |
| `property` | `Property` | `property_id` | FK → Property (ManyToOne, LAZY); NOT NULL |
| `roomType` | `String` | `room_type` | NOT NULL |
| `price` | `BigDecimal` | `price` | nullable mặc định; precision=12, scale=2 |
| `areaSqm` | `Float` | `area_sqm` | nullable mặc định |
| `servicePrice` | `BigDecimal` | `service_price` | nullable mặc định; precision=12, scale=2 |
| `description` | `String` | `description` | nullable mặc định; TEXT |
| `capacity` | `Integer` | `capacity` | nullable mặc định |
| `deposit` | `BigDecimal` | `deposit` | nullable mặc định; precision=12, scale=2 |
| `imageUrl` | `String` | `image_url` | nullable mặc định; length=1000 |
| `amenitiesJson` | `String` | `amenities_json` | nullable mặc định; TEXT |
| `electricityPrice` | `BigDecimal` | `electricity_price` | nullable mặc định; precision=12, scale=2 |
| `waterPrice` | `BigDecimal` | `water_price` | nullable mặc định; precision=12, scale=2 |
| `internetPrice` | `BigDecimal` | `internet_price` | nullable mặc định; precision=12, scale=2 |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |
| `updatedAt` | `LocalDateTime` | `updated_at` | nullable mặc định; UpdateTimestamp |

### Room → `rooms`

[Java source](../src/main/java/org/hlrcs/entity/Room.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `roomId` | `Integer` | `room_id` | PK; NOT NULL |
| `property` | `Property` | `property_id` | FK → Property (ManyToOne, LAZY); NOT NULL |
| `roomType` | `RoomType` | `room_type_id` | FK → RoomType (ManyToOne, LAZY); NOT NULL |
| `roomNumber` | `String` | `room_number` | NOT NULL; length=30 |
| `floor` | `String` | `floor` | NOT NULL; length=50 |
| `status` | `String` | `status` | NOT NULL; length=20 |
| `customPrice` | `BigDecimal` | `custom_price` | nullable mặc định; precision=12, scale=2 |
| `confirmedAt` | `LocalDateTime` | `confirmed_at` | nullable mặc định |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |
| `updatedAt` | `LocalDateTime` | `updated_at` | nullable mặc định; UpdateTimestamp |

Unique constraint: `(property_id, room_number)` (`uk_room_property_number`).

### RoomTypeImage → `room_type_images`

[Java source](../src/main/java/org/hlrcs/entity/RoomTypeImage.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `imageId` | `Integer` | `image_id` | PK; NOT NULL |
| `roomType` | `RoomType` | `room_type_id` | FK → RoomType (ManyToOne, LAZY); NOT NULL |
| `imageUrl` | `String` | `image_url` | NOT NULL |
| `fileName` | `String` | `file_name` | nullable mặc định; length=200 |
| `contentType` | `String` | `content_type` | nullable mặc định |
| `fileContent` | `byte[]` | `file_content` | nullable mặc định; LONGBLOB; LOB |

### RoomTypeVideo → `room_type_videos`

[Java source](../src/main/java/org/hlrcs/entity/RoomTypeVideo.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `videoId` | `Integer` | `video_id` | PK; NOT NULL |
| `roomType` | `RoomType` | `room_type_id` | FK → RoomType (ManyToOne, LAZY); NOT NULL |
| `videoUrl` | `String` | `video_url` | NOT NULL |

### Amenity → `amenities`

[Java source](../src/main/java/org/hlrcs/entity/Amenity.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `amenityId` | `Integer` | `amenity_id` | PK; NOT NULL |
| `name` | `String` | `name` | NOT NULL |
| `category` | `String` | `category` | nullable mặc định |

### RoomTypeAmenity → `room_type_amenities`

[Java source](../src/main/java/org/hlrcs/entity/RoomTypeAmenity.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `id` | `RoomTypeAmenityId` | `room_type_id + amenity_id` | Embedded PK; NOT NULL |
| `roomType` | `RoomType` | `room_type_id` | FK → RoomType (ManyToOne, LAZY); MapsId / shared PK; NOT NULL |
| `amenity` | `Amenity` | `amenity_id` | FK → Amenity (ManyToOne, LAZY); MapsId / shared PK; NOT NULL |

## Onboarding và dịch vụ công khai

### ServiceCategory → `service_categories`

[Java source](../src/main/java/org/hlrcs/entity/ServiceCategory.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `categoryId` | `Integer` | `category_id` | PK; NOT NULL |
| `name` | `String` | `name` | NOT NULL |
| `description` | `String` | `description` | nullable mặc định; TEXT |

### ServiceRegistration → `service_registrations`

[Java source](../src/main/java/org/hlrcs/entity/ServiceRegistration.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `registrationId` | `Integer` | `registration_id` | PK; NOT NULL |
| `user` | `User` | `user_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `category` | `ServiceCategory` | `category_id` | FK → ServiceCategory (ManyToOne, LAZY); NOT NULL |
| `serviceName` | `String` | `service_name` | NOT NULL |
| `contactInfo` | `String` | `contact_info` | nullable mặc định |
| `applicantName` | `String` | `applicant_name` | nullable mặc định; length=100 |
| `contactEmail` | `String` | `contact_email` | nullable mặc định |
| `pricingType` | `String` | `pricing_type` | nullable mặc định; length=20 |
| `serviceArea` | `String` | `service_area` | nullable mặc định; length=500 |
| `price` | `BigDecimal` | `price` | nullable mặc định; precision=12, scale=2 |
| `description` | `String` | `description` | nullable mặc định; TEXT |
| `status` | `RegistrationStatus` | `status` | NOT NULL; EnumType.STRING |
| `reviewer` | `User` | `reviewed_by` | FK → User (ManyToOne, LAZY); nullable mặc định |
| `assignedStaff` | `User` | `assigned_staff_id` | FK → User (ManyToOne, LAZY); nullable mặc định |
| `assignedAt` | `LocalDateTime` | `assigned_at` | nullable mặc định |
| `capabilityDecision` | `String` | `capability_decision` | nullable mặc định; length=20 |
| `listingDecision` | `String` | `listing_decision` | nullable mặc định; length=20 |
| `reasonNote` | `String` | `reason_note` | nullable mặc định; TEXT |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |
| `reviewedAt` | `LocalDateTime` | `reviewed_at` | nullable mặc định |
| `revision` | `int` | `revision` | NOT NULL; default 0; tăng khi request/resubmit/review |
| `requestedChanges` | `String` | `requested_changes` | TEXT; yêu cầu gần nhất |
| `supplementRequestedAt` | `LocalDateTime` | `supplement_requested_at` | Thời gian yêu cầu bổ sung |
| `resubmittedAt` | `LocalDateTime` | `resubmitted_at` | Thời gian nộp lại gần nhất |
| `resubmissionNote` | `String` | `resubmission_note` | length=2000 |
| `targetService` | `Service` | `target_service_id` | nullable; ManyToOne; lịch sử / dịch vụ đích |
| `operation` | `String` | `operation` | CREATE/UPDATE/DELETE; length 20 |
| `serviceRevision` | `Integer` | `service_revision` | Phiên bản dịch vụ gốc |
| `imageContent` | `byte[]` | `image_content` | LONGBLOB; ảnh đại diện snapshot |
| `imageContentType` | `String` | `image_content_type` | MIME; length 100 |

Legacy `assignedStaff`/`assignedAt` vẫn được lưu nhưng không hạn chế Staff/Admin xem hoặc duyệt.

### ServiceDocument → `service_documents`

[Java source](../src/main/java/org/hlrcs/entity/ServiceDocument.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `documentId` | `Integer` | `document_id` | PK; NOT NULL |
| `registration` | `ServiceRegistration` | `registration_id` | FK → ServiceRegistration (ManyToOne, LAZY); NOT NULL |
| `documentName` | `String` | `document_name` | nullable mặc định |
| `documentUrl` | `String` | `document_url` | nullable mặc định |
| `verificationStatus` | `String` | `verification_status` | nullable mặc định |
| `contentType` | `String` | `content_type` | nullable mặc định; length=100 |
| `fileContent` | `byte[]` | `file_content` | nullable mặc định; LONGBLOB; LOB |

### Service → `services`

[Java source](../src/main/java/org/hlrcs/entity/Service.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `serviceId` | `Integer` | `service_id` | PK; NOT NULL |
| `provider` | `User` | `provider_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `category` | `ServiceCategory` | `category_id` | FK → ServiceCategory (ManyToOne, LAZY); NOT NULL |
| `registration` | `ServiceRegistration` | `registration_id` | FK → ServiceRegistration (OneToOne, LAZY); nullable mặc định |
| `serviceName` | `String` | `service_name` | NOT NULL |
| `contactInfo` | `String` | `contact_info` | nullable mặc định |
| `contactEmail` | `String` | `contact_email` | nullable mặc định |
| `pricingType` | `String` | `pricing_type` | nullable mặc định; length=20 |
| `serviceArea` | `String` | `service_area` | nullable mặc định; length=500 |
| `price` | `BigDecimal` | `price` | nullable mặc định; precision=12, scale=2 |
| `description` | `String` | `description` | nullable mặc định; TEXT |
| `status` | `String` | `status` | nullable mặc định |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |
| `revision` | `int` | `revision` | NOT NULL; default 0; tăng sau duyệt thay đổi |

## Cộng đồng

### Post → `posts`

[Java source](../src/main/java/org/hlrcs/entity/Post.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | PK; NOT NULL |
| `author` | `User` | `author_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `postType` | `PostType` | `post_type` | NOT NULL; EnumType.STRING |
| `title` | `String` | `title` | NOT NULL |
| `description` | `String` | `description` | nullable mặc định; TEXT |
| `status` | `PostStatus` | `status` | NOT NULL; EnumType.STRING |
| `reviewer` | `User` | `reviewed_by` | FK → User (ManyToOne, LAZY); nullable mặc định |
| `reviewedAt` | `LocalDateTime` | `reviewed_at` | nullable mặc định |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |
| `updatedAt` | `LocalDateTime` | `updated_at` | nullable mặc định; UpdateTimestamp |

### PostMedia → `post_media`

[Java source](../src/main/java/org/hlrcs/entity/PostMedia.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `mediaId` | `Integer` | `media_id` | PK; NOT NULL |
| `post` | `Post` | `post_id` | FK → Post (ManyToOne, LAZY); NOT NULL |
| `mediaType` | `MediaType` | `media_type` | NOT NULL; EnumType.STRING |
| `mediaUrl` | `String` | `media_url` | NOT NULL |

### RoommatePostDetail → `roommate_post_details`

[Java source](../src/main/java/org/hlrcs/entity/RoommatePostDetail.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | PK; NOT NULL |
| `post` | `Post` | `post_id` | FK → Post (OneToOne, LAZY); MapsId / shared PK; NOT NULL |
| `roommateType` | `RoommateType` | `roommate_type` | nullable mặc định; EnumType.STRING |
| `requirements` | `String` | `requirements` | nullable mặc định; TEXT |
| `location` | `String` | `location` | nullable mặc định |
| `property` | `Property` | `property_id` | FK → Property (ManyToOne, LAZY); nullable mặc định |
| `propertyDescription` | `String` | `property_description` | nullable mặc định; TEXT |

### PassRoomPostDetail → `pass_room_post_details`

[Java source](../src/main/java/org/hlrcs/entity/PassRoomPostDetail.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | PK; NOT NULL |
| `post` | `Post` | `post_id` | FK → Post (OneToOne, LAZY); MapsId / shared PK; NOT NULL |
| `property` | `Property` | `property_id` | FK → Property (ManyToOne, LAZY); nullable mặc định |
| `propertyInfo` | `String` | `property_info` | nullable mặc định; TEXT |
| `description` | `String` | `description` | nullable mặc định; TEXT |
| `passReason` | `String` | `pass_reason` | nullable mặc định; TEXT |
| `availableDate` | `LocalDateTime` | `available_date` | nullable mặc định |
| `contractExpireDate` | `LocalDateTime` | `contract_expire_date` | nullable mặc định |

### PassItemPostDetail → `pass_item_post_details`

[Java source](../src/main/java/org/hlrcs/entity/PassItemPostDetail.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `postId` | `Integer` | `post_id` | PK; NOT NULL |
| `post` | `Post` | `post_id` | FK → Post (OneToOne, LAZY); MapsId / shared PK; NOT NULL |
| `itemDescription` | `String` | `item_description` | nullable mặc định; TEXT |

### Comment → `comments`

[Java source](../src/main/java/org/hlrcs/entity/Comment.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `commentId` | `Integer` | `comment_id` | PK; NOT NULL |
| `post` | `Post` | `post_id` | FK → Post (ManyToOne, LAZY); NOT NULL |
| `author` | `User` | `author_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `content` | `String` | `content` | NOT NULL; TEXT |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

## Tương tác và vận hành

### Booking → `bookings`

[Java source](../src/main/java/org/hlrcs/entity/Booking.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `bookingId` | `Integer` | `booking_id` | PK; NOT NULL |
| `renter` | `User` | `renter_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `roomType` | `RoomType` | `room_type_id` | FK → RoomType (ManyToOne, LAZY); NOT NULL |
| `scheduledDate` | `LocalDateTime` | `scheduled_date` | NOT NULL |
| `status` | `BookingStatus` | `status` | NOT NULL; EnumType.STRING |
| `note` | `String` | `note` | nullable mặc định; TEXT |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

### Wishlist → `wishlists`

[Java source](../src/main/java/org/hlrcs/entity/Wishlist.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `wishlistId` | `Integer` | `wishlist_id` | PK; NOT NULL |
| `user` | `User` | `user_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `roomType` | `RoomType` | `room_type_id` | FK → RoomType (ManyToOne, LAZY); NOT NULL |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

### Feedback → `feedbacks`

[Java source](../src/main/java/org/hlrcs/entity/Feedback.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `feedbackId` | `Integer` | `feedback_id` | PK; NOT NULL |
| `user` | `User` | `user_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `property` | `Property` | `property_id` | FK → Property (ManyToOne, LAZY); NOT NULL |
| `rating` | `Integer` | `rating` | NOT NULL |
| `content` | `String` | `content` | nullable mặc định; TEXT |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

### Report → `reports`

[Java source](../src/main/java/org/hlrcs/entity/Report.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `reportId` | `Integer` | `report_id` | PK; NOT NULL |
| `reporter` | `User` | `reporter_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `targetType` | `ReportTargetType` | `target_type` | NOT NULL; EnumType.STRING |
| `targetId` | `Integer` | `target_id` | NOT NULL |
| `reason` | `String` | `reason` | nullable mặc định; TEXT |
| `status` | `ReportStatus` | `status` | NOT NULL; EnumType.STRING |
| `handler` | `User` | `handler_id` | FK → User (ManyToOne, LAZY); nullable mặc định |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

`targetType` + `targetId` là tham chiếu polymorphic do application xử lý, không phải FK tới bảng đích.

### SupportRequest → `support_requests`

[Java source](../src/main/java/org/hlrcs/entity/SupportRequest.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `requestId` | `Integer` | `request_id` | PK; NOT NULL |
| `requester` | `User` | `requester_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `targetProperty` | `Property` | `target_property_id` | FK → Property (ManyToOne, LAZY); nullable mặc định |
| `requestType` | `String` | `request_type` | NOT NULL |
| `description` | `String` | `description` | nullable mặc định; TEXT |
| `status` | `SupportStatus` | `status` | NOT NULL; EnumType.STRING |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |
| `completedAt` | `LocalDateTime` | `completed_at` | nullable mặc định |

### SupportLog → `support_logs`

[Java source](../src/main/java/org/hlrcs/entity/SupportLog.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `logId` | `Integer` | `log_id` | PK; NOT NULL |
| `request` | `SupportRequest` | `request_id` | FK → SupportRequest (ManyToOne, LAZY); NOT NULL |
| `performedBy` | `User` | `performed_by` | FK → User (ManyToOne, LAZY); NOT NULL |
| `actionDescription` | `String` | `action_description` | nullable mặc định; TEXT |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

### ModerationLog → `moderation_logs`

[Java source](../src/main/java/org/hlrcs/entity/ModerationLog.java)

| Java field | Java type | DB column | Mapping / constraints |
| --- | --- | --- | --- |
| `logId` | `Integer` | `log_id` | PK; NOT NULL |
| `staff` | `User` | `staff_id` | FK → User (ManyToOne, LAZY); NOT NULL |
| `targetType` | `String` | `target_type` | NOT NULL |
| `targetId` | `Integer` | `target_id` | NOT NULL |
| `action` | `String` | `action` | NOT NULL |
| `note` | `String` | `note` | nullable mặc định; TEXT |
| `createdAt` | `LocalDateTime` | `created_at` | nullable mặc định; CreationTimestamp |

`targetType` + `targetId` là tham chiếu polymorphic do application xử lý, không phải FK tới bảng đích.

## Composite key

[RoomTypeAmenityId.java](../src/main/java/org/hlrcs/entity/RoomTypeAmenityId.java) là @Embeddable implementing Serializable, chứa `Integer roomTypeId` (`room_type_id`) và `Integer amenityId` (`amenity_id`), có equals/hashCode.

Ba PostDetail dùng `postId` và quan hệ Post @MapsId, không tạo một ID detail độc lập.

## Enum inventory

| Enum | Values |
| --- | --- |
| [BookingStatus](../src/main/java/org/hlrcs/entity/enums/BookingStatus.java) | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| [MediaType](../src/main/java/org/hlrcs/entity/enums/MediaType.java) | `IMAGE`, `VIDEO` |
| [PostStatus](../src/main/java/org/hlrcs/entity/enums/PostStatus.java) | `PENDING`, `APPROVED`, `REJECTED` |
| [PostType](../src/main/java/org/hlrcs/entity/enums/PostType.java) | `ROOMMATE`, `PASS_ROOM`, `PASS_ITEM` |
| [RegistrationStatus](../src/main/java/org/hlrcs/entity/enums/RegistrationStatus.java) | `PENDING`, `NEEDS_SUPPLEMENT`, `APPROVED`, `REJECTED` |
| [ReportStatus](../src/main/java/org/hlrcs/entity/enums/ReportStatus.java) | `PENDING`, `RESOLVED`, `DISMISSED` |
| [ReportTargetType](../src/main/java/org/hlrcs/entity/enums/ReportTargetType.java) | `POST`, `PROPERTY`, `SERVICE`, `USER` |
| [RoommateType](../src/main/java/org/hlrcs/entity/enums/RoommateType.java) | `HAS_ROOM`, `NO_ROOM` |
| [SupportStatus](../src/main/java/org/hlrcs/entity/enums/SupportStatus.java) | `PENDING`, `IN_PROGRESS`, `COMPLETED` |
| [UserRole](../src/main/java/org/hlrcs/entity/enums/UserRole.java) | `USER`, `ROOM_HOST`, `STAFF`, `ADMIN` |
| [UserStatus](../src/main/java/org/hlrcs/entity/enums/UserStatus.java) | `ACTIVE`, `INACTIVE` |

Một số trạng thái khác là String, không có Java enum: trạng thái Property/Service, UserCapability, verification status; Room dùng VACANT/OCCUPIED được DTO/service kiểm tra. Capability/listing decisions dùng APPROVE/REJECT, pricing dùng FIXED/FROM/NEGOTIABLE.

## Khác biệt cột với sql/schema.sql

So sánh tên bảng/cột khai báo trong entity với [SQL tham khảo](../sql/schema.sql), chưa so sánh toàn bộ kiểu dữ liệu, index, default, FK hoặc enum constraints. Không dùng danh sách này làm migration tự động.

| Bảng | Phần thiếu trong SQL tham khảo |
| --- | --- |
| `property_documents` | `file_name`, `content_type`, `file_content` |
| `property_registrations` | `registration_details`, `reviewed_at` |
| `rooms` | Chưa có cả bảng (`room_id`, `property_id`, `room_type_id`, `room_number`, `floor`, `status`, `custom_price`, `confirmed_at`, `created_at`, `updated_at`) |
| `room_types` | `capacity`, `deposit`, `image_url`, `amenities_json`, `electricity_price`, `water_price`, `internet_price` |
| `room_type_images` | `file_name`, `content_type`, `file_content` |
| `services` | `contact_email`, `pricing_type`, `service_area` |
| `service_documents` | `content_type`, `file_content` |
| `service_registrations` | `applicant_name`, `contact_email`, `pricing_type`, `service_area`, `assigned_staff_id`, `assigned_at`, `capability_decision`, `listing_decision` |

`sql/schema.sql` có 28 bảng; JPA hiện có 29 bảng. Hibernate runtime dùng `ddl-auto=update`; H2 tests dùng `create-drop`. Tài liệu này không thay đổi schema hoặc dữ liệu.

## Bổ sung bộ ảnh dịch vụ — 2026-11-08

`ServiceImage` là embeddable gồm `content` (LONGBLOB, không rỗng) và `contentType` (varchar(100)). `ServiceRegistration.additionalImages` là element collection lazy, bảng `service_registration_images`, FK `registration_id`, thứ tự `image_position`. Ảnh đại diện tiếp tục dùng `ServiceRegistration.imageContent/imageContentType`; collection chứa tối đa 4 ảnh tiếp theo. Xem SERVICE_MANAGEMENT.md cho contract và điều kiện công khai.
