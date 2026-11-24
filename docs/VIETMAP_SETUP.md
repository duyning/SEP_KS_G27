# VIETMAP cho vị trí nhà trọ

Đã tích hợp Autocomplete v4, Place v4 và Reverse v4 vào các form đăng ký gộp,
đăng ký thêm nhà trọ và sửa/bổ sung hồ sơ. Từ 20/11/2026, bản đồ web dùng được
ảnh vệ tinh VietMap và lớp vector đường phố qua binding Leaflet chính thức.
Các ghim giá, popup, chọn/kéo ghim, bản đồ chỉ đọc của staff và icon tiện ích OSM
được giữ nguyên. Không thêm lại bản đồ tổng quan “Bản đồ nhà trọ của tôi”.

## Bản đồ nền web (20/11/2026)

Trong `frontend/.env.local` (Git bỏ qua), cấu hình:

```dotenv
VITE_MAP_PROVIDER=vietmap
VITE_VIETMAP_API_KEY=KEY_TILEMAP_CUA_BAN
VITE_MAP_DEFAULT_VIEW=satellite
```

`auto` ưu tiên VietMap nếu có key, sau đó Google, cuối cùng OSM. Có thể chọn
`vietmap`, `google` hoặc `osm` tường minh. Thiếu key của nguồn đã chọn thì dùng
OSM, không tự chuyển sang nguồn có tính phí khác. Đổi biến môi trường cần restart
Vite. Backend cần restart sau khi đổi `config/vietmap-local.properties`.

- Vệ tinh: raster `maps/tiles/st/{z}/{x}/{y}.png`; không có nhãn đường.
- Đường phố: `maps/styles/tm/style.json`, SDK `@vietmap/vietmap-gl-js` và binding
  `@vietmap/vietmap-gl-leaflet`. SDK chỉ tải khi mở lớp vector, không tải khi chỉ
  xem vệ tinh hoặc dùng OSM/Google. Package chính thức hiện dùng bản
  `7.0.0-pre.1` và binding `0.1.0`, đã pin trong lockfile.
- Không dùng vector hybrid cho key local hiện tại vì nguồn tile vector đang
  trả lỗi hạn mức. Icon tiện ích vẫn là dữ liệu OSM từ backend; chúng tự hiện,
  có ghi nguồn riêng, không phải Places của Google/VietMap.
- Lỗi SDK/WebGL/quyền hoặc hết thời gian tải: quay về OSM mà không xóa vị trí,
  địa chỉ và phòng đang chọn. Lỗi lớp đường phố không vô hiệu hóa nút vệ tinh.
  Chỉ nút “Thử lại VietMap” mới chủ động thử lại lớp đã lỗi.

Key bản đồ xuất hiện trong request/bundle trình duyệt dù file cấu hình được Git
bỏ qua. Dùng key trình duyệt có giới hạn referrer/hạn mức; khi triển khai nên tách
Tilemap key và Services key phía server thay vì dùng chung một key nhiều quyền.
Không đưa key thật vào tài liệu, test fixture hoặc source được theo dõi.

Tài liệu nền bản đồ chính thức:

- https://maps.vietmap.vn/docs/map-api/tilemap/
- https://maps.vietmap.vn/docs/map-api/tilemap-leaflet/

### Kết quả nghiệm thu local

Ngày 20/11/2026: style đường phố/hybrid và sprite trả 200, nhưng tile vector
trả **423 `Your request is limited`**. Đây là phản hồi từ dịch vụ, chưa xác định
được giới hạn quyền/gói/IP/rate cụ thể trong tài khoản. Không tự đổi gói hoặc
thử endpoint khác để vượt giới hạn. Ảnh vệ tinh trả 200 và đã hiển thị thật tại
khu vực Đại học FPT Hòa Lạc. Autocomplete v4 trả 6 gợi ý và Reverse v4 trả 1 kết
quả trong các lần gọi kiểm tra. Key đã cấu hình local cho web và backend.

`frontend/scripts/check-vietmap.cjs` dùng fixture API ứng dụng và từ chối style
đường phố có chủ đích để kiểm tra fallback. Chạy với `LIVE_VIETMAP=1` sẽ dùng
tile vệ tinh thật (tiêu hạn mức); mặc định dùng ảnh fixture. Kiểm tra popup/link,
icon tiện ích tự hiện, 375/768/1024/1440, nút điều khiển ở zoom 200%, mở rộng/Escape,
chi tiết chỉ đọc, nhấn/kéo ghim và giữ địa chỉ/tọa độ khi fallback. Đây không phải
kiểm tra dữ liệu nhà trọ/tiện ích trong database thật. Không lưu/gửi hồ sơ trong test.

## Lấy Services key

1. Đăng ký tại https://maps.vietmap.vn/console-v2/register và xác nhận email.
2. Theo tài liệu VIETMAP, email thông tin tài khoản có Services key và Tilemap key.
   Dùng **Services key** cho tính năng này.
3. Hoặc đăng nhập https://maps.vietmap.vn/console-v2/, mở **Consumers → Detail**
   của consumer dịch vụ/default, xem API key và quyền các API.
4. Cho phép Autocomplete, Place và Reverse phiên bản v4. Kiểm tra hạn mức còn lại.
   Nếu giới hạn IP, dùng IP internet đi ra của backend, không dùng IP frontend.

