# Vòng bổ sung hồ sơ dịch vụ

## Luồng sử dụng

1. Staff/Admin mở `/staff/service-applications?id=...`, nhập yêu cầu cụ thể trong ô lý do và bấm **Yêu cầu bổ sung**. Chỉ hồ sơ PENDING, đúng revision được chuyển sang NEEDS_SUPPLEMENT. Không cần phân công; không tự xử lý hồ sơ của mình.
2. Chủ hồ sơ mở **Đăng ký cung cấp dịch vụ / Xem hồ sơ** ở `/services`. Yêu cầu, người yêu cầu và thời gian được hiển thị. Form được điền từ thông tin đã lưu. Chủ hồ sơ sửa các trường thông tin dịch vụ/liên hệ, chọn tài liệu giữ lại, tải mới và mô tả phần đã bổ sung.
3. **Nộp lại hồ sơ xét duyệt** cập nhật chính application ID, tăng revision, lưu thời gian/nội dung nộp lại và đưa về PENDING trong hàng đợi Staff/Admin hiện có. Đây là nộp lại nguyên tử, không phải tạo hồ sơ mới hoặc API lưu nháp.
4. Staff/Admin tải phiên bản mới rồi duyệt/từ chối hoặc yêu cầu bổ sung tiếp. Quyết định capability/listing, cấp quyền và public eligibility sử dụng luồng xét duyệt hiện có. Trong lúc NEEDS_SUPPLEMENT hoặc PENDING chưa có quyền/dịch vụ mới được cấp.

## Contract

- `POST /api/staff/service-applications/{id}/supplement-request`: JSON `{ "reason": "Nội dung cần bổ sung cụ thể", "revision": 0 }`.
- `POST /api/service-registrations/{id}/resubmit`: multipart `details` là JSON chứa `details` (ServiceRegistrationRequest), `revision`, `retainedDocumentIds` và `note`; `documents` là các tệp mới, tùy chọn nếu giữ ít nhất một tệp cũ.
- `POST /api/staff/service-applications/{id}/review`: ngoài hai quyết định và reason, **bắt buộc gửi revision đang hiển thị**. Không tự lấy revision mới rồi duyệt lại một quyết định từ màn hình cũ.
- Tổng tài liệu giữ + mới là 1–5; không được gửi ID lặp hoặc ID của hồ sơ khác. Tệp sử dụng cùng kiểm tra định dạng/nội dung/10 MB của onboarding. Lỗi bất kỳ rollback cả sửa metadata, thêm/xóa file và trạng thái.
- Chỉ chủ hồ sơ được nộp lại. IDs/quyền/reviewer/trạng thái không lấy từ thông tin người nộp gửi lên. Không mở endpoint tài liệu công khai.
- Khi conflict, chủ hồ sơ cập nhật kết quả trước khi sửa/nộp lại; form không tự gắn bản chỉnh sửa cũ sang revision mới. Staff được tải lại trạng thái và phải chọn lại quyết định.

## Dữ liệu và concurrency

ServiceRegistration bổ sung `revision` (integer NOT NULL DEFAULT 0), `requested_changes`, `supplement_requested_at`, `resubmitted_at`, `resubmission_note`.
Revision tăng mỗi lần yêu cầu bổ sung, nộp lại hoặc quyết định cuối. Khóa pessimistic trên application và transaction READ_COMMITTED chặn double-submit, approve-vs-supplement và vòng PENDING → NEEDS_SUPPLEMENT → PENDING làm màn hình cũ trở nên hợp lệ trở lại.
Khóa applicant theo cùng thứ tự với review, trước thay đổi quyền/dữ liệu. Không có bảng, controller hoặc luồng phân công mới.

Requested changes gần nhất được giữ để đối chiếu; reviewer/reviewedAt/decisions hiện hành được reset khi nộp lại. ModerationLog giữ REQUESTED_SUPPLEMENT, RESUBMITTED (nội dung nộp lại/IDs tệp giữ lại và revision), cùng quyết định cuối. Tệp bỏ chọn bị xóa khi transaction nộp lại thành công; lịch sử giữ sự kiện, không giữ bản sao binary cũ.

Hibernate `ddl-auto=update` hiện tại thêm các cột; không chạy thay đổi MySQL live trong kiểm thử. Deploy frontend/backend cùng phiên bản vì review API nay yêu cầu revision. ERD quan hệ không đổi.

## Tự review và kiểm chứng

Đã rà diff phạm vi dịch vụ; không thay nghiệp vụ host/property, security chung hoặc public eligibility.
Trong review đã sửa hiển thị NEEDS_SUPPLEMENT để không báo nhầm là từ chối quyền; xung đột revision bắt cập nhật lại, không tái gửi ngầm quyết định cũ. Tái sử dụng form, file validator, hàng đợi, tài liệu riêng tư và audit hiện có.

Backend ServiceRegistrationTests kiểm tra vòng bổ sung nhiều lần → duyệt/công khai, từ chối sau bổ sung, owner isolation, guest denial, file ID giả/ID trùng, thiếu/quá số tệp, rollback tệp lỗi, tệp đã thay không còn truy cập được, nộp lại đồng thời, stale review và approve-vs-supplement race. Frontend test kiểm tra multipart, revision, retained IDs, giới hạn tài liệu và phản hồi conflict; Vite build kiểm tra JSX/bundle.

Giới hạn kiểm chứng: backend writes chỉ trên H2; chưa kiểm thử schema migration trên MySQL thực hoặc thao tác UI bằng trình duyệt trong lượt này.
