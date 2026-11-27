# Xác minh số điện thoại cho tài khoản Google

## Đăng ký tài khoản qua eSMS (2026-11-27)

Đăng ký SĐT đã chuyển từ Zalo sang cùng `PhoneOtpProvider` với hồ sơ và quên mật khẩu;
provider mặc định là eSMS, dùng nguyên khóa/Brandname/mẫu bên dưới. Không gọi API Zalo
hoặc đọc các biến `REGISTRATION_ZALO_*` trong ứng dụng nữa. Đăng ký email vẫn gửi SMTP.
API `/api/auth/register/otp/send`, `/otp/verify` và `/api/auth/register` giữ hợp đồng cũ.
Số `0...` và `+84...` dùng cùng challenge; eSMS nhận số local đã chuẩn hóa.

OTP 5 phút, tối đa 5 lần sai, gửi lại sau 60 giây; proof 10 phút dùng một lần,
chỉ tạo tài khoản `USER` và lưu mốc xác minh SĐT. Không gửi lại tự động nếu lỗi/timeout.
Lỗi provider rollback challenge để không mất mã/proof trước khi gửi lại thành công.
`registration_otps.secret_hash` chứa BCrypt; `provider_reference` mới lưu mã tham chiếu,
không trả ra client. Migration thủ công: `sql/migrations/20261127_registration_sms_provider.sql`;
development `ddl-auto=update` tự bổ sung cột. Giới hạn 10 lượt/24 giờ của xác minh hồ sơ
không áp dụng tự động cho đăng ký; đăng ký giữ giới hạn gửi lại 60 giây hiện có.

`RegistrationSmsTests` chạy eSMS adapter thật với HTTP server loopback, SMTP giả lập:
tạo tài khoản, phân quyền, OTP sai/hết hạn, gửi lại, proof dùng một lần và rollback lỗi.
Không gửi SMS thật hoặc sử dụng khóa dịch vụ thật trong kiểm thử.

Cập nhật 2026-11-14: `/become-host` có **một popup duy nhất** để nhập số điện
thoại, gửi SMS và nhập OTP. Không điều hướng sang profile, không mở thêm dialog
ở bước OTP. Sau khi mã đúng, `POST /api/auth/profile/phone/confirm` lưu riêng số
điện thoại và mốc xác minh của tài khoản đăng nhập, tiêu thụ bằng chứng OTP;
không sửa các trường hồ sơ khác. Form chủ trọ cập nhật badge và giữ bản nháp.
Hỗ trợ tài khoản Google lẫn tài khoản thường, cả số đang có nhưng chưa xác minh.
Giới hạn gửi lại/thời gian/mã sai và kiểm tra trùng số giữ nguyên. Bản xem trước
đơn chủ trọ không gửi SMS hoặc lưu số thật. Quy tắc bắt OTP khi đổi số tài khoản
Google qua PUT profile giữ nguyên; không thêm điều kiện xét duyệt chủ trọ mới.

Web `/profile` và app `/account/edit` dùng cùng backend, áp dụng cho tài khoản
có authProvider GOOGLE hoặc googleSubject. Số điện thoại mới chưa được lưu khi
gửi OTP; chỉ sau khi kiểm tra OTP thành công, giao diện mới gửi PUT profile.
Backend vẫn chặn PUT trực tiếp nếu chưa có bằng chứng xác minh cho đúng tài khoản
và đúng số điện thoại. Đổi từ 0 sang +84 của cùng một số không cần xác minh lại.
Không đổi số điện thoại thì không gửi SMS. Tài khoản Google được sửa thông tin
khác khi số điện thoại còn trống.

## Cấu hình đang dùng: eSMS

### Trạng thái gửi SMS local

Local đã bật lại `app.phone-otp.provider=esms` trong `config/sms-local.properties`
và `VITE_PHONE_OTP_PREVIEW=false` trong `frontend/.env.local`.
Restart backend web/app và Vite để cấu hình mới có hiệu lực; khi dùng luồng thật,
bỏ query `otpPreview=1` khỏi URL.

