# Đánh giá và báo cáo dịch vụ — 2026-11-18

## Đánh giá

- Tại chi tiết dịch vụ công khai, tài khoản đăng nhập được gửi một đánh giá cho mỗi dịch vụ. Sao là số nguyên **0–5**, nội dung 1–3000 ký tự sau trim; ảnh tùy chọn, tối đa 5 ảnh JPG/PNG/WEBP, 5 MB/ảnh, kiểm tra MIME và chữ ký nội dung.
- Không yêu cầu đã đặt dịch vụ; không gắn nhãn “đã sử dụng được xác minh”. Chủ dịch vụ không tự đánh giá. Ràng buộc unique `(service_id, author_id)` và khóa provider chống gửi trùng đồng thời.
- Danh sách công khai phân trang 10 mục, mới nhất trước; lọc chính xác theo số sao, bao gồm 0. Điểm trung bình/phân bố sao tính trên toàn bộ đánh giá, không chỉ trang/bộ lọc hiện tại. `mine` trả đánh giá hiện có của người đăng nhập.
- Chủ dịch vụ có một phản hồi văn bản 1–3000 ký tự cho mỗi đánh giá; không được sửa nội dung/sao của khách. Không có thao tác sửa/xóa đánh giá hoặc phản hồi trong phạm vi này.
- Danh sách/ảnh đánh giá tuân theo cùng điều kiện công khai của dịch vụ. Không truy cập ảnh qua URL cũ sau khi dịch vụ bị gỡ.

## Báo cáo và giải trình

- Nút “Báo cáo dịch vụ” tại chi tiết; nội dung 10–3000 ký tự, ảnh theo giới hạn trên. Báo cáo mới xuất hiện ngay trong `/staff/service-complaints` và hàng chờ dashboard staff. Không có email/push bên ngoài.
- Người gửi theo dõi trong “Báo cáo của tôi” ở `/services`. Chủ dịch vụ xem “Báo cáo và yêu cầu giải trình” trong “Dịch vụ của tôi”, gồm nội dung, minh chứng và lịch sử; tên người báo cáo không trả về cho chủ dịch vụ.
- Ảnh báo cáo/giải trình là riêng tư, chỉ người báo cáo, chủ dịch vụ, active STAFF/ADMIN được truy cập; không đưa vào public DTO. URL ảnh cần bearer token; UI dùng blob URL tạm và giải phóng khi đóng.
- Trạng thái: `PENDING` → `NEEDS_EXPLANATION` → `EXPLAINED`; staff có thể yêu cầu giải trình thêm từ `EXPLAINED`. Chủ dịch vụ gửi nội dung và ảnh giải trình trong cùng báo cáo. Từng vòng giữ lịch sử riêng.
- Staff có thể `DISMISS` → `DISMISSED` (đóng báo cáo) hoặc `REMOVE` → `REMOVED` (gỡ công khai) từ mọi trạng thái đang mở, kể cả đang chờ giải trình. Cần lý do 10–3000 ký tự. Quyết định xong không xử lý lại.
- Mọi active STAFF/ADMIN đều xem được báo cáo, không phân công. Không tự xử lý báo cáo do mình gửi hoặc về dịch vụ mình sở hữu. Owner IDs/reporter IDs lấy từ principal.
- Không cho một người tạo thêm báo cáo đang mở cho cùng dịch vụ; sau khi đóng có thể gửi mới nếu dịch vụ còn công khai.
- Báo cáo khóa pessimistic + revision chống staff/owner ghi đè từ màn hình cũ. Gỡ công khai khóa provider cùng thứ tự với các luồng duyệt, tăng service revision và ghi ModerationLog. Ảnh lỗi rollback toàn bộ gửi mới/giải trình.

## Gỡ công khai

`Service.moderationHidden` là cờ riêng, mặc định false. ServicePublicationService kiểm tra cờ này, nên list/detail/ảnh công khai, đánh giá và yêu cầu dịch vụ mới đều bị chặn. Dữ liệu/lịch sử được giữ; không thu hồi MANAGE_SERVICE hay ảnh hưởng dịch vụ khác. Snapshot được duyệt sau này **không tự xóa cờ**. Chưa có luồng khôi phục công khai; không tự khôi phục khi đóng báo cáo khác. Các yêu cầu đã nhận và lịch sử vẫn tồn tại.

## API

- `GET/POST /api/services/{id}/ratings`: GET `stars` tùy chọn, `page` từ 0; POST multipart `details:{stars,content}`, `image` lặp tùy chọn.
- `POST /api/service-ratings/{id}/reply`: JSON `{content}`.
- `GET /api/services/{id}/ratings/{ratingId}/images/{index}`: ảnh công khai khi dịch vụ đủ điều kiện.
- `POST /api/service-complaints`: multipart `details:{serviceId,content}`, `image` tùy chọn.
- `GET /api/service-complaints/mine`, `/incoming`, `/{id}`: người gửi/chủ dịch vụ/chi tiết có phân quyền.
- `POST /api/service-complaints/{id}/explanation`: multipart `details:{revision,content}`, `image` tùy chọn.
- `GET /api/staff/service-complaints`, `POST /api/staff/service-complaints/{id}/review`: JSON `{revision,action,content}`, action `REQUEST_EXPLANATION|DISMISS|REMOVE`.
- Ảnh riêng: `GET /api/service-complaints/{id}/images/{index}` hoặc `/{id}/events/{eventId}/images/{index}`. Kiểm tra event thuộc đúng báo cáo.

## Dữ liệu và triển khai

Entity mới: ServiceRating, ServiceComplaint, ServiceComplaintEvent; dùng ServiceImage embeddable cho ba collection ảnh. Không tái sử dụng Feedback vốn gắn nhà trọ hoặc Report polymorphic cũ. Migration bổ sung: `sql/migrations/20261118_service_feedback.sql`; runtime `ddl-auto=update` cũng tạo bảng/cột. Chưa chạy migration trên MySQL thật. Khởi động lại backend và dùng frontend cùng phiên bản.

Kiểm thử HTTP/H2 bao phủ 0 sao, filter/average, unique đồng thời, quyền reply, ảnh lỗi/giới hạn, quyền ảnh riêng, vòng giải trình, revision, tự xử lý, quyết định đồng thời và chống tái công khai qua cập nhật. Frontend có contract tests và browser test với API intercept (không ghi MySQL).

### Kết quả kiểm chứng

- 67 backend tests trên H2 thành công; sau chỉnh validation sao/thống kê, chạy lại 27 tests phân hệ dịch vụ thành công. Hồ sơ không tài liệu được kiểm chứng đến bước phê duyệt.
- 76 frontend tests và production build thành công.
- Edge headless chạy đủ luồng đánh giá 0 sao/ảnh/filter, phản hồi owner, báo cáo, staff yêu cầu giải trình, owner gửi ảnh giải trình, staff gỡ công khai. Kiểm tra 1440px và 390px không tràn ngang; đã xem ảnh chụp trong target/service-feedback-browser. Các API trong browser test là giả lập.
