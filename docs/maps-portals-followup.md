# Bản đồ các portal và tiện ích luôn hiển thị

## Các thay đổi

1. **Nhà trọ của tôi**: bản đồ tổng quan cho các nhà trọ trên trang danh sách hiện
   tại; mỗi ghim mở popup với link tới chi tiết nhà trọ. Chi tiết từng nhà trọ cũng
   có bản đồ và chỉ đường. Bộ lọc, phân trang và quyền chủ sở hữu giữ nguyên.
   Response `GET /api/host/property` bổ sung `latitude`, `longitude` nullable, đọc
   từ đúng hồ sơ liên kết hiện có; không đưa tọa độ đề nghị chưa duyệt lên bản đang
   công khai. Hồ sơ cũ thiếu tọa độ hiển thị thông báo thay thế.
2. **Thẩm định hồ sơ xác minh**: thay component Leaflet riêng có URL tile OSM.org
   hardcode bằng RoomLocationMap/MapCanvas dùng chung, đọc cấu hình tile đang hoạt
   động trên máy. Ghim chỉ xem, không kéo/sửa. Bỏ số tọa độ khỏi giao diện và bỏ
   các hàng Vĩ độ/Kinh độ khỏi bảng so sánh; vẫn báo khi vị trí ghim thay đổi.
   Không bỏ dữ liệu tọa độ trong hồ sơ hoặc thay đổi quyền/quy trình duyệt.
3. **Xác minh nhà trọ**: mặc định Mới nhất trước theo createdAt; dùng ID giảm dần
   khi trùng thời gian. Đặt lại cũng về Mới nhất trước; vẫn cho chọn cũ nhất hoặc
   cập nhật gần nhất khi cần. Sắp xếp trước khi chia trang.
4. **Đăng ký nhà trọ**: nối luồng resolveDetails vào ô dán link như trang cập nhật.
   Link ngắn/full hoặc tọa độ được gửi tới API đọc vị trí hiện có; ghim và gợi ý
   địa chỉ/khu vực/ghi chú được điền, giữ nguyên ảnh, tài liệu, các trường khác.
   Có thể lấy lại gợi ý sau khi di chuyển ghim bằng nút Điền thông tin từ ghim.
5. **Tiện ích quanh ghim**: tự tải và hiển thị icon ngay khi có ghim hợp lệ, không
   chờ bấm Tiện ích. Icon riêng cho giáo dục/thư viện, y tế, ăn uống, cà phê, cửa
   hàng/chợ, xe buýt, ngân hàng/ATM và nhóm địa điểm khác. Popup vẫn có tên, loại,
   khoảng cách đường chim bay và chỉ đường. Nút Tiện ích mở/đóng danh sách bổ sung,
   không tắt các icon. Chưa có ghim thì không truy vấn quanh tâm khu vực giả định.

## Tải dữ liệu tự động

Tự tải ở đây chỉ áp dụng **địa điểm quanh ghim**, không tự tra địa chỉ hoặc gán
giá trị vào form. Reverse địa chỉ vẫn chạy khi bấm nút rõ ràng của người dùng.
Đây là thay đổi theo yêu cầu mới về tiện ích luôn hiện trên bản đồ.

Frontend đợi ghim ổn định 650 ms, gom các request cùng tọa độ, cache 10 phút với
tối đa 64 vị trí và xếp hàng tối thiểu 1,6 giây giữa request POI mới. Một consumer
hủy không làm hủy request dùng chung của bản đồ khác; kết quả cũ không được gán
cho ghim mới. Backend vẫn giữ cache/rate limit và provider OSM/Photon đã cấu hình.
Nếu provider lỗi, không tạo POI giả; thông báo trên map và nút thử lại trong danh
sách. Nguồn công cộng chỉ phù hợp mức sử dụng local đã thống nhất; tải lớn/nhiều
instance cần hạ tầng hoặc gói provider phù hợp (xem property-location-lookup.md).

## File chính

- `frontend/src/pages/host/HostPropertyPage.jsx`
- `frontend/src/pages/host/HostPropertyCreatePage.jsx`
- `frontend/src/components/VerificationLocationMap.jsx`
- `frontend/src/components/VerificationChangeComparison.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationsPage.jsx`
- `frontend/src/components/NearbyMapPlaces.jsx`
- `frontend/src/components/AccommodationMap.jsx`
- `frontend/src/services/property-location.js`
- `frontend/src/styles/accommodation-map.css`
- `src/main/java/org/hlrcs/dto/response/HostPropertyResponse.java`
- `src/main/java/org/hlrcs/service/HostPropertyService.java`
- Test unit, browser liên quan và `HostDashboardTests.java`.

Không thêm dependency, endpoint hay bảng/migration. Không commit/push.

## Kiểm tra

- Build Vite đạt (còn cảnh báo bundle lớn như trước).
- 26 unit test frontend liên quan đạt, gồm cache/gom request và hủy consumer.
- 78 test backend đạt: HostDashboardTests, PropertyAssignmentSecurityTests,
  AccommodationTests, PropertyLocationServiceTests.
- Chạy lại 45 HostDashboardTests sau khi bổ sung assert response tọa độ host: đạt.
- Edge fixture: host tổng quan/chi tiết có map; staff có map cùng nguồn tile cấu
  hình và không hiển thị số kinh/vĩ độ, marker staff không kéo; newest/reset;
  đăng ký dán link tự điền; icon giáo dục/y tế tự hiện trước khi bấm; request dùng
  chung không lặp do StrictMode; kiểm tra chiều rộng 375/768/1024/1440.
- Regression map/form cập nhật, lỗi/partial/race, trường bị khóa: đạt. Browser lần
  này dùng API/tile fixture, không gửi hồ sơ hoặc sửa dữ liệu MySQL thực tế.

Log: `target/maps-followup-build.log`, `target/maps-followup-unit.log`,
`target/maps-followup-backend.log`, `target/maps-followup-host-test.log`,
`target/maps-followup-browser.log`, `target/maps-followup-regression.log`,
`target/maps-followup-location.log`.
Ảnh kiểm tra fixture: `target/map-portals/host-overview.png`,
`target/map-portals/staff-location.png`.

**Khởi động lại Spring Boot rồi tải lại trình duyệt** để nạp tọa độ trong response
host mới. Vite tự cập nhật frontend; nguồn tile và nguồn Photon local giữ cấu hình
đã thiết lập, không cần Google Maps key.
