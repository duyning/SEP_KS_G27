# HL-RCS — ERD theo JPA hiện tại

Đối chiếu source ngày **2026-11-28**: **53 @Entity, 2 @Embeddable và 12 enum độc lập và 6 enum lồng trong entity**. Thay thế sơ đồ snapshot 2026-11-05. Không kiểm tra schema MySQL live.

Node là tên bảng. Cạnh chỉ biểu diễn quan hệ JPA và element collection; ID scalar không tạo cạnh FK. `||` = đúng một, `|o` = không hoặc một, `o{` = không hoặc nhiều. Với quan hệ to-one, optionality lấy từ `nullable=false`, `optional=false` hoặc `@MapsId`; mặc định là optional. Các thuộc tính và index đầy đủ ở [ENTITY_CATALOG.md](ENTITY_CATALOG.md). Quan hệ ngược `mappedBy` không lặp cạnh đã có từ phía sở hữu.

## Tài khoản và quyền

```mermaid
erDiagram
    users {
        int user_id PK
    }
    capabilities {
        int capability_id PK
    }
    user_capabilities {
        int user_capability_id PK
    }
    registration_otps {
        string id PK
    }
    phone_verifications {
        int user_id PK
    }
    user_notices {
        bigint id PK
    }
    users ||--o{ user_capabilities : user
    capabilities ||--o{ user_capabilities : capability
    users ||--o{ user_notices : recipient
```

## Nhà trọ và xác minh

```mermaid
erDiagram
    host_applications {
        int id PK
    }
    host_application_identity {
        int application_id PK
    }
    properties {
        int property_id PK
    }
    property_registrations {
        int registration_id PK
    }
    property_documents {
        int document_id PK
    }
    property_assignment_events {
        bigint event_id PK
    }
    property_submission_events {
        int event_id PK
    }
    verification_assignment_queue {
        int id PK
    }
    users ||--o| host_applications : user
    users |o--o{ host_applications : reviewedBy
    host_applications ||--o| host_application_identity : application
    users ||--o{ properties : owner
    property_registrations |o--o| properties : registration
    users ||--o{ property_registrations : user
    users |o--o{ property_registrations : reviewer
    users |o--o{ property_registrations : assignedStaff
    property_registrations ||--o{ property_documents : registration
    property_registrations ||--o{ property_assignment_events : registration
    property_registrations ||--o{ property_submission_events : registration
    users ||--o{ property_submission_events : actor
```

## Phòng và lịch xem

```mermaid
erDiagram
    rooms {
        int room_id PK
    }
    room_types {
        int room_type_id PK
    }
    room_type_images {
        int image_id PK
    }
    room_type_videos {
        int video_id PK
    }
    room_type_amenities {
        int room_type_id PK
        int amenity_id PK
    }
    amenities {
        int amenity_id PK
    }
    wishlists {
        int wishlist_id PK
    }
    bookings {
        int booking_id PK
    }
    viewing_notifications {
        int notification_id PK
    }
    properties ||--o{ rooms : property
    room_types ||--o{ rooms : roomType
    properties ||--o{ room_types : property
    users |o--o{ room_types : availabilityConfirmedBy
    room_types ||--o{ room_type_images : roomType
    room_types ||--o{ room_type_videos : roomType
    room_types ||--o{ room_type_amenities : roomType
    amenities ||--o{ room_type_amenities : amenity
    users ||--o{ wishlists : user
    room_types ||--o{ wishlists : roomType
    users ||--o{ bookings : renter
    room_types ||--o{ bookings : roomType
    users |o--o{ bookings : processedBy
    users ||--o{ viewing_notifications : recipient
    bookings ||--o{ viewing_notifications : booking
```

## Thuê phòng và hóa đơn

```mermaid
erDiagram
    rental_contracts {
        bigint id PK
    }
    room_tenancies {
        bigint id PK
    }
    room_occupants {
        bigint id PK
    }
    room_utility_readings {
        bigint id PK
    }
    room_bills {
        bigint id PK
    }
    room_bill_payments {
        bigint id PK
    }
    room_tenancies ||--o{ room_occupants : tenancy
```

