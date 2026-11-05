# Giao diện bản đồ với Animate UI

Đã áp dụng skill `.agents/skills/animate-ui/SKILL.md` có sẵn trong repo theo yêu
cầu người dùng. Mức được chọn: **Nổi bật / expressive**.

## Trải nghiệm

- Trang bản đồ có phần giới thiệu ngắn, số nhà trọ/loại phòng trên trang hiện tại,
  bảng phòng bên cạnh và bản đồ. Số liệu lấy từ kết quả API đang tải, không phải
  toàn bộ dữ liệu hệ thống.
- Thẻ có ảnh thật nếu có; ảnh thiếu/lỗi dùng biểu tượng nhà. Giá, địa chỉ và tên
  giữ theo API hiện có.
- Chọn thẻ làm nổi bật thẻ, ghim tương ứng và thông tin đang chọn. Bản đồ căn vị trí
  ngay; không chạy camera đồng thời với cơ chế tự căn popup của Leaflet.
- Chọn ghim vẫn mở popup của Leaflet. Các loại phòng chung tọa độ dùng chung ghim
  giá từ, nhưng vẫn có thẻ/liên kết riêng từng loại phòng.
- Desktop dùng hai cột; mobile đưa thẻ xuống dưới bản đồ thành dải cuộn ngang.
- Nút vệ tinh ẩn khi chưa cấu hình nguồn ảnh có quyền sử dụng. Nguồn OSM đang
  hoạt động được giữ nguyên, không cần Google Maps API.

## Animate UI và motion

Path C của skill (custom React/Leaflet): giữ kiến trúc và các primitive hiện có.
Tái sử dụng `AppMotionProvider` và `MotionButton` từ `components/motion/MotionUI.jsx`,
`Effects` từ catalog Animate UI và `AnimatePresence`/Motion để chuyển thẻ đang chọn.

- Thẻ xuất hiện lần lượt với `Effects`: fade, blur nhẹ, slide và zoom. Dùng
  `spring.entrance`, `shift.step`, `scale.menu`, `blur.surface`, `stagger.stack`.
- Nhấn nút dùng primitive Button với spring/press mặc định; thẻ dùng `scale.choice`.
  Không phóng to nút khi hover.
- Chuyển thông tin chọn phòng dùng `spring.pop` khi vào, `transition.dismiss` khi ra.
  Phần đang rời được đặt inert/aria-hidden để không giữ link có thể focus.
- Icon mở rộng/thu gọn chuyển bằng `transition.swap`, `scale.icon`, `blur.icon`.
- Token lấy qua `useMotionTokens()` để tuân theo tempo đang có của ứng dụng.
- ReducedMotionConfig đã có ở provider gốc; primitive Effects/Button cũng có
  xử lý reduced motion. Summary/icon bỏ dịch chuyển/scale khi người dùng yêu cầu
  giảm chuyển động; các nút zoom cũng tắt zoom animation trong trường hợp này.

Gate: điều khiển dùng thường xuyên chỉ có phản hồi nhanh; hiệu ứng nổi bật tập
trung ở thẻ phòng và thay đổi trạng thái chọn. Không đặt Motion transform vào
map pane/marker root mà Leaflet dùng để tính vị trí. Nội dung giới thiệu chính
không bị ẩn bởi hiệu ứng xuất hiện; chỉ các thẻ dùng animation khi mount.
Không có animation lặp vô hạn hoặc thời gian chờ trước khi thực hiện thao tác.

Recipe được tham chiếu: `press.md`, `card.md`, `swap.md`; dùng Effects từ catalog
thay vì tự xây hiệu ứng xuất hiện. Không cài package mới.

## File và kiểm tra

- `frontend/src/components/AccommodationMap.jsx`: bố cục/thẻ/chọn phòng, motion và controls.
- `frontend/src/styles/accommodation-map.css`: giao diện responsive, style có phạm vi bản đồ.
- `frontend/scripts/check-map-animate.cjs`: kiểm thử hành vi/animation bằng fixture.
- Tài liệu này và cập nhật hướng dẫn vệ tinh để khớp việc ẩn nút chưa cấu hình.

Project dùng JavaScript, chưa khai báo typecheck/tsconfig. Đã chạy build Vite
trước thay đổi và sau thay đổi; đều thành công (còn cảnh báo bundle lớn).
25 test map/form/search liên quan đạt. Kiểm tra Edge:

- 375/768/1024/1440 px, chọn phòng bằng chuột và bàn phím, chọn nhanh liên tục,
  liên kết đúng propertyId/roomTypeId, marker/thẻ được đồng bộ.
- Mở rộng/Escape/phục hồi focus, 200% zoom, reduced motion; chụp cả trạng thái
  giữa chuyển động và trạng thái nghỉ.
- Regression: popup, bộ lọc/phân trang, đường dẫn chỉ đường, các trạng thái
  rỗng/thiếu tọa độ/lỗi, retry, nhấn/kéo ghim và giữ dữ liệu form đăng/sửa.
- API/tile thật trên cổng 5173 tải thành công, đã kiểm tra ảnh desktop/mobile.

Ảnh thật: `target/map-animate/live-desktop.png`, `target/map-animate/live-mobile.png`.
Ảnh fixture kiểm tra layout/motion: `target/map-animate/explorer-*.png`,
`target/map-animate/selection-mid-motion.png`, `target/map-animate/reduced-motion.png`.
Log: `target/map-animate-before-build.log`, `target/map-animate-build.log`,
`target/map-animate-unit.log`, `target/map-animate-browser.log`,
`target/map-animate-regression.log`, `target/map-animate-live.log`.

Không sửa backend, database, xác thực, bộ lọc hay API. Không commit/push.
