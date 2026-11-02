# Tự động phân công xác minh nhà trọ

## Chính sách

Tự động phân công áp dụng cho hồ sơ xác minh nhà trọ mới và đề nghị thay đổi
thông tin đã duyệt. Không áp dụng cho xét cấp role Chủ trọ, dịch vụ hoặc cộng đồng.
Không tạo tài khoản hay dữ liệu mẫu.

- Chỉ chọn tài khoản `STAFF`, `ACTIVE`, không phải người nộp hoặc chủ sở hữu
  nhà trọ liên quan theo `PropertyVerificationAccess.conflict`.
- Ưu tiên tổng hồ sơ `PENDING` + `NEEDS_SUPPLEMENT` ít nhất. Nếu bằng nhau,
  ưu tiên người chưa từng được phân công hoặc có lần phân công gần nhất cũ hơn;
  dùng ID để phân định khi thời điểm bằng nhau.
- Hồ sơ đã có Staff không bị tự động chuyển giao, kể cả khi bổ sung/gửi lại.
  Staff đã ngừng hoạt động cũng không bị âm thầm thay thế; cần điều phối riêng.
- Chỉ phân công hồ sơ `PENDING`. Không có Staff phù hợp thì giữ nguyên hồ sơ
  chờ và người phụ trách null; Admin có thể xem bộ lọc Chờ phân công.
- Quyền đọc và quyết định của Staff vẫn dựa trên người phụ trách trong database.

## Transaction và chạy lại

Service đăng ký/gửi lại phát sự kiện trong transaction. Listener chỉ chạy sau
commit, dùng transaction mới để phân công. Lỗi phân công không làm mất hồ sơ đã
gửi; lần quét sau sẽ thử lại. Rollback hồ sơ không phát sinh phân công.

Bảng `verification_assignment_queue` có hàng ID 1 được tạo khi ứng dụng khởi
động. Khóa ghi hàng này điều phối việc lựa chọn giữa các instance cùng database;
sau đó khóa/refresh hồ sơ và Staff trước khi ghi. Phân công và audit
`SYSTEM:auto-assignment` được commit cùng nhau; tăng `assignment_version` đúng
một lần. Một hồ sơ được xử lý lại không tạo thêm audit nếu đã có Staff.

Scheduler bắt đầu sau 30 giây và quét lại mỗi 60 giây. Đọc theo lô 100 ID, tiếp tục
qua các lô để hồ sơ cũ chưa có người phù hợp không chặn hồ sơ phía sau. Các hồ sơ
cũ đang chờ và chưa có người phụ trách cũng được xem xét sau khi triển khai.

## Cấu hình

Trong `application.properties`:

```properties
app.verification.auto-assignment.enabled=${AUTO_VERIFICATION_ASSIGNMENT_ENABLED:true}
app.verification.auto-assignment.initial-delay-ms=30000
app.verification.auto-assignment.retry-delay-ms=60000
```

Khởi động lại backend để áp dụng. Với cấu hình `ddl-auto=update` hiện tại,
Hibernate bổ sung bảng điều phối. Môi trường dùng migration/schema thủ công cần
tạo bảng `verification_assignment_queue (id INTEGER PRIMARY KEY)` trước khi chạy;
ứng dụng tự tạo hàng 1. Giữ các bảng/cột phân công đã có.

Staff thấy hồ sơ trong danh sách xác minh/dashboard theo quyền hiện có. Project
chưa có notification service/entity cho nghiệp vụ này; chưa gửi email, push hoặc
thêm thông báo chuông giả. Admin theo dõi người phụ trách ở Giám sát phân công.

## Kiểm thử

`AutomaticVerificationAssignmentTests` dùng H2 riêng, bật auto assignment và giữ
scheduler chưa chạy trong thời gian test: chọn tải thấp nhất, tie-break, Staff
không hoạt động/role khác, xung đột người nộp/chủ sở hữu, giữ Staff cũ, retry,
commit/rollback sự kiện, rollback audit và xử lý nhiều lượt đồng thời. Các test
nghiệp vụ cũ tắt auto assignment để fixture phân công vẫn được kiểm soát rõ ràng.
Không chạy thử ghi dữ liệu trên MySQL của người dùng.

Kết quả kiểm tra: 9 test tự động phân công đạt; toàn bộ regression backend đạt
128 test, không có failure/error/skipped.
