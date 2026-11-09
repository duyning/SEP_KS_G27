# Dán link, gợi ý địa chỉ và tiện ích quanh nhà trọ

## Dùng trên giao diện

Sau khi cập nhật code, **khởi động lại Spring Boot** để nạp API/config mới,
rồi tải lại frontend. Không cần đổi database hoặc import migration.

1. Vào Nhà trọ của tôi → Cập nhật thông tin → Vị trí nhà trọ.
2. Dán link Google Maps (kể cả `maps.app.goo.gl`) và bấm **Đặt ghim & điền thông tin**.
3. Hệ thống đọc tọa độ, đặt ghim, lấy gợi ý địa chỉ chi tiết, đối chiếu khu vực với
   danh sách hiện có và gợi ý ghi chú địa điểm lân cận. Kiểm tra/sửa lại số nhà và
   địa chỉ trước khi gửi duyệt. Dữ liệu OSM có thể thiếu hoặc chỉ mô tả đường/khu vực.
4. Khi chọn lại ghim thủ công, bấm **Điền thông tin từ ghim hiện tại** để lấy gợi ý
   mới. Không geocode liên tục khi kéo bản đồ.
5. Bấm **Tiện ích** trong bản đồ để tải các địa điểm có tên quanh ghim, bán kính
   1,5 km. Có marker riêng, danh sách và đường dẫn chỉ đường. Khoảng cách là đường
   chim bay tới điểm/centroid của đối tượng OSM, không phải lộ trình đi bộ/lái xe.
6. Lưu/gửi hồ sơ theo quy trình hiện có. Tọa độ vẫn lưu trong dữ liệu hồ sơ, nhưng
   hai ô kinh độ/vĩ độ đã bỏ khỏi trang cập nhật.

Các trường bị staff khóa không được tự điền. Nếu nguồn không tìm thấy địa chỉ,
không đối chiếu được khu vực hoặc tải lỗi, thông tin cũ được giữ lại và giao diện
báo cần kiểm tra. Không lấy tên một tòa nhà lân cận làm địa chỉ nhà trọ hoặc suy
khu vực từ khoảng cách tới tâm xã. Việc tra gợi ý không lưu hồ sơ hay tự duyệt tin.

Nút Tiện ích dùng chung trong bản đồ tìm kiếm, chi tiết và picker. Picker chưa có
ghim thì nút bị khóa; trên trang tìm kiếm lấy ghim đang chọn, hoặc ghim đầu tiên
trên trang nếu chưa chọn phòng. Hiện tối đa 24 địa điểm có tên; đây không phải
danh sách đầy đủ mọi tiện ích và không khẳng định tiện ích nào thuộc nhà trọ.

Ảnh vệ tinh vẫn cần nguồn ảnh và quyền sử dụng phù hợp; xem `map-satellite-setup.md`.
Thay đổi này cung cấp lớp địa điểm OSM, không sử dụng ảnh/tile Google Maps.

## Nguồn và cấu hình local

