# Tích hợp bản đồ NestHub / HL-RCS

## Source và quyết định tích hợp

Project chạy thật là `Code/HL-RCS/HL-RCS`: Spring Boot, MySQL, React 19,
React Router, Vite, CSS thuần và Lucide. `Code/giao_dien` là prototype;
`Code/giao_dien_app` là giao diện app, không phải frontend React đang chạy.

Frontend gọi API tương đối qua `services/auth.js` và Vite proxy `API_TARGET`.
JWT, interceptor xử lý hết phiên, AuthContext và route guard được giữ nguyên.
Luồng dữ liệu: PropertyRegistration → staff duyệt → Property → RoomType → Room.
Vị trí thuộc nhà trọ, được chia sẻ bởi các loại phòng/phòng của nhà trọ đó.

Đã kiểm tra Entity, request/response DTO, repository, service, controller,
SecurityConfig, PublicAccommodationPolicy, form đăng/sửa, tìm kiếm/chi tiết,
schema SQL và các script migration. Dự án không có Flyway/Liquibase;
Hibernate dùng `ddl-auto=update`, các migration SQL hiện có được chạy thủ công.

Latitude/longitude đã có trong PropertyRegistrationRequest, lưu nguyên trong
`property_registrations.registration_details` (TEXT chứa JSON). Backend đã kiểm tra
cặp tọa độ, định dạng số và giới hạn ±90/±180. Vì đã có nơi lưu bền vững,
không thêm cột/bảng, không nhân đôi tọa độ và không cần migration/backfill.
Public response bổ sung tọa độ kiểu BigDecimal, đọc từ hồ sơ đã duyệt liên kết
với Property. Hồ sơ thiếu/sai tọa độ trả cả hai trường null.

Đăng ký và chỉnh sửa vẫn qua API multipart hiện có. PropertyEditService kiểm tra
chủ sở hữu, version token, allowed fields, tài liệu và ảnh. Chỉnh sửa nhà trọ đã
duyệt tạo đề nghị thay đổi; vị trí cũ tiếp tục công khai tới khi staff duyệt.
Không thay đổi luồng xét duyệt hoặc xác thực. Tọa độ vẫn tùy chọn theo nghiệp vụ
hiện tại; nếu có cung cấp thì phải đủ cặp và hợp lệ.

## Chức năng đã nối

- Đăng/sửa: Leaflet + React Leaflet + OpenStreetMap, bấm bản đồ, kéo marker,
  nhập tọa độ thủ công; state form giữ nguyên. Bản đồ chỉ sửa cả cặp khi cả
  latitude và longitude nằm trong danh sách trường được phép sửa.
- Ô dán vị trí đọc tọa độ hoặc liên kết Google đầy đủ có tọa độ ngay trên trình
  duyệt. Không gọi geocoding hoặc tải Google Maps JavaScript API. Địa chỉ thường,
  place ID và link rút gọn không được tự suy thành tọa độ; giao diện hướng dẫn
  nhập địa chỉ rồi chọn ghim.
- Chi tiết: bản đồ tại tọa độ thật, zoom/pan, marker, nút Chỉ đường mở Google Maps
  qua URL; nhà trọ chưa có tọa độ có thông báo thay thế.
- `/map` dùng cùng SearchPage, hook/API tìm kiếm, bộ lọc URL và phân trang như
  `/search`. Popup có tên, giá, địa chỉ, ảnh nếu có và route chi tiết hiện hữu.
- Chỉ marker của kết quả trên trang hiện tại được tải; ghi rõ số phòng có tọa độ.
  Tối đa 6 loại phòng/trang nên chưa cần clustering hay endpoint theo viewport.
  Những loại phòng trùng tọa độ dùng chung marker và có từng liên kết trong popup.
- Loading, API error/retry, empty, thiếu tọa độ, tile error/retry; marker asset
  được import qua Vite, ResizeObserver gọi invalidateSize khi kích thước thay đổi.

## File thuộc thay đổi này

Đường dẫn dưới đây tính từ thư mục có `pom.xml`.

