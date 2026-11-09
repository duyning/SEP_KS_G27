# Giao diện bản đồ và cấu hình ảnh vệ tinh

Theo lựa chọn của người dùng, chuẩn bị giao diện trước; chưa kết nối nhà cung cấp
vệ tinh vì chưa có tài khoản/quyền sử dụng. Bản đồ đường phố OSM tiếp tục hoạt động.

## Giao diện đã có

- Thanh chọn Bản đồ / Vệ tinh; nút vệ tinh được ẩn khi thiếu cấu hình để giao diện tập trung vào chức năng dùng được.
- Giá thuê trên marker ở tìm kiếm; vị trí có nhiều loại phòng hiển thị giá từ.
- Ghim nhà trọ màu teal trong form và trang chi tiết.
- Nút phóng to, thu nhỏ, căn lại các ghim, mở rộng/thu gọn; Escape thoát xem rộng.
- Căn lại vùng bản đồ khi đổi kích thước; giữ state form, bộ lọc và API cũ.
- Nhãn đường/địa điểm có thể bật tắt khi đã cấu hình lớp nhãn cho ảnh vệ tinh.

Không sao chép tile, nhãn địa điểm hoặc ảnh từ Google Maps. Tên đường/địa điểm
trong tương lai phụ thuộc dữ liệu của nhà cung cấp được cấu hình; không tự tạo POI.

## Cấu hình nguồn vệ tinh

1. Chọn nhà cung cấp ảnh vệ tinh hỗ trợ Leaflet qua raster XYZ và đăng ký quyền
   sử dụng cho ứng dụng. Ví dụ tham khảo tài liệu chính thức
   [ArcGIS Location Platform](https://developers.arcgis.com/documentation/mapping-and-location-services/).
   Không cần Google Maps API key. Nếu nhà cung cấp yêu cầu key, dùng key dành cho
   trình duyệt và giới hạn domain/quota theo tài liệu của họ.
2. Lấy URL tile raster, mức zoom hỗ trợ và attribution đầy đủ của nguồn ảnh.
   Nếu muốn tên đường trên ảnh, lấy thêm URL lớp raster nhãn trong suốt.
3. Điền vào `frontend/.env.local` (file riêng máy, không commit):

   ```dotenv
   VITE_MAP_SATELLITE_URL=https://YOUR_PROVIDER/imagery/{z}/{x}/{y}.png?key=YOUR_BROWSER_KEY
   VITE_MAP_SATELLITE_ATTRIBUTION=ATTRIBUTION_REQUIRED_BY_YOUR_PROVIDER
   VITE_MAP_LABELS_URL=https://YOUR_PROVIDER/labels/{z}/{x}/{y}.png?key=YOUR_BROWSER_KEY
   VITE_MAP_LABELS_ATTRIBUTION=ATTRIBUTION_REQUIRED_BY_LABEL_PROVIDER
   VITE_MAP_DEFAULT_VIEW=satellite
   ```

   Đây là mẫu, không phải URL có thể tải. Dùng chính xác mẫu URL được nhà cung cấp
   cấp, bao gồm đúng thứ tự x/y (một số nguồn dùng `{z}/{y}/{x}`). Bỏ trống cả hai
   biến LABELS nếu không có lớp nhãn. Đặt DEFAULT_VIEW=street để mở đường phố trước.
   Nút Vệ tinh chỉ được bật khi có cả URL và attribution ảnh.

4. Khởi động lại Vite; bản deploy cần build lại. Mở `/map`, chuyển Vệ tinh, kiểm
   tra ảnh, nhãn, attribution và các ghim. Kiểm tra tương tự ở form đăng/sửa và chi tiết.

Biến `VITE_*` được đưa vào JavaScript trình duyệt; không đặt server secret ở đây.
Không dán URL `style.json` của vector basemap vào URL raster. Việc hỗ trợ nguồn
chỉ có vector style cần tích hợp riêng theo SDK của nhà cung cấp.

Nguồn World Imagery Esri công khai đã trả HTTP 200 trong kiểm tra kết nối, nhưng
khả năng truy cập công khai không đồng nghĩa ứng dụng có quyền sử dụng. Vì chưa
có quyền/tài khoản, không cấu hình nguồn này vào ứng dụng đang chạy. Tham khảo
[điều kiện sử dụng chính thức](https://goto.arcgis.com/termsofuse/viewsummary).

## Kiểm tra đã thực hiện

- Build Vite và 25 unit test liên quan đến map/form/search.
- Edge với API/tile giả lập: chuyển street/satellite, bật tắt nhãn, marker giá,
  zoom/căn ghim, mở rộng/Escape/phục hồi focus, 375/768/1024/1440 px.
- Regression form: nhấn/kéo ghim, giữ dữ liệu, mở trang sửa ở vị trí cũ;
  popup, bộ lọc/phân trang, đường dẫn chi tiết, trạng thái lỗi và retry.
- Trên hệ thống thật ở cổng 5173: dữ liệu API và tile OSM thực, ảnh desktop/mobile,
  marker nằm trong vùng bản đồ sau resize, mở rộng và 200% zoom. Vệ tinh vẫn chưa
  được bật theo đúng cấu hình hiện tại; chưa xác minh ảnh vệ tinh thật trong ứng dụng.

Ảnh: `target/map-redesign-live-desktop.png`, `target/map-redesign-live-mobile.png`.
Log: `target/map-redesign-build.log`, `target/map-redesign-unit.log`,
`target/map-tools-test.log`, `target/map-redesign-regression.log`,
`target/map-redesign-live.log`.

Không thay đổi backend/database, không thêm dependency, không commit/push.
