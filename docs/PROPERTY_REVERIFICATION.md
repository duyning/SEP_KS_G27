# Tái xác minh thông tin quan trọng — N05–N08

Triển khai 11/11/2026 cho Spring Boot/React. Tách riêng khỏi xác nhận độ mới phòng trống N01–N04; không sửa prototype giao_dien hoặc mobile.

## Quy tắc

So sánh đề nghị với snapshot Property.registration đã duyệt, không tin cờ do client gửi.

| Thay đổi | Cách xử lý |
| --- | --- |
| addressDetail hoặc commune | Tái xác minh, tạm ẩn |
| latitude hoặc longitude | Tái xác minh, tạm ẩn |
| managerName (người đại diện quản lý) | Tái xác minh, tạm ẩn |
| Thay nội dung tệp OWNERSHIP hoặc ID_CARD | Tái xác minh, tạm ẩn |
| Mô tả, tên, ảnh thông thường, tiện ích, quy định, điện thoại/Zalo | Duyệt nội dung theo luồng cũ; bản đã duyệt vẫn công khai |

Chuẩn hóa khoảng trắng/Unicode/hoa thường khi đối chiếu địa chỉ và tên người quản lý; tọa độ so theo giá trị số nên 21.0188 và 21.018800 không gây tái xác minh. Tài liệu đối chiếu nội dung byte, không lấy tên tệp làm căn cứ. Tệp tải lên vẫn qua validation hiện có.

Property thêm reverificationRequired (boolean default false) và reverificationReasonsJson; PropertyRegistration thêm reverificationReasonsJson để giữ lịch sử phạm vi xác minh. Không đổi status ACTIVE thành một trạng thái nghiệp vụ khác: flag công khai độc lập cho phép chủ trọ tiếp tục quản lý phòng. Các thay đổi ghi cùng transaction với đề nghị, tài liệu và submission event; gửi tệp sai sẽ rollback cả flag ẩn.

- Gửi đề nghị quan trọng → flag ẩn bật, lưu REVERIFICATION_SUBMITTED trong lịch sử.
- Staff yêu cầu bổ sung → tiếp tục ẩn, hiển thị nhận xét và trường cần sửa.
- Staff từ chối → tiếp tục ẩn, chủ trọ sửa đúng đề nghị đó và gửi lại.
- Gửi lại → vẫn giữ ID đề nghị, lịch sử và lý do tái xác minh; không tự gỡ flag dù đổi lại về nội dung cũ.
- Staff duyệt hợp lệ đúng baseline → áp dụng bản mới vào cùng Property, giữ phòng/loại phòng, gỡ flag và lý do ẩn. Nếu nhà trọ vốn INACTIVE vì lý do khác thì vẫn không tự chuyển ACTIVE.
- Không cho tạo đề nghị từ bản APPROVED cũ để bỏ qua hồ sơ tái xác minh đang tồn tại. Hãy sửa/gửi lại đề nghị bị từ chối/cần bổ sung.
- Chỉ mở form hoặc lưu nháp chưa làm nhà trọ bị ẩn. Chỉ gửi thành công mới thay trạng thái.

Giữ nguyên policy Staff/Admin và assignment/shared queue của project. Theo cấu hình mặc định hiện tại, assignment-required=false: Staff hợp lệ có thể xét duyệt trong shared queue; Admin chỉ giám sát. Nếu môi trường bật assignment-required=true, phải dùng đúng Staff được phân công; đề nghị mới không tự kế thừa phân công từ hồ sơ cũ. Bị chặn ngoài scope hoặc thiếu version không làm thay đổi flag công khai.

## Các đường công khai được bảo vệ

- PublicAccommodationPolicy: Search, summary/detail đầy đủ, ảnh room type, similar, publicSummaries cho wishlist/so sánh và eligibility lịch xem mới.
- PublicPropertyService: danh sách Home và ảnh property/room type theo đường public cũ.
- PropertyRepository.findPublicProfiles: các dữ liệu hồ sơ vị trí phục vụ truy vấn công khai/khoảng cách cũng bỏ qua nhà trọ bị ẩn.
- Wishlist giữ tham chiếu đã lưu nhưng available=false và accommodation=null; không lộ snapshot riêng tư.
- Không làm mới mốc xác nhận phòng trống, không sửa số phòng và không tự hủy các lịch xem đã có.

Không có API AI tìm nhà trọ thật được bổ sung trong task này; các bên tích hợp AI sau này phải đọc cùng nguồn công khai đã được lọc, không đọc trực tiếp repository bỏ qua flag.

## Host và staff nhìn thấy gì?

Host API /api/host/property và edit snapshot thêm reverificationRequired/reverificationReasons. verified=false khi đang bị ẩn; thẻ hiển thị “Chờ tái xác minh” cùng banner giải thích lý do. Trang hồ sơ vẫn cho xem bản đã duyệt và các đề nghị riêng; mốc/số phòng trống hoàn toàn độc lập. Hồ sơ bị từ chối/cần bổ sung có liên kết mở đúng registrationId để sửa và gửi lại.

Staff queue có nhãn “Tái xác minh”; loại bỏ duyệt nhanh cho loại hồ sơ này để mở trang thẩm định. Detail có lý do tạm ẩn, bảng đối chiếu bản đã duyệt/đề nghị mới (kể cả vĩ độ/kinh độ), hồ sơ tài liệu và lịch sử. Sau duyệt, phần so sánh vẫn dùng baseRegistrationId để giữ được bản trước đó thay vì tự so bản mới với chính nó.

## Cách tự kiểm tra trên hệ thống