## Dịch vụ

```mermaid
erDiagram
    services {
        int service_id PK
    }
    service_categories {
        int category_id PK
    }
    service_registrations {
        int registration_id PK
    }
    service_documents {
        int document_id PK
    }
    service_requests {
        int request_id PK
    }
    service_ratings {
        int rating_id PK
    }
    service_complaints {
        int complaint_id PK
    }
    service_complaint_events {
        int event_id PK
    }
    users ||--o{ services : provider
    service_categories ||--o{ services : category
    service_registrations |o--o| services : registration
    users ||--o{ service_registrations : user
    service_categories ||--o{ service_registrations : category
    users |o--o{ service_registrations : reviewer
    users |o--o{ service_registrations : assignedStaff
    services |o--o{ service_registrations : targetService
    service_registrations ||--o{ service_registration_images : additionalImages
    service_registrations ||--o{ service_documents : registration
    services ||--o{ service_requests : service
    users ||--o{ service_requests : customer
    users |o--o{ service_requests : handledBy
    services ||--o{ service_ratings : service
    users ||--o{ service_ratings : author
    service_ratings ||--o{ service_rating_images : images
    services ||--o{ service_complaints : service
    users ||--o{ service_complaints : reporter
    service_complaints ||--o{ service_complaint_images : images
    service_complaints ||--o{ service_complaint_events : complaint
    users ||--o{ service_complaint_events : actor
    service_complaint_events ||--o{ service_complaint_event_images : images
```

## Cộng đồng và kiểm duyệt

```mermaid
erDiagram
    posts {
        int post_id PK
    }
    post_media {
        int media_id PK
    }
    roommate_post_details {
        int post_id PK
    }
    pass_room_post_details {
        int post_id PK
    }
    pass_item_post_details {
        int post_id PK
    }
    comments {
        int comment_id PK
    }
    community_notifications {
        int notification_id PK
    }
    community_scans {
        int id PK
    }
    community_report_analyses {
        int report_id PK
    }
    community_report_evidence {
        int report_id PK
    }
    collected_posts {
        bigint id PK
    }
    reports {
        int report_id PK
    }
    feedbacks {
        int feedback_id PK
    }
    moderation_logs {
        int log_id PK
    }
    support_requests {
        int request_id PK
    }
    support_logs {
        int log_id PK
    }
    users ||--o{ posts : author
    users |o--o{ posts : reviewer
    posts ||--o{ post_media : post
    posts ||--o| roommate_post_details : post
    properties |o--o{ roommate_post_details : property
    posts ||--o| pass_room_post_details : post
    properties |o--o{ pass_room_post_details : property
    posts ||--o| pass_item_post_details : post
    posts ||--o{ comments : post
    users ||--o{ comments : author
    users ||--o{ community_notifications : recipient
    reports ||--o| community_report_evidence : report
    collected_posts ||--o{ collected_post_images : images
    users ||--o{ collected_posts : collectedBy
    users |o--o{ collected_posts : publishedBy
    users ||--o{ reports : reporter
    users |o--o{ reports : handler
    users ||--o{ feedbacks : user
    properties ||--o{ feedbacks : property
    users ||--o{ moderation_logs : staff
    users ||--o{ support_requests : requester
    properties |o--o{ support_requests : targetProperty
    support_requests ||--o{ support_logs : request
    users ||--o{ support_logs : performedBy
```

## ID scalar và phạm vi sơ đồ

`RentalContract`, `RoomTenancy`, `RoomBill` và các entity khác có ID snapshot/scalar: xem từng field trong catalog. Không vẽ chúng như FK nếu nguồn không khai báo quan hệ. Ràng buộc unique như activeRoomId/contractId và quy tắc transaction nằm trong annotation/service, không được suy ra chỉ từ đường nối ERD.

Bảng ảnh từ `ServiceImage` và các element collection được thể hiện bằng cạnh collection; `ServiceImage` không phải entity độc lập. Không suy rằng xóa node sẽ cascade: kiểm tra annotation cascade và logic soft delete trước khi thay đổi.