Để tạm ngừng gửi khi sửa UI: đặt provider local thành `disabled` và
`VITE_PHONE_OTP_PREVIEW=true`, rồi restart backend/Vite. Khóa được giữ nguyên.
Web development vẫn hỗ trợ `/profile?otpPreview=1` để xem riêng giao diện modal;
bản xem trước không gửi SMS, không xác minh và không lưu hồ sơ.
Query preview chỉ hoạt động trên Vite development, không bật trong production build.

Mặc định provider là `esms`. Máy phát triển đã có khóa và Brandname trong
`config/sms-local.properties` (được Git bỏ qua). Web API 8080 và app API 8081
cùng đọc file này. Restart cả hai backend sau khi cập nhật cấu hình.

Khi triển khai sang máy khác, đặt biến môi trường backend:

```text
PHONE_OTP_PROVIDER=esms
ESMS_API_KEY=...
ESMS_SECRET_KEY=...
ESMS_BRANDNAME=Baotrixemay
ESMS_OTP_TEMPLATE=Ma xac nhan cua ban la {code}
```

Brandname hiện tại là tên thử nghiệm của eSMS, không phải tên HL_RCS. Mẫu
`Ma xac nhan cua ban la {P}` đã được tài khoản đăng ký trên các nhà mạng;
ứng dụng thay `{code}` bằng OTP 6 số. Để dùng tên HL_RCS hoặc nội dung khác,
cần đăng ký Brandname/mẫu phù hợp với eSMS trước.

Backend tạo OTP bằng SecureRandom và lưu bản băm BCrypt trong
`phone_verifications.otp_hash`, không lưu mã rõ. API eSMS được gọi bằng HTTPS
POST JSON với SmsType=2, Sandbox=0 và RequestId riêng. Chỉ khi eSMS trả CodeResult=100
và SMSID hợp lệ mới tạo challenge. Đây là xác nhận tiếp nhận của eSMS, chưa phải
xác nhận tin đã tới điện thoại. Khi nhập mã, backend kiểm tra bản băm cùng giới hạn
thời gian/lần thử; không gọi Twilio. Đổi provider từ Twilio cần yêu cầu OTP mới.
Gửi lại tạo mã mới và vô hiệu mã cũ sau khi nhà cung cấp chấp nhận yêu cầu.

Đã kiểm tra API eSMS ở Sandbox=1 thành công, không gửi SMS/không trừ tiền.
Chưa kiểm tra SMS đến thiết bị thật vì chưa có số nhận kiểm thử do chủ tài khoản chỉ định.
Không tự động retry khi timeout để tránh gửi nhiều tin; người dùng có thể yêu cầu lại.

Schema mới: dùng `sql/phone-verification.sql`. Nếu đã có bảng từ phiên bản Twilio,
chỉ áp dụng `sql/phone-verification-esms.sql` một lần, hoặc để Hibernate update
trong môi trường development. Không chạy cả hai migration trên cùng schema mới.

Kiểm thử thực tế: restart backend → đăng nhập Google → Thông tin tài khoản →
Sửa → thêm/đổi số điện thoại → Lưu → nhận SMS từ Baotrixemay → nhập OTP → Xác nhận
và lưu. Nhập sai không lưu số mới; gửi lại sau 60 giây, tối đa 10 lần/24 giờ.

