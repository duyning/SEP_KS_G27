# Giải thích Class Diagram tổng thể HL-RCS

## File và cách mở

Mở **HL-RCS-Class-Diagram.drawio** bằng draw.io/diagrams.net: **File → Open From → Device**. File có **một trang, một sơ đồ**, mọi hộp lớp và đường nối đều chỉnh sửa được, không phải ảnh dán vào canvas. Dùng zoom để xem từng vùng.

Sơ đồ đối chiếu mã nguồn ngày 18/11/2026, gồm 90 lớp/interface: 14 controller, 15 application service/interface/implementation, 25 repository, 35 domain class (entity và embeddable), cùng interface thư viện JpaRepository. Có 214 đường quan hệ. Các vùng chức năng chỉ dùng để bố trí, không phải package Java mới.

## Cách đọc hộp lớp

Mỗi hộp gồm tên và stereotype ở trên; thuộc tính ở giữa; phương thức ở dưới. Dấu `−` là private, `+` là public. `name: Type` chỉ tên thuộc tính và kiểu dữ liệu. `«interface»` là giao diện; `«entity»` là lớp lưu trữ JPA; `«value object»` là embeddable.

Để vừa sơ đồ tổng thể, mỗi lớp chỉ hiện tối đa 5 thuộc tính được chọn và 5 phương thức. `(…)` biểu thị chữ ký phương thức được rút gọn, không có nghĩa phương thức không nhận tham số. Kiểu trả về và overload được lược bỏ. `«Lombok accessors»` ghi nhận getter/setter sinh từ Lombok, không phải tên một phương thức. Không thêm các phương thức nghiệp vụ tưởng tượng vào entity.

## Ký hiệu quan hệ

- **Nét liền, mũi tên mở:** association có hướng. Ví dụ AuthController giữ tham chiếu authService tới AuthService; Service giữ provider tới User. Tên trên đường là tên thuộc tính trong mã nguồn.
- **Nét đứt, mũi tên mở:** dependency. Repository dùng entity làm tham số kiểu; nhãn ghi T và ID thực tế.
- **Nét liền, tam giác rỗng:** generalization. Repository kế thừa interface JpaRepository; đây là kế thừa interface, không phải entity kế thừa repository.
- **Nét đứt, tam giác rỗng:** realization. AuthServiceImpl hiện thực interface AuthService.
- **Hình thoi đặc ở đầu chủ sở hữu:** composition dành cho giá trị nhúng, như ServiceRating chứa ServiceImage hoặc RoomTypeAmenity chứa RoomTypeAmenityId. Không gán composition cho dependency injection.
- **1, 0..1, 0..\*:** đúng một, không hoặc một, không hoặc nhiều đối tượng. Tính tùy chọn theo annotation JPA/JoinColumn hiện tại; không phải kết luận về schema MySQL đang chạy. Các association injection không ghi multiplicity.

## Giải thích các phần chính

### Tài khoản và quyền

AuthController nhận yêu cầu tài khoản rồi gọi AuthService. AuthServiceImpl hiện thực nghiệp vụ và sử dụng UserRepository, UserCapabilityRepository. UserCapability liên kết User với Capability. Các role USER, ROOM_HOST, STAFF, ADMIN là giá trị enum của User; không phải các lớp con. Nhà cung cấp dịch vụ là User có capability MANAGE_SERVICE, không có entity Provider riêng.

### Nhà trọ và phòng

PropertyRegistration lưu hồ sơ đăng ký; Property là nhà trọ. StaffService xử lý thẩm định. Một Property có thể được nhiều RoomType tham chiếu; một RoomType được nhiều Room tham chiếu. RoomTypeAmenity liên kết RoomType với Amenity qua khóa RoomTypeAmenityId. Booking gắn người dùng với loại phòng để đặt lịch xem, không phải hợp đồng thuê hay đơn dịch vụ. Wishlist cũng gắn với RoomType; Feedback gắn với Property.

### Dịch vụ và hồ sơ

ServiceRegistrationController gọi ServiceRegistrationService để nhận hồ sơ/đề nghị thay đổi. ServiceReviewController gọi ServiceReviewService để xét duyệt. ServiceRegistration là đề nghị/snapshot; Service.registration trỏ bản đã duyệt, còn targetService trong hồ sơ trỏ dịch vụ được đề nghị thay đổi. Hai liên kết này có ý nghĩa khác nhau và đều được giữ trong sơ đồ.

Service.provider liên kết User, Service.category liên kết ServiceCategory. ServicePublicationService kiểm tra khả năng công khai. PublicServiceController có tham chiếu repository trực tiếp theo mã hiện tại, vì vậy sơ đồ không ép mọi luồng đi qua một lớp service trung gian.

### Đánh giá, báo cáo và yêu cầu dịch vụ

ServiceRating liên kết Service và User tác giả. Mỗi cặp dịch vụ/người dùng chỉ có một đánh giá; stars từ 0 đến 5. Phản hồi nhà cung cấp được lưu tại reply/repliedAt của ServiceRating, không tạo lớp Reply giả định.

ServiceComplaint liên kết Service và User báo cáo. ServiceComplaintEvent liên kết báo cáo với User thực hiện xử lý; các event lưu lịch sử giải trình/quyết định. ServiceComplaintService điều phối truy cập, kiểm tra revision, ghi lịch sử và quyết định. moderationHidden trên Service có thể ngăn công khai độc lập với snapshot đã duyệt.

ServiceRequest là yêu cầu khách gửi cho nhà cung cấp, khác với ServiceRegistration (hồ sơ xét duyệt) và SupportRequest (hỗ trợ).

### Cộng đồng và hỗ trợ

Post liên kết tác giả, người duyệt, media, bình luận và các lớp chi tiết. RoommatePostDetail, PassRoomPostDetail, PassItemPostDetail dùng OneToOne/MapsId tới Post, không dùng JPA inheritance. Report và ModerationLog có targetType/targetId: đây là tham chiếu đa hình do ứng dụng diễn giải, nên không vẽ FK/association giả tới mọi entity.

## Phạm vi và giới hạn

Đây là class diagram thiết kế backend tổng thể, không phải ERD hay sequence diagram. Các đường nối không biểu thị thứ tự chạy. Sơ đồ lược DTO, enum, security framework, cấu hình, helper, chi tiết constructor và phụ thuộc thư viện ngoài (trừ JpaRepository). Frontend React sử dụng function component nên không tự chuyển thành các lớp Java. Sự tồn tại của entity cộng đồng/hỗ trợ không chứng minh toàn bộ workflow đã có API.

Đã kiểm tra XML hợp lệ, đúng một trang, không trùng ID và toàn bộ đầu nối tham chiếu tới node có thật. Chưa kiểm tra trực tiếp thao tác mở bằng ứng dụng draw.io.
