# Chi tiết phòng cho thuê

Áp dụng cho `/properties/detail`, React/Vite và CSS thuần, theo MASTER.md.

## Thứ tự thông tin

- Tên nhà trọ, loại phòng đang xem và địa chỉ.
- Desktop: cột nội dung bên trái; bảng quyết định thuê sticky xuyên suốt bên phải gồm giá/tháng, tình trạng trống, diện tích, sức chứa, cọc, chi phí ban đầu và liên hệ. Nội dung này đứng trước cột chính trong DOM để đọc bằng công nghệ hỗ trợ.
- Bảng phí điện/nước/Internet/cọc/dịch vụ/gửi xe ngay sau phần đầu; mỗi khoản giữ nguyên đơn vị và ghi chú từ dữ liệu.
- Tiện nghi dùng icon theo khóa dữ liệu; mô tả, quy định và vị trí theo sau. Trạng thái chưa có đánh giá là một dòng thay vì biểu đồ toàn 0. Bảng phí có nền nhấn và số liệu 16–18px.
- Phòng hiện tại được ghi riêng trong một hàng; các loại phòng khác có thẻ riêng không lặp thẻ đang xem. Nhà trọ tương tự ở cuối.

## Hành vi và dữ liệu

- Ảnh phòng và ảnh tổng thể nhà trọ tách riêng, mở đúng bộ ảnh trong lightbox hiện có; giữ chuyển ảnh, Escape và trả focus.
- Không có ảnh phòng thì dùng ảnh nhà trọ với nhãn đúng nguồn. Không có cả hai thì hiển thị trạng thái chưa cập nhật.
- Khoảng cách mẫu nằm trong mục thu gọn và ghi rõ chỉ là minh họa.
- Không tự tạo số liên hệ, đánh giá, phí hoặc thành công đặt lịch. Nút liên hệ mở luồng trao đổi hiện có.
- Nhúng Google Maps theo địa chỉ công khai, kèm link ngoài và ghi chú xác nhận vị trí; không tự suy khoảng cách. Bản đồ phụ thuộc dịch vụ/mạng bên ngoài. API chưa có tên người đại diện hay thời gian phản hồi, nên chỉ dùng tên nhà trọ và ngày duyệt hồ sơ.
- Footer được thu gọn khoảng cách chỉ trên route chi tiết; giữ nội dung và liên kết.
- Giữ deep link `#room-type-details`, `#host-contact` và liên kết chọn loại phòng.
- Class `rtd-*` được scope trong `.prototype-detail` để tránh style của các trang cũ.

## Kiểm tra 03/11/2026

- 12 unit test liên quan detail/accommodations đã qua; Vite build thành công (cảnh báo bundle lớn có sẵn).
- Kiểm tra trực tiếp dữ liệu local, lightbox phòng, chuyển ảnh, Escape và liên kết tới bảng phí.
- Các chiều rộng 375/768/1024/1440 không tràn ngang; kiểm tra reflow tương đương 200% tại 720×500. Chưa kiểm tra zoom 200% thật trong trình duyệt.
- Không ghi nhận console error trong tab kiểm tra.
- Đã kiểm tra sticky khi cuộn đến tiện nghi (top 100px), ẩn biểu đồ đánh giá rỗng, chuyển loại phòng và Back, mở/đóng ảnh. Bản đồ tải DOM Google Maps; ảnh nền bản đồ chưa được xác nhận bằng screenshot trong trình duyệt kiểm tra.
- Script `check-detail-prototype.cjs` đã cập nhật theo bố cục mới và kiểm tra cú pháp; chưa chạy toàn bộ script tự động.
