# HL-RCS — ERD theo JPA hiện tại

Đối chiếu ngày **2026-11-05**, commit `350dc13`; **29 entities**, tách thành 5 sơ đồ để dễ đọc.
Nguồn: [entity catalog](ENTITY_CATALOG.md) và `src/main/java/org/hlrcs/entity/`. Không tìm thấy file ERD riêng trong repository trước lượt đọc này; các sơ đồ dưới đây được dựng từ JPA, không phải schema live.

Trong sơ đồ, tên hộp là **tên bảng**. `||` = đúng 1, `o{` = 0..n, `o|`/`|o` = 0..1.
Nhãn cạnh là tên Java relationship. Node ngoài miền được lặp lại để giữ ngữ cảnh. Các attributes scalar đầy đủ nằm trong ENTITY_CATALOG.

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
    users ||--o{ user_capabilities : user
    capabilities ||--o{ user_capabilities : capability
```

## Nhà trọ, loại phòng và phòng vật lý

```mermaid
erDiagram
    property_registrations {
        int registration_id PK
    }
    property_documents {
        int document_id PK
    }
    properties {
        int property_id PK
    }
    room_types {
        int room_type_id PK
    }
    rooms {
        int room_id PK
    }
    room_type_images {
        int image_id PK
    }
    room_type_videos {
        int video_id PK
    }
    amenities {
        int amenity_id PK
    }
    room_type_amenities {
        int room_type_id PK,FK
        int amenity_id PK,FK
    }
    users ||--o{ property_registrations : user
    users |o--o{ property_registrations : reviewer
    property_registrations ||--o{ property_documents : registration
    users ||--o{ properties : owner
    property_registrations |o--o| properties : registration
    properties ||--o{ room_types : property
    properties ||--o{ rooms : property
    room_types ||--o{ rooms : roomType
    room_types ||--o{ room_type_images : roomType
    room_types ||--o{ room_type_videos : roomType
    room_types ||--o{ room_type_amenities : roomType
    amenities ||--o{ room_type_amenities : amenity
```

## Onboarding và dịch vụ công khai

```mermaid
erDiagram
    service_categories {
        int category_id PK
    }
    service_registrations {
        int registration_id PK
    }
    service_documents {
        int document_id PK
    }
    services {
        int service_id PK
    }
    users ||--o{ service_registrations : user
    service_categories ||--o{ service_registrations : category
    users |o--o{ service_registrations : reviewer
    users |o--o{ service_registrations : assignedStaff
    service_registrations ||--o{ service_documents : registration
    services |o--o{ service_registrations : targetService
    users ||--o{ services : provider
    service_categories ||--o{ services : category
    service_registrations |o--o| services : registration
```

## Cộng đồng

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
```

## Tương tác và vận hành

```mermaid
erDiagram
    bookings {
        int booking_id PK
    }
    wishlists {
        int wishlist_id PK
    }
    feedbacks {
        int feedback_id PK
    }
    reports {
        int report_id PK
    }
    support_requests {
        int request_id PK
    }
    support_logs {
        int log_id PK
    }
    moderation_logs {
        int log_id PK
    }
    users ||--o{ bookings : renter
    room_types ||--o{ bookings : roomType
    users ||--o{ wishlists : user
    room_types ||--o{ wishlists : roomType
    users ||--o{ feedbacks : user
    properties ||--o{ feedbacks : property
    users ||--o{ reports : reporter
    users |o--o{ reports : handler
    users ||--o{ support_requests : requester
    properties |o--o{ support_requests : targetProperty
    support_requests ||--o{ support_logs : request
    users ||--o{ support_logs : performedBy
    users ||--o{ moderation_logs : staff
```

## Các ràng buộc cần đọc cùng ERD

- `User` N–N `Capability` qua UserCapability, có status/grantedAt. Không có entity Provider riêng: `services.provider_id` trỏ `users.user_id`.
- RoomType N–N Amenity qua RoomTypeAmenity với composite PK. RoomType còn có amenitiesJson; ERD không khẳng định hai cách lưu đồng bộ.
- `Property.registration_id` và `Service.registration_id` là OneToOne nullable, tương ứng mỗi hồ sơ có tối đa một kết quả. Owner/provider có thể có nhiều row theo cardinality JPA; quy tắc onboarding có thể chặt hơn trong service.
- `Room` liên kết cả Property và RoomType. Ràng buộc cùng một Property được business service kiểm tra; ERD không biểu diễn được quy tắc liên bảng đó. Room number unique theo Property.
- Booking trỏ RoomType, không phải Room. Wishlist cũng trỏ RoomType; Feedback trỏ Property.
- Các PostDetail dùng PK đồng thời FK tới Post. Đúng subtype theo postType cần business logic; sơ đồ không khẳng định database bảo đảm chỉ một subtype.
- Cạnh assignedStaff là FK lịch sử; quyền xét duyệt dịch vụ hiện không phụ thuộc assignment. Mọi active STAFF/ADMIN được xử lý hồ sơ, trừ tự xét duyệt.
- ModerationLog và Report có targetType/targetId dạng polymorphic; chỉ staff/reporter/handler là các FK được vẽ. Không vẽ FK giả tới các bảng đích.
- Phân biệt cascade trong SQL tham khảo với cascade trong JPA. Không suy ra hành vi xóa từ sơ đồ này.
- Trước thay đổi database, đối chiếu [schema drift](ENTITY_CATALOG.md#khác-biệt-cột-với-sqlschemasql) và kiểm tra schema live nếu được yêu cầu.

## Bổ sung bộ ảnh dịch vụ — 2026-11-08

```mermaid
erDiagram
    service_registrations ||--o{ service_registration_images : additionalImages
    service_registration_images {
        int registration_id FK
        int image_position
        blob image_content
        string content_type
    }
```

Bảng collection của embeddable ServiceImage; ảnh đại diện vẫn lưu trên service_registrations. Thứ tự ảnh được giữ bằng image_position.
