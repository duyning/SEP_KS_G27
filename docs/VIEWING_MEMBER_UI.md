# Lịch xem phòng của người đặt — 2026-11-19

- `/bookings` dùng hero tổng quan, tab trạng thái có số lượng, tìm nhà trọ/loại phòng và sắp xếp trên server. URL giữ `status`, `q`, `sort`, `page`, `id`; đổi bộ lọc về trang đầu. Desktop dùng card ngang; màn hình hẹp xếp khối thông tin/thời gian/thao tác theo chiều dọc.
- Giá, diện tích, địa chỉ lấy từ loại phòng/nhà trọ của lịch. Không thêm khoảng cách, tiện nghi hoặc thời gian dự kiến phản hồi khi không có dữ liệu. Nút liên hệ dẫn đến trang thông tin phòng, nơi dùng chính sách liên hệ hiện có.
- Hủy ngay từ card mở hộp xác nhận của luồng cũ, chỉ cho PENDING; backend tiếp tục kiểm tra quyền và thời gian. Giữ chỉnh lịch trong chi tiết, thông báo và cập nhật SSE hiện có. Đặt lịch mới dẫn đến tìm phòng để chọn loại phòng trước.
- GET `/api/viewings` bổ sung `q` (tối đa 100 ký tự), `sort=newest|oldest|appointment`. Các tham số trước đây giữ nguyên. Kết quả bổ sung `rooms` và `summary` bên cạnh `items`, `hasNext`, `coverImages`.
- `summary.counts` đếm toàn bộ lịch của tài khoản theo trạng thái, không phụ thuộc trang/từ khóa; `upcoming` là APPROVED có giờ hẹn trong tương lai; `ended` là tổng trừ lịch sắp tới và PENDING. Không truy cập lịch của tài khoản khác.
- Kiểm tra: frontend build; `frontend/tests/bookings-list.test.js`; `ViewingFlowTests` gồm hồi quy quyền/hủy/thời gian và test mới về tìm kiếm, sort, tổng quan. Chưa kiểm tra trực quan/responsive trong trình duyệt của phiên làm việc này.

Phạm vi thay đổi không gồm UI chủ trọ hoặc module bài tổng hợp. Backend phiên bản mới trả trực tiếp số lượng và thông tin phụ để tránh các truy vấn bổ sung ở frontend.

Cập nhật tương thích: khi backend đang chạy chỉ trả contract cũ, frontend đọc đủ các trang lịch của chính tài khoản để thống kê/tìm kiếm/sắp xếp, sau đó bổ sung giá/diện tích/địa chỉ từ public detail API (tối đa 4 request đồng thời). Không dùng số lượng của riêng trang hiện tại thay tổng; nếu server lặp trang, báo lỗi thay vì thống kê thiếu. Phòng không còn công khai hiển thị thông tin không khả dụng, không ẩn lịch. Backend mới có `summary/rooms` dùng trực tiếp, không cần đọc lại toàn bộ lịch.

Desktop dành cố định 280px cho cột hành động; cột thông tin và cột lịch dùng cùng tỷ lệ trên mọi card. Số nút không làm dịch cột thời gian. Hàng nhãn, giờ hẹn và lý do có kích thước thống nhất; màn hình nhỏ trở về bố cục dọc.