| File | Thay đổi |
| --- | --- |
| `frontend/package.json`, `frontend/pnpm-lock.yaml` | Thêm React Leaflet 5.0.0 |
| `frontend/.env.example` | Cấu hình tile, attribution; bỏ yêu cầu Google key |
| `frontend/src/components/AccommodationMap.jsx` | MapCanvas, picker marker, bản đồ chi tiết/danh sách |
| `frontend/src/components/PropertyLocationMap.jsx` | Luôn dùng OpenStreetMap |
| `frontend/src/components/OpenStreetPropertyMap.jsx` | Tái sử dụng bản đồ chung trong form cũ |
| `frontend/src/components/PropertyAddressLookup.jsx` | Đọc tọa độ cục bộ, không geocoding |
| `frontend/src/services/map-location.js` | Kiểm tra tọa độ, tạo URL chỉ đường/chi tiết |
| `frontend/src/styles/accommodation-map.css` | CSS giới hạn phạm vi component, responsive |
| `frontend/src/pages/host/HostPropertyCreatePage.jsx` | Áp dụng tọa độ được dán, giữ địa chỉ/ghi chú |
| `frontend/src/pages/host/HostPropertyEditForm.jsx` | Tôn trọng quyền sửa cả cặp tọa độ |
| `frontend/src/pages/public/SearchPage.jsx` | Chế độ bản đồ với filter/phân trang cũ |
| `frontend/src/pages/public/MapSearchPage.jsx` | Bỏ fixture, dùng SearchPage |
| `frontend/src/pages/public/DetailPrototype.jsx` | Thay bản đồ mô phỏng bằng bản đồ thật |
| `frontend/src/layouts/PortalLayout.jsx` | Thêm `/map` vào các trang tự quản lý layout |
| `src/main/java/org/hlrcs/dto/response/AccommodationSummary.java` | Thêm latitude/longitude nullable |
| `src/main/java/org/hlrcs/service/AccommodationService.java` | Đọc tọa độ đã duyệt, URL chỉ đường |
| `src/test/java/org/hlrcs/AccommodationTests.java` | Test tọa độ/legacy/publication |
| `frontend/tests/map-location.test.js` | Test tọa độ biên/thiếu/sai và URL |
| `frontend/scripts/check-accommodation-map.cjs` | Kiểm thử UI với API/tile giả lập |
| `docs/leaflet-integration.md` | Báo cáo và hướng dẫn |

Các thay đổi có sẵn ở Auth/Profile/Home/BecomeHost/HostDashboard và CSS mobile
không thuộc tác vụ này. PortalLayout vốn có sửa đổi ở class dashboard; sửa đổi đó
được giữ nguyên, tác vụ bản đồ chỉ bổ sung `/map` vào điều kiện layout.

## API và dependency

Không thêm endpoint. Các response sau bổ sung `latitude`, `longitude` nullable:

- `GET /api/properties/search`
- `GET /api/properties/{propertyId}/room-types/{roomTypeId}`
- `GET /api/properties/{propertyId}/room-types/{roomTypeId}/details` (summary,
  roomTypes, similar). `mapUrl` dùng tọa độ khi có, giữ fallback địa chỉ cho dữ liệu cũ.

Request đăng/sửa giữ nguyên latitude/longitude dạng chuỗi và các API hiện có.
Điều kiện công khai giữ nguyên: Property ACTIVE, hồ sơ APPROVED, chủ sở hữu
ACTIVE, loại phòng có giá/diện tích hợp lệ. Không công khai JSON hồ sơ hay tài liệu.

Dependency mới duy nhất khai báo trực tiếp: `react-leaflet@5.0.0`, kéo theo
`@react-leaflet/core@3.0.0`. Leaflet 1.9.4 đã có sẵn; peer dependencies của gói
đã cài hỗ trợ React/React DOM 19. Không đổi phiên bản React hoặc Leaflet.

## Cấu hình và tile

Mặc định dùng `https://tile.openstreetmap.org/{z}/{x}/{y}.png` với attribution
OpenStreetMap luôn hiển thị. Có thể đổi `VITE_MAP_TILE_URL` và thêm attribution
nhà cung cấp qua `VITE_MAP_TILE_ATTRIBUTION`, sau đó build lại Vite.
Không cần Google Maps key. Các biến Google cũ trong `.env.local` không còn được
luồng đăng/sửa/tìm kiếm/chi tiết này sử dụng.

