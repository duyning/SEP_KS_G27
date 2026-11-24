# Hợp đồng thuê phòng

Cập nhật 18/11/2026. Web `/host/rooms`: khi đổi sang **Đang thuê**, chủ trọ có
thể bật **Tạo hợp đồng thuê phòng**. Tính năng này tùy chọn để không làm gián
đoạn việc quản lý phòng cũ chưa có hợp đồng trên hệ thống.

## Cách dùng

1. Chọn một hoặc nhiều phòng → Đổi trạng thái → Đang thuê, nhập ngày bắt đầu/kết thúc.
2. Bật **Tạo hợp đồng thuê phòng**. Ở bước đầu **Chọn mẫu**, chọn
   **Mẫu 1 · Hợp đồng thuê phòng trọ**, **Mẫu 2 · Hợp đồng thuê nhà trọ** hoặc
   mẫu có người ở cùng. Mẫu 2 dùng địa danh Hà Nội, ngày lập theo giờ Việt Nam,
   diện tích và trang thiết bị lấy từ cấu hình phòng được chọn.
   Có thể điền thêm số người ở, chỗ ở hiện tại, chu kỳ trả và ngày trả đầu tiên.
3. Nếu dùng mẫu riêng, chọn **Quét mẫu của tôi** ngay ở bước đầu. Chọn tệp theo thứ
   tự trang, đồng ý gửi tới Gemini, quét, đối chiếu và áp dụng, rồi bấm **Tiếp tục**.
4. Ở bước **Hai bên**, nhập thông tin bên cho thuê, người thuê và các chỗ trống
   được phát hiện trong mẫu. Nếu áp dụng toàn bộ bản quét, bản xem trước và tệp
   tải về dùng văn bản mẫu quét đã điền. Bản chép nguyên văn vẫn lưu riêng.
   Ở bước **Kỳ thuê & chi phí**, điền giá, tiền cọc, ngày trả (1–28) và chi phí.
   Bên cho thuê gợi ý từ tài khoản; giá gợi ý từ phòng, được phép sửa.
   Tiền trong hợp đồng là thỏa thuận của đợt thuê, không tự đổi giá niêm yết phòng.
5. Ở bước **Điều khoản & duyệt**, đối chiếu nội dung, mở bản xem đầy đủ và tích
   ô xác nhận của phòng.
   Sửa nội dung/ngày thuê sẽ bỏ xác nhận để tránh dùng lần kiểm tra cũ.
6. Khi chọn nhiều phòng: chuyển phòng trong ô Hợp đồng của phòng, điền người thuê
   riêng và xác nhận từng hợp đồng. Có thể dùng chung bên cho thuê/điều khoản;
   thao tác này không sao chép người thuê, giá thuê hoặc các ô đã điền trong mẫu.
   Ngày thuê áp dụng chung cả nhóm.
7. Bấm Lưu hợp đồng và cập nhật. Cả nhóm trạng thái và hợp đồng lưu trong cùng
   transaction; nếu một mục sai thì không lưu một phần.
8. Mở phòng → **Hợp đồng thuê phòng** để đọc bản hợp đồng đã lưu trong cửa sổ
   riêng. Nếu phòng có nhiều hợp đồng, chọn trong **Lịch sử hợp đồng**. Có thể
   tải bản PDF khổ A4 của hợp đồng đang xem. Phòng đang thuê chưa có
   hợp đồng hiện hành có nút tạo cho đợt thuê hiện tại.

Chuyển Còn trống: xóa ngày hiện tại trên phòng, chuyển hợp đồng đang quản lý sang
lịch sử, giữ nguyên nội dung và khoảng ngày cũ của hợp đồng. `CLOSED` là mốc kết
thúc quản lý đợt thuê trên hệ thống, không xác nhận việc thanh lý pháp lý.
Không tự đổi trạng thái khi đến ngày kết thúc.

### Ký hợp đồng trên web

1. Chủ trọ mở hợp đồng hiện hành rồi bấm **Ký hợp đồng**. Chọn ký bằng họ tên
   hoặc vẽ chữ ký, tích ô đồng ý và bấm **Xác nhận ký**.
2. Bấm **Tạo liên kết mời ký**, sao chép và gửi riêng cho người thuê. Liên kết
   có hạn ký 7 ngày. Tạo liên kết mới sẽ thay thế liên kết cũ. Khi hai bên dùng
   thiết bị khác nhau, gửi liên kết từ địa chỉ web mà cả hai truy cập được.
3. Người thuê mở liên kết, đăng nhập, xác minh qua SMS nếu cần và dùng số điện
   thoại đã ghi trong hợp đồng. Sau khi đọc hợp đồng, ký ở cuối trang.
4. Chữ ký và thời điểm ký xuất hiện trong bản xem và PDF. Chủ trọ có thể mở lại
   hợp đồng để xem chữ ký mới nhất. Sau khi ký, người thuê có thể dùng lại liên
   kết để đọc hoặc tải PDF từ chính tài khoản đã ký.

Server lưu mã băm nội dung, người ký, chữ ký và thời điểm ký theo từng bên.
Hợp đồng đã kết thúc giữ lại chữ ký đã lưu. Mã liên kết mời ký được lưu dưới
dạng mã băm.