1. Stop ứng dụng cũ trong IntelliJ, Run lại HL-RCS Full Stack. Frontend mặc định http://127.0.0.1:5173. Backend development ddl-auto=update thêm cột nullable/default; dữ liệu hiện có được giữ nguyên.
2. Đăng nhập chủ trọ. Chọn một nhà trọ ACTIVE đã duyệt và có loại phòng đủ giá/diện tích để thấy trên Search. Mở cửa sổ ẩn danh, tìm nhà trọ và lưu lại link chi tiết để kiểm tra trước/sau.
3. Ở host, vào Nhà trọ của tôi → chọn nhà trọ → Đề nghị thay đổi thông tin. Chỉ đổi mô tả rồi gửi. Khách tải lại vẫn thấy bản mô tả cũ. Cho Staff xử lý xong đề nghị này trước khi thử lần tiếp theo (không gửi đồng thời hai đề nghị).
4. Mở sửa nhà trọ đã duyệt lần nữa, đổi địa chỉ cụ thể (ví dụ số 18 thành số 99), đồng thời sửa vị trí ghim cho phù hợp nếu cần. Chấp nhận cam kết và gửi đề nghị.
5. Host tải lại thấy “Nhà trọ tạm ẩn — cần tái xác minh”, danh sách lý do thay đổi và trạng thái chờ duyệt. Loại phòng, các Room, số trống và lần xác nhận phòng vẫn giữ nguyên.
6. Cửa sổ khách tải lại Search/Home: nhà trọ không còn xuất hiện. Mở lại link chi tiết đã lưu: nhận trạng thái không còn công khai. Nếu đã lưu yêu thích thì mục không còn khả dụng, không hiện nội dung riêng tư.
7. Mở một trình duyệt/profile khác, đăng nhập Staff (không dùng Admin để duyệt). Vào Xác minh nhà trọ → Chờ xác minh, mở hồ sơ gắn nhãn Tái xác minh. Đối chiếu địa chỉ cũ/mới, bản đồ, giấy tờ và lịch sử; nếu môi trường dùng assignment thì chọn đúng nhân viên có quyền.
8. Thử Yêu cầu bổ sung, chọn trường và ghi hướng dẫn. Host tải lại sẽ thấy yêu cầu, bấm Chỉnh sửa / bổ sung hồ sơ tái xác minh, cập nhật các trường được mở rồi gửi lại. Nhà trọ vẫn tạm ẩn.
9. Có thể thử Từ chối với lý do. Nhà trọ tiếp tục ẩn; host sửa/gửi lại cùng đề nghị, không tạo nhà trọ mới.
10. Staff mở hồ sơ mới nhất, kiểm tra đủ dữ liệu và bấm Phê duyệt & Xuất bản. Host tải lại: banner tạm ẩn biến mất, thông tin mới được áp dụng. Khách tải lại Search/Home/link chi tiết: nhà trọ xuất hiện với địa chỉ mới nếu các điều kiện công khai khác vẫn hợp lệ.
11. Kiểm tra danh sách phòng: ID phòng, số phòng, giá/trạng thái và xác nhận phòng trống không bị reset. Một nhà trọ khác của chủ trọ vẫn giữ nguyên trạng thái.

Để thử nhánh giấy tờ: thay một tệp CCCD/giấy tờ quản lý bằng tệp hợp lệ khác trong đề nghị sửa. Dù giữ nguyên địa chỉ vẫn yêu cầu tái xác minh. Gửi tệp lỗi thì phải báo lỗi và nhà trọ không bị ẩn do một thao tác gửi thất bại.

## Schema, phạm vi và kiểm chứng

`sql/migrations/20261111_property_reverification.sql` là script MySQL bổ sung chạy lại được cho môi trường quản lý schema thủ công. Không tự gắn cờ hàng loạt hồ sơ cũ; các đề nghị tồn tại trước phiên bản này không được tự phân loại lại. N09–N10 (nghiệm thu đầy đủ liên nhóm và migration dữ liệu lịch sử) là phạm vi riêng.

Backend dùng H2 cô lập: PropertyReverificationTests kiểm tra từng nhóm trường/format; HostDashboardTests có luồng đầy đủ ẩn → bổ sung → từ chối → gửi lại → duyệt, giữ dữ liệu Room, chặn link/ảnh công khai/wishlist, cùng rollback tệp sai. Kiểm tra thêm AccommodationTests, FavoriteTests, PropertyAssignmentSecurityTests và hồi quy AvailabilityConfirmationTests. Không thay đổi dữ liệu MySQL thật để thử luồng này.

Frontend tests: property-reverification.test.js, host-management, host-api, staff-verifications, verification-detail. Browser fixture trong frontend/scripts/check-property-reverification.cjs; ảnh ở target/reverification-browser, không gửi business writes. Bản đồ Google Maps không được xác minh kết nối trong bộ fixture (chặn network ngoài localhost); kiểm tra thay đổi vị trí backend và phần đối chiếu dữ liệu riêng.

Kết quả kiểm tra 11/11/2026: 91 backend tests qua (gồm hồi quy xác nhận phòng),
30 frontend tests liên quan qua và Vite production build qua. Browser Edge headless
kiểm tra host/staff tại 375/768/1024/1440px, banner pending/supplement/rejected,
so sánh địa chỉ cũ/mới, nhãn hàng đợi, zoom 200% và điều hướng bàn phím đã qua.
Đã xem ảnh host mobile và staff desktop. Không kiểm tra migration trên MySQL thật;
người dùng cần restart backend rồi thử đề nghị mới theo các bước trên.