Không prefetch/offline/bulk download; trình duyệt giữ cơ chế cache và Referer
mặc định. Với lưu lượng triển khai lớn, cấu hình nhà cung cấp tile phù hợp.
Tham chiếu: [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/),
[React Leaflet](https://react-leaflet.js.org/docs/start-installation/).

## Kết quả kiểm thử thực tế

- `pnpm build`: đạt; Vite còn cảnh báo bundle lớn hơn 500 kB.
- 25 test liên quan: đạt (`map-location`, `property-registration`, `property-edit`,
  `accommodations`, `search-prototype`).
- Maven: `AccommodationTests,HostDashboardTests,PropertyAssignmentSecurityTests`:
  73 tests, 0 failure/error. Test dùng H2, không truy cập database MySQL của người dùng.
  Sandbox chặn Java loopback ở lần đầu; chạy lại ngoài sandbox với
  `-DargLine=-Djdk.net.unixdomain.tmpdir=.../target/java-tmp` đã đạt.
- Edge headless: đạt ở 375/768/1024/1440 px, marker/popup trùng vị trí, URL
  filters/phân trang, route chi tiết, chỉ đường, thiếu tọa độ, empty/error,
  retry tile, keyboard marker, 200% zoom bản đồ, nhấn/kéo ghim, dán tọa độ không
  mất địa chỉ; mở trang sửa với tọa độ cũ, thay tọa độ và giữ trường bị khóa.
  Không phát hiện pageerror. Browser dùng API và tile giả lập, không ghi MySQL
  hoặc tải hàng loạt tile công cộng. Ảnh kiểm tra ở `target/map-browser/`.
- Toàn bộ frontend: còn 4 lỗi ngoài phạm vi bản đồ: test logout ở ProfilePage,
  inventory route, trạng thái integration của route, link `href="#"` ở
  DetailPrototypeShell. Không sửa các module này. Log: `target/map-frontend-all-tests.log`.
- Project chưa khai báo lệnh lint, không có kết quả lint để khẳng định.
- Chưa kiểm tra ghi/đọc trực tiếp MySQL thật hoặc toàn bộ luồng duyệt thủ công
  bằng tài khoản thực. Không thay đổi/reset dữ liệu MySQL.

Log khác: `target/map-build.log`, `target/map-related-tests.log`,
`target/map-backend-tests.log`, `target/map-browser.log`.

Chạy UI test: bật Vite cổng 5174 rồi chạy
`node frontend/scripts/check-accommodation-map.cjs` từ thư mục có pom.xml;
cần Playwright cài sẵn, có thể truyền đường dẫn module qua `PLAYWRIGHT_MODULE`.

## Tự kiểm tra trên hệ thống thật

1. Bật MySQL/backend như README, chạy `pnpm dev` trong frontend.
2. Đăng nhập chủ trọ, mở `/host/property/new`. Ở bước Vị trí, nhập địa chỉ,
   chọn khu vực, nhấn bản đồ, kéo ghim hoặc dán `21.018812,105.521512`.
   Hoàn thành ảnh/tài liệu và gửi theo quy trình cũ. Kiểm tra tọa độ trong hồ sơ.
3. Duyệt hồ sơ bằng staff như hiện tại; thêm loại phòng/phòng hợp lệ nếu chưa có.
4. Từ Nhà trọ của tôi mở chỉnh sửa hồ sơ. Xác nhận ghim cũ hiển thị; đổi ghim,
   gửi đề nghị thay đổi và duyệt. Trước khi duyệt, trang công khai phải giữ ghim cũ.
5. Mở `/search`, chọn bộ lọc, chuyển Bản đồ. Thử phân trang, popup, Xem chi tiết;
   tại chi tiết nhấn Chỉ đường và kiểm tra destination đúng tọa độ đã duyệt.
6. Mở một nhà trọ cũ chưa có tọa độ: chi tiết vẫn hoạt động, có thông báo thay thế;
   phòng đó không có marker nhưng vẫn có trong chế độ danh sách.

Chưa commit hoặc push.

## Khắc phục nền bản đồ xám trên máy local (05/11/2026)

Đã tái hiện trên trang đang chạy thật ở cổng 5173, không mock API/tile:
DNS của máy phân giải tile.openstreetmap.org về 127.0.0.1 và ::1;
request ảnh báo net::ERR_CONNECTION_REFUSED, naturalWidth = 0.
Không sửa hosts, DNS hệ điều hành hoặc cơ chế xác thực.

Đã cập nhật frontend/.env.local (file riêng máy, không commit) sang
https://tile.openstreetmap.de/{z}/{x}/{y}.png và thêm attribution
OpenStreetMap Deutschland. Vite tự nạp lại cấu hình. Nguồn mặc định trong
code vẫn giữ nguyên; .env.example bổ sung cấu hình thay thế cho local.
Trang /map thực tế đã trả HTTP 200 cho các tile, ảnh có naturalWidth = 256
và đã kiểm tra ảnh chụp thấy đường phố/bản đồ thật. Log: target/map-live-after.log.
Nguồn .de dùng để phát triển local; trước triển khai thương mại cần kiểm tra
điều kiện nhà cung cấp: https://www.openstreetmap.de/nutzen/dienste-osm-de/.
Nếu trình duyệt đang giữ màn hình cũ, tải lại trang; nếu Vite chưa đọc biến mới,
khởi động lại pnpm dev.
