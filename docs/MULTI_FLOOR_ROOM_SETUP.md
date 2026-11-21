# Thiết lập phòng nhiều tầng, nhiều loại xen kẽ

Mở **Loại phòng & Giá → Tạo loại phòng và phòng**
(`/host/room-types?propertyId=ID&layout=1`). Màn Danh sách phòng tiếp tục quản lý
phòng đã lưu; màn mới tạo bản nháp phòng trước khi lưu thật.

Ba bước trên màn hình là **Loại phòng**, **Tạo theo tầng** và **Gán loại phòng**.
Bạn có thể quay lại một bước mà giữ nguyên bản nháp.

1. Bấm **Thêm loại phòng** và đưa từng loại vào bản nháp. Có thể sửa hoặc bỏ
   từng loại trước khi lưu. Một đợt hỗ trợ tối đa 20 loại mới. Loại mới và
   loại đã lưu đều có thể gán cho phòng. Nếu chỉ muốn lưu loại trước, để
   danh sách phòng trống rồi bấm **Kiểm tra trước khi lưu**.
2. Chọn **Tạo theo dãy tầng** và nhập số tầng, số phòng mỗi tầng. Mặc định
   dãy bắt đầu ở tầng 1 và nối số phòng nếu tầng đã có phòng. Để thêm riêng
   vào một tầng, chọn **Thêm vào tầng đã có** và chọn tầng nhận phòng. Bạn
   cũng có thể mở trực tiếp tầng đang xem từ bước gán. Chọn **Loại chung cho
   nhóm này** nếu tất cả phòng vừa tạo cùng loại.
   Phần tên trước số phòng ghép với tầng và số thứ tự, ví dụ `P.101`.
   Tầng mới mặc định bắt đầu từ 01. Mục đánh số cho phép chọn số lẻ, số chẵn
   hoặc tự đặt số bắt đầu. Xem trước tên, rồi bấm **Thêm vào danh sách**.
3. Sửa tên và đổi loại ngay trong bảng. Dùng **Chọn nhanh** để gán cả tầng,
   nhóm lẻ, chẵn hoặc chưa gán. Checkbox đầu bảng chọn riêng các phòng
   trên trang đang xem. Qua trang khác trong cùng tầng vẫn giữ lựa chọn.
   Bật **Cần xử lý** để lọc phòng còn lỗi ở tầng đang xem, hoặc mở **Công cụ
   gán nâng cao** để sao chép, gán so le và chọn bằng danh sách số phòng.
   Với các phòng nằm rải rác, mở **Chọn nhanh bằng danh sách số phòng** và dán
   `101, 104, 108, 201, 205` (hoặc mỗi số một dòng). Lựa chọn áp dụng trên mọi tầng
   trong bản nháp. Số không tồn tại được báo rõ, giữ nguyên lựa chọn trước đó.
4. Mẫu so le có thể chứa A–B, A–B–C hoặc thứ tự do chủ trọ chọn (tối đa 10 vị trí),
   áp dụng cho phòng đã chọn hoặc kết quả lọc của tầng đang mở.
5. Sao chép loại phòng theo thứ tự trong bản nháp. Khi số phòng khác nhau,
   chỉ ghép các vị trí có phòng ở cả hai tầng. Giữ tên phòng và loại đã gán
   ở tầng đích theo mặc định. Tích **Ghi đè loại đã gán ở tầng đích** nếu cần.
6. Hoàn tác tối đa 10 thay đổi danh sách phòng gần nhất. Bản nháp lưu trong
   phiên của tab theo tài khoản và nhà trọ. Sau khi tải lại, chọn lại các ảnh
   đã đính kèm hoặc mở loại phòng và xác nhận dùng số ảnh hiện tại.
7. Bấm **Kiểm tra trước khi lưu** để xem số phòng đã gán, còn thiếu và lỗi theo
   tầng. Chọn tầng để quay về chỉnh sửa. Bấm **Tạo X phòng** trong hộp kiểm tra
   khi danh sách hợp lệ. Sau khi lưu, màn **Chọn phòng công khai** đọc danh sách
   phòng mới từ API. Phòng mới mặc định riêng tư.

Giới hạn: tối đa 5.000 phòng/lần, 200 tầng sinh tự động và 500 phòng/tầng.
Giao diện hiển thị 24 dòng mỗi trang, chọn cả tầng vẫn áp dụng cả những phòng
không nằm trên trang hiện tại. Bản nháp 1.000 phòng được kiểm tra trên trình duyệt.

`POST /api/host/rooms/setup` nhận phần JSON `setup` và các phần `photos`
khi có loại phòng mới. Backend tạo loại, ảnh và phòng trong cùng giao dịch.
Mỗi loại tối đa 10 ảnh, mỗi đợt tối đa 40 ảnh và tổng dung lượng 80 MB.
Màn nhập Excel tiếp tục hỗ trợ luồng nhập hiện tại.

`POST /api/host/rooms/layout` dùng cho đợt chỉ gán loại đã lưu. API nhận `propertyId` và mảng
`{roomTypeId, roomNumber, floor}`. Backend kiểm tra quyền sở hữu nhà trọ,
toàn bộ loại phòng, giá, số trùng và trạng thái trước khi lưu trong transaction.
Khóa tài khoản chủ trọ phối hợp với các API tạo/sửa phòng hiện có. Gửi lại cùng
danh sách bị chặn do trùng số, không tạo thêm bản sao. Không thay đổi phòng cũ.

Khởi động lại backend để dùng endpoint mới. Tính năng dùng các bảng loại phòng,
ảnh và phòng hiện có.

Kiểm tra: `frontend/tests/room-layout.test.js`,
`frontend/scripts/check-multi-floor-layout.cjs`, `check-room-type-wizard.cjs`,
`HostDashboardTests#multiFloorLayout*`. Trình duyệt dùng API giả; backend dùng H2,
không ghi database thật và không gửi SMS.
