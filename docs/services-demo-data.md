# Dữ liệu demo giao diện services

Chạy tại thư mục project: `./scripts/seed-demo-services.ps1`.

Script thêm 12 dịch vụ có tiền tố `[DEMO-SV-01]` đến `[DEMO-SV-12]`, chia đều
cho 4 danh mục có sẵn. Có giá cố định, giá từ và giá thỏa thuận; các khu vực
Tân Xã, Thạch Hòa, Bình Yên, ĐH FPT và Khu Công nghệ cao để thử bộ lọc.
Chạy lại không tạo trùng. Không thay đổi dịch vụ hiện có, tài khoản hoặc quyền.
Sử dụng một nhà cung cấp đang đủ điều kiện công khai; không tạo số liên hệ giả.

Ngày seed: 02/11/2026. API local xác nhận tổng 14 dịch vụ, trong đó 12 bản demo.
Trang dùng phân trang số, mặc định 6 dịch vụ mỗi trang:

- Ban đầu 6 thẻ.
- Trang 2: 6 thẻ tiếp theo (`?page=2`).
- Trang 3: 2 thẻ cuối (`?page=3`).
- Đổi tìm kiếm, danh mục, khu vực hoặc sắp xếp sẽ trở về trang 1.
- URL giữ trang hiện tại khi tải lại hoặc quay lại; trang vượt giới hạn được điều chỉnh về trang hợp lệ.

Các bản demo có hồ sơ APPROVED và dịch vụ ACTIVE trong database local để thỏa
điều kiện API public. Mô tả và ghi chú hồ sơ ghi rõ đây là dữ liệu demo.
Không sử dụng seed này trên môi trường production.

## Hồ sơ chờ duyệt

Chạy `./scripts/seed-demo-services.ps1 -Pending` để thêm 4 hồ sơ, mỗi danh mục
một hồ sơ có tiền tố `[DEMO-PENDING-*]`. Mỗi hồ sơ có một PDF mẫu ghi rõ DEMO,
không phải tài liệu định danh thật. Không cấp quyền và không tạo public listing.
Sau lần seed đầu, mã hồ sơ là 24–27, trạng thái PENDING, reviewed_at NULL.
Staff có thể xem và thử quyết định ở `/staff/service-applications`.
Chạy lại không tạo trùng hoặc đặt lại trạng thái các hồ sơ đã được xử lý.
