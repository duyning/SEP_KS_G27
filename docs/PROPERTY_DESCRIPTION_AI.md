# Gợi ý mô tả và loại hình nhà trọ khác

Form đăng ký chủ trọ/nhà trọ, đăng ký thêm nhà trọ và form chỉnh sửa cùng dùng
`PropertyTypeField` và `PropertyDescriptionAssist`. Chọn **Khác — tự nhập loại hình**
để nhập tên 2–100 ký tự. Giá trị thực được lưu trong `propertyType` hiện có,
không đổi schema hoặc ghi đè loại hình tùy chỉnh thành chữ “Khác”.

**Tạo mô tả bằng AI** gọi `POST /api/property-writing/description` trên backend.
Chỉ gửi tên/loại hình/khu vực/địa điểm lân cận, tiện ích, nội quy và mô tả đang viết;
không gửi trường liên hệ, ảnh hay giấy tờ. Gemini nhận chỉ dẫn không tự bịa giá,
diện tích, số phòng, khoảng cách, tiện ích hoặc trạng thái xác minh.

Gợi ý hiển thị riêng. Chủ trọ phải chọn **Dùng mô tả này** trước khi thay nội dung.
Nếu Gemini lỗi, hết quota, phản hồi không hợp lệ hoặc chưa có kết quả sau 5 giây,
trình duyệt tạo **Bản nháp từ thông tin đã nhập** dựa trên tên, loại hình, khu vực,
địa điểm lân cận, tiện ích và nội quy đã chọn. Bản nháp cũng dùng được khi mất kết nối.
Sửa dữ kiện trong lúc đang tạo gợi ý sẽ hủy kết quả cũ và giữ nội dung đang nhập.
Giới hạn một lượt tạo gợi ý mỗi 15 giây cho mỗi tài khoản trên một backend instance.

## Cấu hình

- `PROPERTY_DESCRIPTION_AI_KEY`: khóa Gemini giữ trên backend. Nếu chưa đặt,
  dùng cấu hình `community.ai.key` / `GEMINI_API_KEY` đang có trong dự án.
- `PROPERTY_DESCRIPTION_AI_MODEL`: model cho tạo mô tả; mặc định dùng
  `community.ai.model` hiện có. Model phải được cấp quyền cho khóa đang dùng.
- Khởi động lại backend sau khi đặt biến môi trường. Không đưa khóa vào frontend
  hoặc commit vào repository.

Cách dùng local với IntelliJ: mở `config/ai-local.properties`, thay toàn bộ giá trị
sau `property.description.ai.key=` bằng khóa Gemini của bạn, không thêm dấu nháy.
File này đã được import từ `application.properties`, và thư mục `config/` được Git
bỏ qua. Run configuration dùng working directory là `$PROJECT_DIR$`.
Sau khi lưu, Stop rồi Run lại backend và thử nút tạo mô tả trên web.
Nếu dùng biến môi trường, có thể giữ nguyên biểu thức mặc định trong file local.

Kiểm thử dùng dữ liệu mô phỏng và chưa xác nhận khả năng hoặc quota
của tài khoản Gemini thật.

API nhà cung cấp: https://ai.google.dev/api/generate-content

## Chẩn đoán lỗi

Backend ghi `Property description AI: configured=..., model=...` khi khởi động.
Khi lỗi, log chỉ ghi model, HTTP status hoặc nhóm lỗi; không ghi khóa, prompt
hay nội dung phản hồi. Backend phân biệt lỗi quota/giới hạn (429), quyền truy cập (403),
model không khả dụng (404), timeout, gián đoạn nhà cung cấp và phản hồi chưa hoàn chỉnh.
Với lỗi 500, 502, 503 hoặc 504, backend chờ khoảng một giây rồi thử lại một lần
trong thời hạn 30 giây của lượt tạo gợi ý.
Không tự động thay model hoặc thay khóa khi nhà cung cấp báo lỗi.

Kiểm thử thật có chủ đích (một lượt tạo gợi ý bằng dữ liệu giả, cần khóa local):
`mvnw.cmd -Dtest=PropertyDescriptionLiveTests -Dhlrcs.ai.live-test=true test`.
Test này bị bỏ qua mặc định, dùng H2 và không gửi dữ liệu nhà trọ thật.
