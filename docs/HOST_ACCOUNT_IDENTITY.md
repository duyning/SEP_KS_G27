# Đơn xin cấp quyền Chủ trọ — ảnh định danh

Web `/become-host` hiện dùng [luồng gộp chủ trọ và nhà trọ](HOST_ONBOARDING.md).
Các API đơn riêng bên dưới được giữ cho hồ sơ lịch sử và client tương thích.

## Dữ liệu và API

- `POST /api/host-applications`: `agreementAccepted=true`, `identityImage` (mặt trước), `identityBackImage` (mặt sau)
  (data URL JPG/PNG tối đa 5 MB) và `introduction` tùy chọn, tối đa 1000 ký tự.
  Giữ `version` khi gửi bổ sung. Đơn mới không cần applicantCapacity,
  rentalExperience, targetCommune, expectedScale. Các trường lịch sử được giữ
  trong database; giao diện không còn hiển thị các trường kế hoạch, tư cách cho thuê hoặc mã hồ sơ, kể cả hồ sơ cũ. Resubmit không xóa dữ liệu lịch sử.
- Cả hai mặt bắt buộc khi gửi mới hoặc bổ sung; có thể giữ ảnh đã gửi hoặc thay từng mặt.
  Giao diện có hai ô, mỗi ô một ảnh, tối đa hai ảnh. Nút gửi chỉ mở khi đủ thông tin,
  có cả hai mặt hợp lệ và đã tích xác nhận. Hồ sơ lịch sử một mặt vẫn đọc được.
  Ảnh và đơn lưu trong cùng transaction. Không có upload rời hoặc file mồ côi.
- Bảng riêng `host_application_identity`, khóa theo application_id, giữ nội dung
  LONGBLOB. Ảnh không nằm trong DTO danh sách/chi tiết, không có URL công khai.
  DTO chỉ thêm hasIdentityImage, hasIdentityBackImage và userPhoneVerified từ backend.
- `GET /api/host-applications/{id}/identity-image?side=front|back` (mặc định front): xác thực mỗi request; chỉ chủ
  hồ sơ đang hoạt động hoặc STAFF/ADMIN đang hoạt động được đọc. Vai trò STAFF
  dùng cùng phạm vi xét duyệt chung hiện có; không cần assignment mới.
  Response no-store, nosniff. Client dùng Bearer + blob URL tạm, thu hồi khi unmount.
- Kiểm tra backend: base64, giới hạn byte, định dạng ImageIO thực (không tin
  MIME khai báo), giải mã được JPG/PNG, tối đa 20 megapixel. Không nhận PDF/SVG.
- Bổ sung yêu cầu `identityImage` qua luồng NEEDS_CHANGES hiện có. Hồ sơ cũ chưa
  có ảnh vẫn đọc được, không tự đổi trạng thái. Luồng phê duyệt/confirmation giữ nguyên.

## Giao diện

Cập nhật 2026-11-14: bước **Hồ sơ xác minh** khi đăng ký nhà trọ tự dùng CCCD
từ đơn chủ trọ **APPROVED** của tài khoản đăng nhập. Endpoint eligibility chỉ
trả `identityApplicationId` khi có ảnh; UI hiển thị nguồn, xem qua endpoint ảnh
có xác thực và cho thay tệp. Khi không gửi tệp `idCard`, backend tự tra đơn của
chính chủ trọ, không nhận ID hồ sơ nguồn từ client. Nội dung ảnh được sao chép
thành `PropertyDocument` loại `ID_CARD`, trạng thái PENDING, cùng transaction
với hồ sơ nhà trọ. Staff xem bản sao riêng tư qua luồng giấy tờ hiện có; thay ảnh
ở đơn tài khoản không làm đổi giấy tờ của hồ sơ nhà trọ đã gửi. Tệp mới tải lên
được ưu tiên. Hồ sơ cũ chưa có ảnh được duyệt vẫn cần tải CCCD thủ công. Ảnh và
dấu chọn dùng lại không được lưu vào bản nháp trình duyệt; reload lấy lại quyền
và thông tin nguồn từ backend.

Thông tin từ tài khoản, badge điện thoại dựa trên phoneVerifiedAt (không dựa vào
OTP preview). Không thêm điều kiện bắt buộc xác minh OTP để nộp đơn; điều kiện cũ
có họ tên/số điện thoại hợp lệ giữ nguyên. Liên kết đến sửa số điện thoại trong
hồ sơ; bản nháp form/ảnh giữ trong bộ nhớ trang theo user, không lưu localStorage,
sessionStorage hoặc browser history. Reload/đóng tab sẽ mất bản nháp.

Giao diện bỏ bộ đếm bước, “Lưu ý tiếp theo”, thông báo sau phê duyệt,
đoạn giải thích quyền xem ảnh và ghi chú cuối form theo yêu cầu.
Quyền truy cập ảnh riêng tư vẫn được kiểm tra ở backend.

Khi dùng lại CCCD cho hồ sơ nhà trọ, cả hai mặt được sao chép nếu có.
Mặt sau dùng loại tài liệu `ID_CARD_BACK`. Nếu thay bằng tệp CCCD thủ công,
mặt sau cũ không được giữ kèm tệp mới.

Development: `/become-host?formPreview=1` có nút tạo ảnh mẫu và banner rõ ràng,
không gọi POST tạo đơn. Luồng thật không có ảnh mẫu hay thông báo preview.
Chỉ dùng ảnh mẫu sinh bằng canvas/ImageIO khi QA.

## Triển khai

Restart backend để cập nhật schema. Hibernate tạo bảng ảnh; ApplicationRunner
`HostApplicationSchema` chỉ nới NULL hai cột lịch sử trên MySQL nếu còn NOT NULL,
không sửa nội dung lịch sử. Môi trường migration thủ công dùng
`sql/host-application-identity.sql` một lần, không chạy lặp trên schema đã nâng cấp.
Với bảng đã tồn tại, dùng `sql/host-identity-back.sql` để thêm hai cột mặt sau
nếu môi trường không dùng Hibernate cập nhật schema tự động.

Ảnh/đơn thật và camera điện thoại thật không được dùng trong kiểm thử tự động.
