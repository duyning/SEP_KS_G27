# Quyền xét duyệt hồ sơ nhà trọ

Đối chiếu Report 3, Permission Matrix chú thích 5, GB-02/04/05/06 và ProjectTracking sheet HL_RCS, hàng 13 (Review Property Submission của Ning). Admin giám sát, assigned Staff độc lập đưa quyết định. Tracking chưa được đổi trạng thái; task này không tuyên bố hoàn thành toàn bộ verification/publication theo SRS.

## Thay đổi lần này

Assignment đã tồn tại trong working tree và được giữ nguyên. Guard role và self-review đã được bổ sung ở task assignment trước. Lần này gia cố:

- `StaffController.review`: `hasRole('STAFF') and !hasRole('ADMIN')`. Quyền đọc ở class và `/api/staff/**` vẫn cho STAFF/ADMIN; không khóa mất Admin oversight.
- `PropertyVerificationAccess.reviewActor`: kiểm tra tài khoản ACTIVE/role từ database qua AuthService; từ chối role Admin và cả security context có `ROLE_ADMIN` khi đồng thời có `ROLE_STAFF`. Capability, reviewer/owner ID hoặc role client gửi không thay thế danh tính thực.
- `decision`: sau khóa/refresh assignment và tài khoản, kiểm tra applicant và ownership độc lập với eligibility thực hiện nghiệp vụ. Khóa/refresh Property đích trước mọi kết quả, không chỉ nhánh APPROVE.
- Nếu target không tồn tại, owner không khớp applicant, thiếu base registration hoặc base không còn là phiên bản hiện tại, trả 409 trong scope mà không ghi gì. Hồ sơ ngoài assignment/xung đột lợi ích vẫn 404; role bị cấm là 403; guest/inactive qua JWT là 401.
- `canReview` phản ánh policy đọc hiện tại, không đưa thêm tài liệu riêng lên frontend. Admin có thể đọc chi tiết/history/documents nhưng không được dùng các nút quyết định. Frontend chỉ cập nhật nội dung thông báo read-only, không redesign.

## Các đường được kiểm tra

- `GET /api/staff/verifications`, `/api/staff/dashboard`: scope assignment hiện có, Admin giám sát.
- `GET /api/staff/verifications/{id}`: gồm lịch sử moderation và submission.
- `GET /api/staff/verifications/{id}/files/{fileId}`: quyền riêng từng request, file phải thuộc đúng hồ sơ.
- `POST /api/staff/verifications/{id}/review`: một đường property review duy nhất, không có alias quyết định khác trong project. Kiểm tra controller và business service, không phụ thuộc frontend.
- Owner vẫn dùng `/api/host/property` và `/api/host/property/photos/{id}` theo ownership hiện có. Public photo tiếp tục dùng eligibility công khai, không biến giấy tờ thành ảnh công khai.

Các endpoint review đăng ký role Host, cộng đồng và dịch vụ gọi service khác và nằm ngoài task, không đổi policy hàng loạt.

## Xung đột lợi ích và transaction

So sánh ID `registration.user`, `Property.owner` với ID tài khoản đăng nhập. Kiểm tra cả Property liên kết với registration cũ và `targetPropertyId` của change request. Reviewer cũ/assigned Staff không được suy thành applicant. Tên/email hiển thị không dùng để quyết định quyền; test Staff A/B có cùng tên vẫn phải phân biệt đúng.

Mô hình hiện tại có một role enum trên User và một quan hệ `Property.owner`; không có bảng account quản lý ủy quyền. `managerName` là thông tin liên hệ văn bản, không phải một tài khoản được giao quản lý. Không tạo mô hình quản lý giả hoặc suy ID từ tên. Nếu team thêm quản lý ủy quyền, cần mở rộng cùng policy trước khi dùng quan hệ mới để cấp quyền.

Giữ owner → registration → actor locks hiện có, refresh sau khi lấy khóa để không dùng persistence context stale. Khóa Property đích trước quyết định, so `assignmentVersion`, trạng thái và base revision. Không đổi workflow cấp Host, publication/re-verification hoặc chống xử lý lặp. Mọi lỗi quyền xảy ra trước ghi business state/audit. Luồng này hiện chưa có notification service/entity; không thêm cơ chế notification mới trong task.

## Kiểm thử

`PropertyAssignmentSecurityTests` dùng HTTP Spring Boot/JPA/H2 riêng. Ma trận mới chạy cả APPROVE/REJECT/REQUEST_SUPPLEMENT trên NEW, RESUBMITTED và CHANGE:

- Assigned Staff hợp lệ được xử lý; reviewer được kiểm tra bằng `reviewed_by` trong DB.
- Admin thường, Admin được gán assignment bằng dữ liệu legacy, self-applicant, Staff sở hữu target/linked Property bị chặn.
- Guest, Member, Host, Staff khác, inactive, unassigned và stale version bị chặn; payload giả reviewer/owner/role không vượt quyền.
- Target thiếu hoặc ownership/base không xác định an toàn bị chặn cho cả ba quyết định.
- Gọi trực tiếp business service vẫn chặn Admin/dual authority. MockMvc với Spring Security thật kiểm tra controller chặn simultaneous STAFF/ADMIN; không mock business service.
- Mỗi request bị chặn được so sánh snapshot tất cả cột của registrations, properties, documents (cả bytes), moderation logs, submission/assignment events, users và user capabilities. Không đổi kết quả, quyền, dữ liệu công khai hoặc tạo successful moderation log.
- Admin vẫn đọc được list, chi tiết/history và tài liệu; kiểm thử ownership/upload/supplement/revision/public photos/rooms hiện có được giữ lại.
- Các ca transfer/revoke/concurrent decision/rollback từ task assignment tiếp tục chạy.

Frontend `check-property-assignment-ui.cjs` dùng response fixtures để kiểm tra UX khi mất quyền và Admin read-only. Đây không phải bằng chứng thay thế cho integration/security tests server.

Kết quả thực tế ngày 02/11/2026: `mvnw.cmd -q -Dspring.jpa.show-sql=false test` đạt **115 test, 0 failure/error/skipped**, trong đó 17 test assignment/security và 41 test workflow Host. `node --test frontend/tests/staff-api.test.js frontend/tests/supplement-request.test.js` đạt 7 test. Browser assignment UI đạt với role ADMIN thật trong fixture auth, 1 POST giả lập, 0 MySQL writes. Vite production build thành công; cảnh báo bundle lớn vẫn còn như trước.

Không có migration mới cho riêng lần gia cố này. Nếu chạy cùng task assignment chưa triển khai trước đó, vẫn cần cập nhật schema/restart như `verification-assignments.md`. Chưa commit/push hoặc chạy thay đổi trên MySQL thật.
