# Phân công Staff xác minh nhà trọ

> Cập nhật: vận hành thường đã có [tự động phân công](automatic-verification-assignment.md).
> Phần provisioning thủ công bên dưới chỉ dành cho phát triển/test; không còn là
> cách cấp người phụ trách cho hồ sơ mới trong vận hành.

> Chế độ hiện tại: `app.verification.assignment-required=false`, Staff dùng hàng
> đợi chung và có thể xử lý mà chưa cần phân công. Các giới hạn assigned Staff
> mô tả bên dưới chỉ áp dụng khi bật lại `assignment-required=true`; chống tự
> xét duyệt, kiểm tra sở hữu, role và khóa chống ghi đồng thời luôn được giữ.

## Nguồn yêu cầu và khoảng trống

Đối chiếu `Docs/ProjectTracking.xlsx`, sheet `HL_RCS`, hàng 12 (Assigned Verification Queue của Ning), cùng Report 3, Permission Matrix chú thích 5 và GB-02/04/05/06. Tracking đang ghi To Do; tài liệu gốc không được sửa hoặc đánh dấu Done bằng task này.

Trước thay đổi, `StaffService` đọc mọi hồ sơ/tài liệu và toàn bộ lịch sử property trên dashboard; controller cho cả Admin ra quyết định. Entity chỉ có reviewer, chưa có người phụ trách. Quyền role ở URL không bảo vệ việc đổi ID.

SRS và tracking đều yêu cầu assigned Staff, Admin giám sát. Đây là khác biệt với code cũ, không phải mở rộng quyền Admin. Chỉ thay chính sách phân công xác minh nhà trọ; không phân công community/service, không sửa đăng ký/cấp role Host.

## Mô hình và chính sách vòng đời

- `property_registrations.assigned_staff_id`: tài khoản chịu trách nhiệm hiện tại, có thể null. `reviewed_by` vẫn là người thực tế ghi quyết định.
- `assignment_version`: số nguyên tăng sau mỗi giao/chuyển/thu hồi. Hồ sơ cũ bắt đầu null/0, Staff không được tự động đọc.
- `property_assignment_events`: audit append-only theo service, gồm hồ sơ, phiên bản, ID cũ/mới, hành động, thời điểm, danh tính `SYSTEM:assignment-dev:<operator>`. Không lưu nội dung giấy tờ. Unique `(registration_id, assignment_version)`.
- Không có UI hoặc HTTP API phân công. Staff/applicant không tự sửa assignment. Seed có compare-and-set cả version và người cũ; lệnh trùng vừa chạy thành công là no-op; lệnh stale không được ghi đè.
- Người mới phải là Staff ACTIVE, không phải applicant/owner của hồ sơ hay owner của property đích. Codebase hiện chỉ có `Property.owner`, chưa có bảng tài khoản quản lý được ủy quyền. Không dùng tên `managerName` để suy quyền.
- Nộp bổ sung trên cùng hồ sơ giữ assignment hiện tại và version; nếu đã thu hồi thì vẫn unassigned. Không phục hồi quyền bằng hành động nộp lại.
- Revision của bản đã duyệt là hồ sơ mới, null/0; cần lệnh phân công riêng. Không sao chép assignment/reviewer để cấp quyền đọc revision.
- Quyết định cuối không tự kết thúc assignment: Staff còn trách nhiệm xem hồ sơ đến khi chuyển/thu hồi rõ ràng. Đây là giả định tối thiểu vì tài liệu chưa quy định thời điểm kết thúc; không có quyền đọc từ assignment quá khứ. Team cần xác nhận nếu muốn tự thu hồi sau quyết định.
- Thu hồi/chuyển giao làm Staff cũ mất quyền cả chi tiết, metadata tài liệu, ảnh riêng và lịch sử. Khi Staff bị khóa/đổi role, không đọc/quyết định; assignment không tự chuyển cho người khác. Kích hoạt lại Staff khôi phục quyền của assignment vẫn còn, trừ khi đã thu hồi.
- Admin ACTIVE được giám sát tất cả; không có quyền approve/reject/request supplement. Applicant/owner giữ đường truy cập ownership hiện có.

