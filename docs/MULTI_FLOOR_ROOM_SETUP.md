# Thiết lập phòng nhiều tầng, nhiều loại xen kẽ

Mở **Loại phòng & Giá → Thiết lập phòng nhiều tầng**
(`/host/room-types?propertyId=ID&layout=1`). Màn Danh sách phòng tiếp tục quản lý
phòng đã lưu; màn mới tạo bản nháp phòng trước khi lưu thật.

1. Chuẩn bị các loại phòng. Có thể bấm **Lưu loại phòng, thiết lập phòng sau**
   để tạo nhiều loại trước, không cần tạo phòng giả cho từng loại.
2. Tạo khung tầng và số phòng. Ví dụ tầng 1–8, mỗi tầng 10 phòng tạo 80 phòng nháp.
   Có tiền tố tùy chọn; tự bỏ qua số phòng đã tồn tại, không ghi đè dữ liệu cũ.
   Tầng có cơ cấu số lượng khác có thể tạo thêm riêng, bỏ phòng nháp hoặc đổi số.
3. Chọn phòng bất kỳ, cả tầng, phòng lẻ hoặc phòng chẵn rồi gán loại hàng loạt.
   Cũng có thể đổi loại trực tiếp trên từng ô phòng.
   Với các phòng nằm rải rác, mở **Chọn nhanh bằng danh sách số phòng** và dán
   `101, 104, 108, 201, 205` (hoặc mỗi số một dòng). Lựa chọn áp dụng trên mọi tầng
   trong bản nháp. Số không tồn tại được báo rõ, giữ nguyên lựa chọn trước đó.
4. Mẫu so le có thể chứa A–B, A–B–C hoặc thứ tự do chủ trọ chọn (tối đa 10 vị trí),
   áp dụng cho phòng đã chọn hoặc kết quả lọc của tầng đang mở.
5. Sao chép loại phòng theo vị trí sang nhiều tầng có cùng số phòng. Số phòng
   từng tầng giữ nguyên. Nếu số lượng khác, thao tác bị chặn toàn bộ.
6. Hoàn tác tối đa 10 thay đổi gần nhất. Bản nháp số phòng/tầng/loại phòng tự lưu
   trong sessionStorage theo tài khoản và nhà trọ, khôi phục khi tải lại trong tab.
   Đây không phải lưu vào server; thông báo xuất hiện nếu trình duyệt không lưu được.
7. Kiểm tra tổng hợp rồi lưu. Tất cả phòng phải có loại hợp lệ và không trùng số.
   Sau khi tạo thành công, mở màn **Chọn phòng công khai**. Phòng mới mặc định riêng tư.

Giới hạn: tối đa 5.000 phòng/lần, 200 tầng sinh tự động và 500 phòng/tầng.
Giao diện chỉ dựng 24 ô phòng mỗi trang, chọn cả tầng vẫn áp dụng cả những phòng
không nằm trên trang hiện tại. Bản nháp 1.000 phòng được kiểm tra trên trình duyệt.

`POST /api/host/rooms/layout` nhận `propertyId` và mảng
`{roomTypeId, roomNumber, floor}`. Backend kiểm tra quyền sở hữu nhà trọ,
toàn bộ loại phòng, giá, số trùng và trạng thái trước khi lưu trong transaction.
Khóa tài khoản chủ trọ phối hợp với các API tạo/sửa phòng hiện có. Gửi lại cùng
danh sách bị chặn do trùng số, không tạo thêm bản sao. Không thay đổi phòng cũ.

Khởi động lại backend để có endpoint mới. Không cần cột dữ liệu mới ngoài
`public_visible` của tính năng chọn phòng công khai đã triển khai trước đó.

Kiểm tra: `frontend/tests/room-layout.test.js`,
`frontend/scripts/check-multi-floor-layout.cjs`, `check-room-type-wizard.cjs`,
`HostDashboardTests#multiFloorLayout*`. Trình duyệt dùng API giả; backend dùng H2,
không ghi database thật và không gửi SMS.
