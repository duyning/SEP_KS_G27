# Chọn nhiều phòng và khoảng ngày thuê

Cập nhật 2026-11-14. Web `/host/rooms` hỗ trợ checkbox ở cả chế độ theo tầng và
danh sách. Chọn tất cả áp dụng cho toàn bộ kết quả đang lọc, kể cả các trang bảng
khác; tối đa 200 phòng mỗi lần. Đổi bộ lọc/nhà trọ sẽ bỏ chọn để tránh cập nhật
nhầm phòng đang ẩn. Đổi chế độ hiển thị hoặc chuyển trang vẫn giữ lựa chọn.

`PATCH /api/host/rooms/status` nhận `propertyId`, `roomIds`, `status`,
`leaseStartDate`, `leaseEndDate`. Chỉ ROOM_HOST/ADMIN và chỉ các phòng của chính
tài khoản, trong cùng nhà trọ hoạt động/đã duyệt, được phép cập nhật. Backend
khóa chủ trọ và các phòng theo thứ tự ID, kiểm tra toàn bộ rồi lưu cùng một
transaction; không cập nhật từng phần khi thiếu phòng hoặc có dữ liệu sai.

- OCCUPIED: bắt buộc hai ngày hợp lệ, ngày kết thúc bằng hoặc sau ngày bắt đầu.
  Một khoảng ngày áp dụng cho cả nhóm đã chọn; nhóm có lịch thuê khác nhau phải
  được cập nhật riêng.
- VACANT: xóa hai ngày của đợt thuê hiện tại. Đây là metadata của lần thuê đang
  quản lý; chưa có bảng lịch sử hợp đồng hoặc tự chuyển VACANT theo ngày kết thúc.
- Cập nhật từng phòng qua menu/chi tiết cũng mở hộp trạng thái có ngày thuê.
  Editor và `PUT /api/host/rooms/{id}` hỗ trợ cùng hai trường. Phòng OCCUPIED cũ
  chưa có ngày vẫn đọc được; backend cho sửa thông tin/xác nhận lại mà không
  tự bịa ngày, nhưng chuyển mới từ VACANT phải cung cấp đầy đủ ngày.
- Ngày nằm trong DTO phòng của chủ trọ, không thêm vào DTO tìm kiếm công khai.
  Trạng thái đổi làm mất xác nhận tổng loại phòng như luồng tồn kho trước đây;
  mỗi phòng được cập nhật mốc xác nhận tình trạng thực tế.

Schema: `rooms.lease_start_date`, `rooms.lease_end_date` kiểu DATE nullable.
Development dùng Hibernate update khi restart; hệ thống quản lý SQL thủ công
dùng `sql/room-lease-dates.sql` một lần. Không tự điền ngày cho dữ liệu cũ.

Kiểm thử: `HostDashboardTests#bulkRoom*`, các kiểm thử phòng hiện có,
`frontend/tests/rooms.test.js` và `frontend/scripts/check-room-bulk-status.cjs`.
Kiểm thử trình duyệt dùng API giả lập và không ghi dữ liệu ứng dụng.
