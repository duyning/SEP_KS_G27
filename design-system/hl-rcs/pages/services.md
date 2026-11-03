# Dịch vụ quanh trọ

Trang `/services` ưu tiên tìm kiếm: phần giới thiệu ngắn, danh mục,
tìm kiếm/bộ lọc, danh sách dịch vụ và lời mời nhà cung cấp. Chỉ giữ một hàng chọn
danh mục ở danh sách; không lặp bảng chọn ở hero. Hai dịch vụ chia hai cột desktop;
một dịch vụ có chiều rộng tối đa 680px. Thẻ ưu tiên tên, mô tả, khu vực, giá và liên hệ;
chữ mô tả 15px, metadata 14px, nhãn giá 12px. Nút “Hồ sơ dịch vụ của tôi” mở luồng
hồ sơ hiện có; khối đăng ký và quản lý hồ sơ nằm bên phải phần giới thiệu đầu trang,
nền sáng và kích thước gọn. Màn hình dưới 900px xếp khối này dưới mô tả.
Không lặp banner nhà cung cấp cuối trang; không hiển thị thống kê ở hero.
Danh mục chưa có dịch vụ được đánh dấu “Chưa có”, khi chọn có lời mời đăng ký.
Bộ lọc và danh mục dùng một panel. Giá thỏa thuận có hướng dẫn hỏi báo giá và nút
liên hệ ở cạnh giá; không suy ra khoảng giá, đánh giá hay thời gian phản hồi.
Header/footer tái sử dụng giao diện public của Home, Search và Community.

Mật độ catalogue: thay hero quảng bá bằng tiêu đề trang 26px và một dòng mô tả.
Tiêu đề danh sách 18px; panel lọc padding 12px, tab desktop cao tối thiểu 36px,
ô lọc 48px có icon và nhãn nằm bên trong, đồng hàng trên desktop. Thẻ có header 44px, tiêu đề 18px, mô tả 14px tối đa hai dòng và
padding nội dung 12px × 16px. Mục tiêu: thấy tên, giá và liên hệ ngay trên laptop
1366×768 với nội dung ngắn hiện tại; nội dung dài vẫn được phép tăng chiều cao.

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