Tài liệu chính thức:
- https://maps.vietmap.vn/docs/vi/map-api/console/register-api-key/
- https://maps.vietmap.vn/docs/vi/map-api/console/manage-api-key/
- https://maps.vietmap.vn/docs/vi/map-api/autocomplete-version/autocomplete-v4/
- https://maps.vietmap.vn/docs/vi/map-api/place-v4/
- https://maps.vietmap.vn/docs/vi/map-api/reverse-version/reverse-v4/

## Đặt key trong project

File đã chuẩn bị: `config/vietmap-local.properties` (Git bỏ qua toàn bộ config/).
Mở file đó và điền:

```properties
VIETMAP_ENABLED=true
VIETMAP_API_KEY=KEY_SERVICES_CUA_BAN
VIETMAP_REQUESTS_PER_MINUTE=120
```

Không thêm dấu nháy quanh key. Không đặt key này trong frontend/.env hoặc biến VITE_*.
Có thể dùng biến môi trường cùng tên khi triển khai server. File mẫu được theo dõi
trong Git ở `docs/examples/vietmap-local.properties.example`, không chứa key thật.

`application.properties` đã import file local. Chạy IntelliJ với working directory
là thư mục HL-RCS chứa pom.xml/config/, như cấu hình full-stack hiện tại.
Khởi động lại backend sau khi thay key, rồi tải lại trang web. Không có key hoặc
tắt VIETMAP_ENABLED: ô tìm địa chỉ Vietmap không bật; dán link/tọa độ và bản đồ cũ
vẫn hoạt động. Tắt lại bằng `VIETMAP_ENABLED=false` và restart.

## Kiểm tra trên hệ thống

1. Mở bước **Vị trí nhà trọ** trong đăng ký, hoặc phần vị trí của hồ sơ đang sửa.
   Nhãn ô nhập phải đổi thành **Tìm địa chỉ hoặc dán liên kết Google Maps**.
2. Nhập ít nhất 3 ký tự; danh sách gợi ý xuất hiện sau 300 ms ngừng gõ.
3. Chọn bằng chuột hoặc phím lên/xuống rồi Enter. Chỉ khi chọn mới gọi Place;
   địa chỉ/khu vực được gợi ý và ghim cập nhật.
4. Nhấn hoặc kéo ghim: sau 600 ms, Reverse gợi ý địa chỉ. Tọa độ ghim do bạn chọn
   giữ nguyên, không bị kéo về đường hoặc POI gần đó.
5. Sửa địa chỉ trong lúc đang tra: phản hồi cũ bị hủy, không ghi đè nội dung vừa sửa.
   Không tự tra và ghi đè khi chỉ mở hồ sơ đã có vị trí.
6. Dán link Google Maps vẫn dùng bộ đọc tọa độ cũ, sau đó tra địa chỉ qua Vietmap.
   Nếu chưa xác định được địa chỉ/khu vực, nội dung cũ được giữ và có thông báo.
7. Chỉ lưu/gửi hồ sơ khi bạn chủ động bấm nút của form. Tìm địa chỉ không ghi DB
   và không tự duyệt hồ sơ hay tự công khai nhà trọ.

Đối chiếu khu vực dùng boundaries/ward cùng dữ liệu mới và `data_old` từ
display_type=5. Trường `commune` vẫn là danh mục khu vực của hệ thống; tên hành
chính chưa khớp hoặc mâu thuẫn không bị đoán từ tên nhà trọ. Chưa thêm cột mã
đơn vị hành chính hoặc đổi danh mục khu vực trong đợt tích hợp này.

## Lỗi thường gặp

- Key trống/feature tắt: vẫn thấy ô dán liên kết cũ; kiểm tra file, working directory,
  restart backend và reload web.
- 401 từ provider: key sai/không tồn tại. 423/429: hết hạn mức, chưa mở quyền API
  hoặc bị giới hạn. Backend trả thông báo an toàn, không trả key/URL chứa key.
- Không có gợi ý: thử tên đường hoặc khu vực; vẫn có thể chọn ghim và tự nhập.
- Không tự chọn xã/khu vực: dữ liệu chưa đủ hoặc không khớp danh mục Hòa Lạc;
  kiểm tra thủ công thay vì tự chọn khu vực gần nhất.

## API và vận hành

Các API mới `/api/property-location/status` (GET), `/autocomplete`, `/place`,
`/reverse` (POST) chỉ dành cho USER, ROOM_HOST, ADMIN đã đăng nhập. USER chỉ được
dùng các API vị trí này, không được cấp thêm quyền quản lý nhà trọ.

Services key, base URL và HTTP request đến provider chỉ ở backend. Không chuyển
JWT, ảnh CCCD, hồ sơ giấy tờ hay dữ liệu tài khoản sang provider. Cache tối đa
256 phản hồi JSON trong 5 phút; giới hạn mặc định 120 lượt gọi provider/phút cho
một JVM. Cache hit không tiêu hạn mức nội bộ. Bản nhiều instance cần bộ điều phối
cache/rate chung; hạn mức của tài khoản Vietmap vẫn áp dụng độc lập.

Kiểm thử backend dùng HTTP server giả/H2; browser mặc định dùng API/provider
fixture. Kiểm tra tile thật chỉ chạy khi chọn `LIVE_VIETMAP=1` như trên.
5 test adapter backend và 12 frontend unit test liên quan đã qua trong đợt này.
Không có gửi SMS hoặc thay đổi hồ sơ trong các kiểm thử này.
