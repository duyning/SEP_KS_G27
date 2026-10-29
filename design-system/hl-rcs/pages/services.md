# Dịch vụ quanh trọ

Trang `/services` giữ thứ tự nội dung từ `Code/giao_dien/html/services.html`:
giới thiệu, danh mục, tìm kiếm/bộ lọc, danh sách dịch vụ và lời mời nhà cung cấp.
Theo yêu cầu thiết kế mới, dùng phần giới thiệu có bảng chọn danh mục, màu nhận
diện nhẹ theo nhóm dịch vụ và thẻ ưu tiên thông tin/giá thay cho bố cục demo cũ.
Header/footer tái sử dụng giao diện public của Home, Search và Community.

- API `/api/services` và `/api/services/categories` là nguồn dữ liệu duy nhất
  cho danh mục, số lượng, nhà cung cấp, mô tả, giá và khu vực phục vụ.
- Bộ lọc kết hợp trên toàn bộ danh sách đã tải, giữ trong URL. URL danh mục cũ
  `moving`, `laundry`, `cleaning`, `repair` ánh xạ sang ID database thực.
- Giá thỏa thuận/thiếu giá không được xem là 0 khi sắp xếp. Không suy ra phí,
  đơn vị tính, đánh giá, khoảng cách hay giờ hoạt động mà API chưa cung cấp.
- API chưa có ảnh dịch vụ: dùng biểu tượng Lucide và đồ họa CSS theo danh mục;
  không thay bằng ảnh của nhà cung cấp khác hoặc ảnh mẫu giả làm dữ liệu thật.
- Đăng ký/hồ sơ giữ `ServiceRegistrationModal` và API multipart hiện tại. Gọi
  điện/email là liên hệ trực tiếp; chưa có API đặt dịch vụ trực tuyến.
- Motion ở mức nhẹ: tái sử dụng MotionButton và common Modal có sẵn theo skill
  Animate UI, provider tempo 0.85 và reduced-motion; không thêm hiệu ứng vào dữ
  liệu, đếm số hay thời điểm phản hồi API.
- Khi lỗi, số liệu hiện “—”; dữ liệu rỗng hợp lệ hiện 0 và lời mời đăng ký.

Kiểm tra: `node --test tests/service-discovery.test.js tests/public-services.test.js
tests/service-registration.test.js tests/service-review.test.js`, build Vite,
`scripts/check-services-discovery.cjs` với API giả lập, responsive 375–1440px,
reflow tương đương 200%, menu mobile, Escape, form và trạng thái PENDING.
