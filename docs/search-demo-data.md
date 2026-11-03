# Dữ liệu demo trang tìm kiếm

Chạy tại thư mục project bằng PowerShell:

```powershell
./scripts/seed-search-demo.ps1
```

Script dùng MySQL local `127.0.0.1:3306/hlrcs`, đọc mật khẩu từ cấu hình backend và dùng hai tài khoản demo có sẵn `host@hlrcs.com`, `staff@hlrcs.com`.

- 8 nhà trọ giả lập, 16 loại phòng, 48 phòng và 64 ảnh JPEG lưu trong database.
- 6 nhà trọ đã duyệt và đang hoạt động: 12 loại phòng công khai, 2 trang tại `/search` (6 kết quả/trang).
- 1 nhà trọ chờ duyệt và 1 nhà trọ đã ẩn để kiểm tra không xuất hiện công khai.
- Khu vực: Tân Xã, Thạch Hòa, Bình Yên và Khu Công nghệ cao; giá từ 1,2 đến 4,2 triệu đồng/tháng; có phòng trống và hết phòng.
- Ảnh nội thất từ Unsplash chỉ là minh họa, không phải ảnh nhà trọ thực tế. Tên và mô tả đều đánh dấu DEMO.

Có thể chạy lại mà không tạo trùng. Không sửa tài khoản, dữ liệu nhà trọ có sẵn hoặc bộ ảnh đã có. File ảnh tải về được lưu ở `.local/demo-room-photos`; giao diện dùng ảnh qua API local từ database.

Đã kiểm tra API sau seed: tổng công khai 12; trang 1 và 2 mỗi trang 6; khu vực lần lượt 4/4/2/2 kết quả; ảnh trả HTTP 200 `image/jpeg`; chi tiết có 4 ảnh.