Tham khảo [SMS OTP eSMS](https://developers.esms.vn/esms-api/ham-gui-tin/tin-nhan-sms-otp-cskh)
và [mẫu tin đã đăng ký](https://developers.esms.vn/esms-api/ham-truy-xuat-va-dang-ky/ham-lay-danh-sach-template-tin-cham-soc-khach-hang).

## Tùy chọn chuyển lại Twilio Verify

Đặt `PHONE_OTP_PROVIDER=twilio` và bỏ cấu hình provider cố định trong file local
nếu có. Các bước sau chỉ dành cho tùy chọn Twilio.

1. Tạo tài khoản Twilio và một Verify Service; chọn độ dài mã **6 chữ số**.
2. Trong Verify Geo Permissions, cho phép gửi SMS đến Việt Nam. Kiểm tra khả năng
   gửi đến mạng/số thử nghiệm trong tài khoản của bạn. Trial có giới hạn người nhận.
3. Đặt các biến môi trường **ở backend**, trong Run/Debug Configuration →
   Environment variables của IntelliJ (hoặc môi trường chạy backend):

   ```text
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_VERIFY_SERVICE_SID=VA...
   ```

   Web API 8080 và mobile API 8081 cần cùng cấu hình Verify Service.
   Không đặt các khóa này trong frontend/mobile hoặc commit vào Git.
4. Restart backend. Trong development hiện tại Hibernate `ddl-auto=update` tạo
   bảng `phone_verifications` và cột `users.phone_verified_at`. Môi trường quản lý
   schema bằng migration cần triển khai SQL trong `sql/phone-verification.sql` trước.
5. Đăng nhập Google → Thông tin tài khoản → Sửa → nhập số Việt Nam → Lưu.
   Gửi SMS thành công mới mở ô OTP. Nhập đúng mã → Xác nhận OTP và lưu → tải lại
   trang để kiểm tra số đã lưu. Thử Hủy, mã sai, hết hạn và gửi lại.

Nếu thiếu cấu hình, API trả 503 và giao diện báo dịch vụ SMS chưa cấu hình;
không mở hộp nhập mã, không giả lập SMS và không lưu số mới. Các kiểm thử dùng
provider giả lập riêng, không có mã OTP dùng chung hoặc chế độ bỏ qua trong ứng dụng.
Việc nhận SMS trên thiết bị thật chưa được kiểm chứng vì chưa có số nhận kiểm thử.

## Quy tắc và API

- `POST /api/auth/profile/phone/send-otp` body `{phoneNumber}`.
  Trả số đã chuẩn hóa, `expiresAt`, `resendAt`; không trả mã OTP hoặc provider SID.
- `POST /api/auth/profile/phone/verify-otp` body `{phoneNumber,code}`.
  Chỉ trả verified=true sau khi backend kiểm tra đúng bản băm eSMS hoặc Twilio xác nhận approved.
- `PUT /api/auth/profile` vẫn là API lưu hồ sơ; bằng chứng đã xác minh chỉ dùng
  một lần cho đúng số và tài khoản. Cập nhật hồ sơ thất bại sẽ rollback việc tiêu thụ
  bằng chứng, cho phép thử lưu lại trong thời hạn.
- OTP có hiệu lực cục bộ tối đa 5 phút; sau khi đúng, có 5 phút để lưu hồ sơ.
  Gửi lại tối thiểu 60 giây, tối đa 10 lần trong 24 giờ/tài khoản; nhập sai tối đa
  5 lần cho cùng provider SID. Twilio có thể gửi lại cùng mã trong thời hạn;
  vì vậy gửi lại không reset số lần nhập sai nếu provider SID vẫn giữ nguyên.
- Trạng thái và giới hạn lưu trong MySQL nên web/app dùng chung, không reset khi
  restart API. Khóa theo user serializes gửi/kiểm tra/lưu; client không chọn userId.
- Với Twilio, nhà cung cấp tạo mã. Với eSMS, backend tạo mã và chỉ lưu bản băm; ứng dụng không ghi log OTP,
  không trả lỗi thô hoặc credentials của nhà cung cấp ra client.
- Cấu hình giới hạn gửi tại nhà cung cấp khi triển khai để kiểm soát lưu lượng
  tổng thể từ nhiều tài khoản (Twilio có Verify Fraud Guard/Geo Permissions).

Tài liệu chính thức:
[Start Verification](https://www.twilio.com/docs/verify/api/verification),
[Verification Check](https://www.twilio.com/docs/verify/api/verification-check).