Người dùng đã chọn dùng nguồn OSM công cộng cho bản local ít người dùng sau khi
được thông báo [chính sách Nominatim](https://operations.osmfoundation.org/policies/nominatim/):
giới hạn toàn ứng dụng tối đa 1 request/giây, cache, nhận diện ứng dụng, chỉ tra
theo thao tác người dùng, không autocomplete/bulk. Nominatim trên máy này bị
`ECONNREFUSED`, Overpass chính trả 406 và nguồn thay thế không đáp ứng trong thời
gian kiểm tra. Đã kiểm tra và chuyển cấu hình local sang **Photon**, cùng dữ liệu
OpenStreetMap, cho cả reverse address và tìm POI.

[Photon demo server](https://github.com/komoot/photon#demo-server) cho phép dự án
với số yêu cầu hợp lý, có thể hạn chế/ngừng phục vụ, không cam kết SLA. Tích hợp
giữ giới hạn ít nhất 1,1 giây giữa các request Photon trong một process, cache
10 phút với tối đa 256 mục và chỉ gọi khi bấm nút. Không tải nền hàng loạt hoặc
gửi ảnh/tài liệu hồ sơ đến nguồn bên ngoài. Không truyền token người dùng cho
Google/OSM. Truy vấn POI theo
[API Photon](https://github.com/komoot/photon/blob/master/docs/api-v1.md), giới hạn
bán kính và kết quả, lọc lại khoảng cách trên backend.

Trong `config/mysql-local.properties` (được gitignore) đã cấu hình:

```properties
MAP_LOCATION_PROVIDER=photon
MAP_REVERSE_URL=https://photon.komoot.io/reverse
MAP_NEARBY_URL=https://photon.komoot.io/reverse
```

Có thể cấu hình `MAP_USER_AGENT=NestHub/1.0 (+https://YOUR_APP; contact: YOUR_CONTACT)`
bằng thông tin ứng dụng thực tế khi triển khai. Code mặc định không bật reverse
lookup nếu `MAP_REVERSE_URL` trống. Nhà cung cấp do quản trị cấu hình, không nhận
URL provider từ client. Để dùng Nominatim + Overpass tương thích:

```properties
MAP_LOCATION_PROVIDER=nominatim
MAP_REVERSE_URL=https://YOUR_NOMINATIM/reverse
MAP_NEARBY_URL=https://YOUR_OVERPASS/api/interpreter
```

Giới hạn rate/cache hiện tại nằm trong một JVM, phù hợp bản local đã được chọn.
Triển khai nhiều instance hoặc lưu lượng lớn cần provider được cấp quyền/self-host
và bộ điều phối rate/cache dùng chung. Không coi demo endpoint là hạ tầng production.

## API và file

Hai API chỉ đọc cần thiết để frontend không tự theo redirect/CORS và để áp dụng
rate/cache phía server; mở rộng controller sẵn có:

- `POST /api/host/property-registrations/location/resolve`: JWT ROOM_HOST/ADMIN,
  JSON `{ "input": "LINK_HOAC_LAT,LNG" }`. Trả tọa độ, gợi ý địa chỉ/khu vực/ghi chú,
  các địa điểm và cảnh báo. Chỉ chấp nhận link Google Maps HTTPS trên allowlist;
  kiểm tra lại mỗi redirect, giới hạn số bước và timeout. Không coi `@lat,lng`
  của khung nhìn Google là vị trí địa điểm chính xác.
- `GET /api/properties/location/nearby?latitude=...&longitude=...`: công khai,
  kiểm tra tọa độ hữu hạn/giới hạn, cache/rate limit, trả địa điểm OSM có tên.

Adapter mới `PropertyLocationService` xử lý phần tích hợp nguồn bên ngoài; không
trùng lặp service quản lý nhà trọ và không thực hiện lưu DB. Entity, DTO lưu hồ sơ,
ảnh, tiện ích đã khai báo, quyền sở hữu và quy trình duyệt giữ nguyên.

File chính:

- Backend: `PropertyLocationService.java`, `PropertyRegistrationController.java`,
  `AccommodationController.java`, `SecurityConfig.java`, `application.properties`.
- Frontend: `PropertyAddressLookup.jsx`, `NearbyMapPlaces.jsx`,
  `OpenStreetPropertyMap.jsx`, `AccommodationMap.jsx`, `HostPropertyEditForm.jsx`,
  `services/property-location.js`, CSS edit/map.
- Test: `PropertyLocationServiceTests.java`, `AccommodationTests.java`,
  `property-location.test.js`, `check-property-location.cjs`; cập nhật kiểm tra
  edit trong `check-accommodation-map.cjs` vì tọa độ không còn là input.

Không thêm dependency, bảng hoặc migration. Bản đăng ký mới vẫn giữ luồng nhập
hiện tại; phần tự điền từ link này được nối vào **Cập nhật thông tin nhà trọ**.

## Kết quả thực tế

- Frontend build đạt; 27 unit test liên quan đạt.
- Suite backend 77 tests đạt, gồm public coordinate validation và kiểm tra
  lookup từ chối anonymous/USER, chỉ host/admin được dùng.
- Sau khi bổ sung adapter Photon: 4 test service đạt (parse, cache, lỗi provider,
  Photon address/POI và phân biệt tên địa điểm với khu vực hành chính).
- Edge fixture: dán link/tự điền, tọa độ ẩn nhưng lưu draft đúng, lỗi/partial,
  sửa form trong lúc chờ không bị ghi đè bởi response cũ, trường bị khóa, nút POI
  không làm dịch ghim, responsive 375/768/1024/1440; regression map/form đạt.
- Backend mới chạy kiểm tra ở 8081 với MySQL local và nguồn Photon thật: link FPT
  trả đúng `21.0124167,105.5252892`, đường N16/khu CNC Hòa Lạc và 23 địa điểm OSM.
- Kiểm tra browser thật tại origin 5173 với request chuyển tới backend 8081:
  mở hồ sơ thật được phép sửa, dán link, địa chỉ/khu vực/ghi chú tự điền, danh sách
  POI và tile thật tải thành công; không lưu/gửi thay đổi nhà trọ.

Ảnh: `target/property-location/live-edit.png`.
Log: `target/location-backend-tests.log`, `target/location-photon-tests.log`,
`target/location-unit-tests.log`, `target/location-frontend-build.log`,
`target/location-browser-tests.log`, `target/location-regression.log`,
`target/location-provider-live.log`, `target/location-browser-live.log`.

Backend 8081 chỉ dùng xác minh; instance Spring Boot chính phải khởi động lại để
nạp API/cấu hình mới. Không đổi API_TARGET của frontend hoặc dừng phiên 8080 của
người dùng. Không commit/push.