## API và transaction

`GET /api/staff/verifications` trả **mảng đã giới hạn trong query server**. Tìm kiếm/phân trang hiện có trên giao diện chỉ nhận mảng thuộc phạm vi này; không tải toàn hệ thống rồi ẩn bản ghi. Dashboard lấy cùng scope, gồm queue property, pending count, active property count, log và processed count liên quan property.

`GET /api/staff/verifications/{id}` bảo vệ chi tiết, lịch sử moderation/submission và thông tin phiên bản trước. `GET /api/staff/verifications/{id}/files/{fileId}` kiểm tra lại quyền, file thuộc đúng hồ sơ, chưa archived, MIME hợp lệ. Các đường owner photo/public photo vẫn dùng chính sách riêng; giấy tờ pháp lý không được biến thành ảnh công khai.

`POST /api/staff/verifications/{id}/review` chỉ role STAFF, còn kiểm tra ACTIVE/assignment/conflict trong service. Body bắt buộc thêm `assignmentVersion` từ response detail. Bỏ token nhận 400; không còn phân công nhận 404 cùng thông báo với hồ sơ không tồn tại; token cũ nhưng đã được giao lại cho chính người đó nhận 409. Admin nhận 403.

Review, resubmission và provisioning khóa theo thứ tự owner → registration. Review refresh entity sau khi lấy PESSIMISTIC_WRITE để tránh persistence context cũ, rồi khóa/refresh Staff và so phiên bản trước mọi thay đổi. Transfer/revoke dùng cùng khóa: thao tác đã commit trước review sẽ được thấy; transfer đến sau review phải chờ transaction trước kết thúc. Hai quyết định không ghi đè. Audit/quyết định/tài liệu/property cùng transaction và rollback cùng nhau.

Không thêm endpoint history thứ hai. History trong detail và dashboard đều qua scope. Thông tin của assignment cũ không tạo quyền đọc mới.

Frontend không redesign. Hiển thị Staff phụ trách riêng reviewer; dùng `canReview` để biểu thị trạng thái. Khi file/review trả 403/404 thì đóng modal, hủy URL blob và bỏ dữ liệu hồ sơ khỏi màn hình. Kiểm tra lại khi focus và mỗi 30 giây lúc tab hiển thị; version/state đổi thì đóng quyết định stale. Lỗi kết nối giữ thông tin; server vẫn là nơi thực thi quyền. Dữ liệu đã được tải trước khi thu hồi không thể bị xóa khỏi máy người đã tải.

## Migration và khởi chạy

Dùng cơ chế có sẵn: Hibernate `ddl-auto=update` tạo các cột, index, FK và bảng event; `VerificationAssignmentSchema` là additive MySQL compatibility runner theo mẫu `DocumentMetadataSchema`. Không xóa/tạo lại database, không đổi status/property/publication và không gán hồ sơ cũ. Không đổi mật khẩu hoặc cấu hình MySQL.

Khởi động lại backend để áp dụng schema, sau đó cập nhật frontend cùng phiên bản vì review cần assignmentVersion. Runner MySQL được viết cho cấu hình `update` hiện tại, không thay thế công cụ migrate khi chuyển sang `validate`/production migration riêng. Migration MySQL cần chạy trên bản sao/staging trước; kiểm thử tự động task này dùng H2 riêng, không chạy thay đổi lên MySQL thật.

## Phân công thử A/B có kiểm soát

1. Dùng DB phát triển riêng. Tra ID thật, không dựa vào tên hiển thị:

```sql
SELECT user_id, email, role, status FROM users WHERE role='STAFF';
SELECT registration_id, user_id, assigned_staff_id, assignment_version, status
FROM property_registrations ORDER BY registration_id;
```