## Đọc bản scan

Dùng Gemini multimodal `generateContent`, inline JPG/PNG/PDF và JSON schema,
không có OCR giả lập trong runtime. Cấu hình backend:

```properties
RENTAL_CONTRACT_SCAN_KEY=your-gemini-api-key
RENTAL_CONTRACT_SCAN_MODEL=gemini-3.1-flash-lite
```

Hai biến tùy chọn; mặc định dùng cấu hình AI mô tả nhà trọ đang có
(`PROPERTY_DESCRIPTION_AI_KEY`/model, sau đó `GEMINI_API_KEY`/model). Điền vào
file cấu hình local đang import hoặc biến môi trường của backend, không đặt
trong frontend. Không có key: mẫu hệ thống/nhập tay vẫn dùng được; nút đọc scan
hiển thị chưa cấu hình. Khởi động lại backend sau khi chỉnh cấu hình.

Tối đa 5 tệp, 5 MB/tệp, tổng 10 MB. Backend kiểm tra MIME và chữ ký PDF hoặc
giải mã JPG/PNG với giới hạn 20 megapixel. PDF hỏng/mã hóa hoặc nội dung không
đọc được có thể bị dịch vụ từ chối. Tải bản PDF không khóa, ảnh rõ nét để đọc lại.
Giới hạn 1 lượt/15 giây/chủ trọ và 2 lượt đồng thời/JVM, timeout 60 giây.
Không retry tự động vì có thể phát sinh thêm lượt tính phí. Dữ liệu chưa đọc rõ
để trống, giá/ngày không hợp lệ bị bỏ qua kèm cảnh báo; không lấy dữ liệu đó
để thay đổi phòng, quyền, trạng thái hay tự ký hợp đồng.

Chỉ các file chủ trọ chọn được gửi đến Gemini sau thao tác đồng ý/đọc; không gửi
JWT, file CCCD của đơn chủ trọ hay hồ sơ tài khoản khác. File scan không lưu vào
database, thư mục public hoặc Google Files API. Sau khi đọc, chủ trọ kiểm tra
rồi lưu **nội dung văn bản đã chỉnh**, không lưu ảnh gốc/chữ ký. Chính sách xử
lý dữ liệu của tài khoản Gemini vẫn áp dụng với tài liệu được gửi.

Tài liệu provider:
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/document-processing
- https://ai.google.dev/gemini-api/docs/structured-output

## API, dữ liệu và quyền

- GET `/api/host/rental-contracts/templates`: mẫu hệ thống, `scanAvailable`.
- POST `/api/host/rental-contracts/scan`: multipart `roomId`, `consent`, `files`.
  Kiểm tra phòng thuộc chủ trọ trước khi gửi provider, không ghi dữ liệu.
- GET `/api/host/rental-contracts/rooms/{roomId}`: danh sách hợp đồng mới nhất trước.
- POST cùng đường dẫn: thêm hợp đồng cho phòng Đang thuê đã có đủ ngày.
- PATCH `/api/host/rooms/status`: thêm danh sách `contracts` tùy chọn; khi có hợp
  đồng phải có chính xác một mục hợp lệ/được kiểm tra cho mỗi phòng đã chọn.

Chỉ ROOM_HOST/ADMIN đăng nhập, và **chỉ phòng thuộc chính tài khoản**. USER/STAFF
không có quyền, ADMIN không được đọc phòng của người khác qua API này. Hợp đồng
không thêm vào DTO phòng/danh sách công khai. Không cung cấp đường dẫn file công khai.

Bảng `rental_contracts`: owner/room ID, trạng thái ACTIVE/CLOSED, snapshot tên/địa
chỉ nhà trọ/số phòng, ngày thuê, JSON chi tiết và mốc tạo/đóng. Khóa chủ trọ dùng
chung với thay đổi trạng thái để ngăn lưu trùng đợt thuê. Đợt thuê chỉ có một
hợp đồng ACTIVE; đổi khoảng ngày khi đã có hợp đồng sẽ báo xung đột. Có thể xác
nhận lại cùng trạng thái/ngày mà không tạo hợp đồng mới. Lịch sử không bị xóa
khi phòng trả về Còn trống; không sửa nội dung hợp đồng đã lưu trong phiên bản này.

Development Hibernate `ddl-auto=update` tạo bảng khi restart. Môi trường quản lý
SQL thủ công chạy `sql/rental-contracts.sql` khi tạo bảng mới hoặc
`sql/migrations/20261121_rental_contract_signatures.sql` khi nâng cấp bảng cũ.
Không có cập nhật dữ liệu thuê cũ hoặc tự tạo hợp đồng mẫu cho phòng cũ.

Kiểm thử H2: `RentalContractTests`, `RentalContractScanTests`, `HostDashboardTests`.
Frontend: `rental-contracts.test.js`, `rooms.test.js`, `check-rental-contracts.cjs`,
`check-room-bulk-status.cjs`. Kiểm thử scan dùng HTTP client giả; trình duyệt dùng
API fixture, không gửi hợp đồng thật hoặc SMS, không ghi database đang chạy.
