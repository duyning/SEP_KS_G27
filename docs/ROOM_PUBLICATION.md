# Chọn phòng công khai

Phòng mới và phòng cũ chưa có lựa chọn đều mặc định riêng tư (`rooms.public_visible=false`).
Không tự công khai khi nhân viên phê duyệt nhà trọ hoặc khi tạo loại phòng/phòng mới.

1. Chủ trọ tạo loại phòng và danh sách phòng. Sau khi lưu thành công, web mở màn
   **Chọn phòng công khai** (`/host/rooms?propertyId=ID&publication=1`).
2. Tích các phòng muốn giới thiệu và bấm **Lưu phòng công khai**.
3. Có thể quay lại bằng nút Chọn phòng công khai ở Nhà trọ của tôi hoặc Danh sách phòng.
4. Bỏ chọn hết rồi lưu sẽ ẩn nhà trọ phía người thuê; danh sách phòng nội bộ vẫn còn.

Điều kiện công khai cũ (hồ sơ được duyệt, nhà trọ hoạt động, không chờ tái xác minh)
vẫn áp dụng. Chọn phòng không thay thế việc xét duyệt. Loại phòng không có phòng
được chọn không xuất hiện trong tìm kiếm, bản đồ, chi tiết, danh sách liên quan và
các API ảnh loại phòng. Số phòng trống công khai và điều kiện duyệt lịch xem chỉ
tính phòng được chọn. Chủ trọ vẫn quản lý toàn bộ phòng, kể cả phòng riêng tư.

`PUT /api/host/rooms/publication` nhận `{propertyId, roomIds}`; danh sách rỗng là ẩn
tất cả. Backend kiểm tra chủ sở hữu, toàn bộ ID, trạng thái nhà trọ và cập nhật
trong cùng transaction. Các thao tác sửa tình trạng phòng giữ nguyên lựa chọn
công khai. Thay lựa chọn làm mất mốc xác nhận số phòng trống của loại phòng bị ảnh hưởng.

Restart backend để `ddl-auto=update` thêm cột mới. Môi trường dùng migration thủ
công có `sql/room-publication.sql`; không chạy lại nếu cột đã tồn tại. Sau cập nhật,
chủ trọ phải chọn và lưu các phòng cũ muốn công khai.

Kiểm thử: `HostDashboardTests`, `AccommodationTests`, `ViewingFlowTests` dùng H2;
`frontend/scripts/check-room-publication.cjs` và `check-room-type-wizard.cjs` dùng API
mô phỏng, không thay đổi dữ liệu thật.