2. Sao chép `config/verification-assignments.example.json` sang một file local ngoài git; thay 101/102 bằng hai hồ sơ và 201/202 bằng Staff A/B thật. Ví dụ là dữ liệu cấu hình, không tự tạo hồ sơ/tài khoản.
3. Chỉ khi chủ động phân công, khởi động từ thư mục project bằng PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE='mysql,assignment-dev'
$env:APP_VERIFICATION_ASSIGNMENTS_ENABLED='true'
$env:APP_VERIFICATION_ASSIGNMENTS_FILE='C:\dev-config\verification-assignments.json'
$env:APP_VERIFICATION_ASSIGNMENTS_OPERATOR='developer-email-or-id'
.\mvnw.cmd spring-boot:run
```

Sau đó tắt runner khi chạy thông thường (xóa các biến `APP_VERIFICATION_ASSIGNMENTS_*`, dùng profile mysql). Runner không có trong profile mysql mặc định; cả runner/service provisioning đều không có khi active `prod` hoặc `production`, kể cả bật kèm assignment-dev/test. Không bật profile phát triển/test cho deployment thực tế.

4. Chuyển hồ sơ 101 từ A sang B ở version 1, file chỉ chứa lệnh chủ động này:

```json
[{"registrationId":101,"expectedVersion":1,"expectedStaffId":201,"newStaffId":202}]
```

5. Thu hồi sau chuyển giao ở version 2:

```json
[{"registrationId":101,"expectedVersion":2,"expectedStaffId":202,"newStaffId":null}]
```

Không tái dùng file khởi tạo cũ để cố ghi đè khi phân công đã thay đổi. Mỗi lệnh là một transaction độc lập; nếu lệnh sau lỗi, các lệnh trước đã thành công vẫn có audit, không có cam kết atomic cho cả file. Chạy lại đúng lệnh vừa thành công không tạo bản ghi trùng.

## Kiểm chứng

- `PropertyAssignmentSecurityTests`: HTTP thật, server Spring Boot/JPA/H2 riêng; không mock service/fetch. Kiểm tra guest, Member/Host, Staff A/B, Admin, inactive/role đổi, ID/file/history/dashboard, mass assignment, transfer/revoke/stale token, concurrent transfer, concurrent decisions và rollback.
- `DevelopmentVerificationAssignmentGateTests`: provisioning không tồn tại trong profile mặc định hoặc production.
- `HostDashboardTests`: các fixture workflow chủ động gán quyền trước khi review; hồi quy supplement/revision/upload/publication/rooms giữ nguyên, thêm xác nhận revision unassigned và supplement giữ assignment.
- Frontend: staff-api/supplement tests và `scripts/check-property-assignment-ui.cjs` (API giả lập) kiểm tra token, quyền giám sát, 404 khi file/review và kiểm tra lại khi focus. Browser test không phải bằng chứng bảo mật server; bằng chứng là integration tests phía trên.

Kết quả chạy ngày 02/11/2026: toàn bộ backend 109 test, 0 failure/error/skipped (11 test assignment security, 1 test profile gate, 41 test Host workflow và các suite hiện có). Lệnh: `mvnw.cmd -q -Dspring.jpa.show-sql=false test`. Frontend staff-api/supplement: 7 test đạt; browser assignment UI đạt với 1 POST giả lập, 0 MySQL writes. Vite production build thành công; còn cảnh báo kích thước bundle hiện có. Chưa chạy migration hoặc provisioning trên MySQL thật.

## Các khác biệt SRS chưa thuộc task

API đăng ký hiện vẫn yêu cầu Host/Admin; mở cho Member active trước khi là Host là đầu việc khác trong tracking. Mô hình chưa có quan hệ delegated manager/assistance document grant nên không tự tạo quyền đó. Verification/publication chưa tách đủ kết quả riêng theo GB-06; re-verification/publication hiện có khác GB-09. Task giữ nguyên các chính sách này theo giới hạn yêu cầu, không tuyên bố hoàn tất toàn bộ UC-14/15/17 hoặc tự thay đổi publication. Đăng ký/cấp role Host, assignment cho dịch vụ/cộng đồng và UI điều phối không thay đổi.
