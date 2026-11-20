# Trung tâm thông báo — 2026-11-20

`/notifications` dùng shell công khai, lưới 1160px, topbar #0f3d33, chuông active/bộ đếm SSE. `/host/notifications` dùng cùng danh sách trong portal chủ trọ. Danh mục: ALL, UNREAD, VIEWING, APPLICATION, COMMUNITY, ADMIN; chip con cho đơn và bình luận. Tìm kiếm tên/nội dung/mã, nhóm ngày theo giờ Việt Nam, cursor tải 20 thông báo/lần. Bộ lọc giữ trên URL; refresh giữ độ sâu danh sách đã tải.

Nguồn dữ liệu thật:

- Toàn bộ `viewing_notifications` cũ tiếp tục dùng trực tiếp, không sao chép, giữ nguyên trạng thái đã đọc.
- Bảng mới `user_notices` (UserNotice): FK recipient_id → users; category, kind, title, content/quote tối đa 4000 ký tự, target, reference_id, post_id, comment_id, is_read, created_at; index recipient_id/created_at. Thông báo được tạo trong transaction xét duyệt nhà trọ, hồ sơ dịch vụ, đăng ký chủ trọ, bình luận/phản hồi mới; không tự thông báo cho chính người gửi. Không backfill quyết định/bình luận cũ thành thông báo giả.
- ADMIN có POST `/api/notifications/admin` với `{recipientId,title,content,effectivePeriod}`. Chỉ ADMIN; mỗi recipient là một tài khoản xác định. Nội dung nhiều dòng được hiển thị thành các ý; thời gian áp dụng lấy từ trường được cung cấp, không tự suy đoán. Chưa thêm màn hình soạn thông báo Admin.

GET `/api/notifications?category=ALL&kind=&q=&before=` trả `{items,nextCursor,unreadCount,counts}`. ID có prefix `v` (lịch xem phòng) hoặc `n` (nguồn mới). PUT `/{id}/read`, PUT `/read-all`; GET `/{id}/viewing` đọc chi tiết lịch sau khi kiểm tra đúng người nhận. Xâm nhập ID của người khác trả 404. Dữ liệu chỉ hiện sau commit; gửi sự kiện ViewingUpdates tới người nhận để làm mới danh sách và chuông ở các tab. Read-all không tác động tài khoản khác.

Modal 520px: chi tiết lịch 2×2 được dùng chung trong thông báo, `/bookings` và `/host/viewings`. Giá và SĐT chủ trọ chỉ lấy từ public detail API, không fallback sang số cá nhân trong User. Người đặt chỉ thấy SĐT khi APPROVED; chủ trọ thấy thông tin liên hệ người đặt thuộc lịch của mình. Có copy SĐT và thông báo lỗi clipboard. Giữ hành động chỉnh/hủy/duyệt/từ chối và kiểm tra quyền/thời gian ở backend.

Đơn dịch vụ cần bổ sung mở trực tiếp ServiceRegistrationModal; đơn nhà trọ mở lại Editor hiện có trong modal, tiếp tục validation/version token/upload hiện có. Đơn đăng ký chủ trọ dẫn tới `/become-host` để bổ sung theo form chuyên biệt. Bình luận có trích dẫn và phản hồi nhanh qua API cộng đồng, vẫn bị chặn nếu bài gốc không còn cho phép phản hồi.

Backend dùng ddl-auto hiện có để thêm bảng; cần restart backend mới trước khi dùng UI. Chưa chạy migration trên MySQL live. Feed hiện gộp hai nguồn theo tài khoản rồi cắt cursor trong service; lịch sử lớn cần tối ưu truy vấn union/keyset tại DB. Không xóa thông báo đã đọc trong bản này.

Kiểm tra: NoticeTests (quyền, read-all, lọc/cursor), ViewingFlowTests, CommunityCommentTests; test frontend notices API và build. Chưa kiểm tra trực quan responsive, focus/ESC và clipboard trên trình duyệt thật.
