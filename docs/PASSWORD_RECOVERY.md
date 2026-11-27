# Quên và đổi mật khẩu — 2026-11-27

Web `/login` mở hộp thoại ba bước: email/SĐT → OTP → mật khẩu mới.
`/profile?tab=security` hỗ trợ mật khẩu hiện tại hoặc xác minh OTP của chính tài khoản.
OTP email dùng `RegistrationOtpSender`/`JavaMailSender` và cấu hình mail đăng ký hiện có;
OTP SMS dùng `PhoneOtpProvider` eSMS/Twilio hiện có. Không cần khóa mới, không gửi qua Zalo trong luồng này.
SĐT khôi phục phải có `phoneVerifiedAt`, hoặc là định danh gốc của tài khoản đăng ký bằng SĐT
(email nội bộ đúng số dạng `@hlrcs.user`). Điều này hỗ trợ tài khoản đăng ký bằng OTP Zalo cũ
chưa có mốc `phoneVerifiedAt`, không mở khôi phục qua SĐT chưa xác minh gắn thêm vào tài khoản email.
Đăng ký SĐT mới ghi mốc xác minh sau khi tiêu thụ proof OTP; email nội bộ không nhận email.
Tài khoản Google có thể đặt mật khẩu bằng OTP; liên kết Google và quyền tài khoản được giữ nguyên.

## API

Các response dùng envelope `ApiResponse`: `{success,message,data}`.

| POST | Body | `data` khi thành công |
| --- | --- | --- |
| `/api/auth/password-reset/send-otp` | `{identifier}` | `{resendAt,expiresAt,channel,message}` |
| `/api/auth/password-reset/verify-otp` | `{identifier,code}` | `{verificationToken,expiresAt}` |
| `/api/auth/password-reset/confirm` | `{identifier,verificationToken,newPassword}` | `null` |

Ba endpoint `/api/auth/profile/password-reset/...` có cùng hợp đồng, yêu cầu JWT và
chỉ chấp nhận thông tin liên hệ của tài khoản lấy từ principal. Public endpoint không yêu cầu JWT.
`identifier` là email hoặc số Việt Nam đầu 03/05/07/08/09; dạng `+84`, dấu cách và dấu phân cách được chuẩn hóa.
Các mốc thời gian là ISO-8601 UTC. `channel` là `EMAIL` hoặc `SMS`.
Send trả cùng envelope thành công cho tài khoản không tồn tại, không hoạt động hoặc SĐT không đủ điều kiện;
không gửi mã trong các trường hợp đó. Lỗi kênh gửi được trả đúng 429/502/503, không tự retry gửi tin.
Đây không phải cam kết nhà mạng/hộp thư đã giao tin tới thiết bị.

- `400`: dữ liệu/OTP/phiên xác minh không hợp lệ, quá hạn, đã dùng hoặc khác tài khoản.
- `401`: thiếu/hết hiệu lực JWT ở endpoint hồ sơ.
- `429`: chưa đủ 60 giây hoặc quá 10 lượt gửi cho một định danh trong 24 giờ.
- OTP có 6 số, hết hạn sau 5 phút; tối đa 5 lần sai được ghi nhận trong database.
- Proof sau khi xác minh có hiệu lực 10 phút, dùng một lần. Gửi lại vô hiệu proof trước đó.
- Password tối thiểu 6 ký tự, tối đa 72 byte UTF-8 theo BCrypt, không được trùng password hiện tại.
- Reset và `PUT /api/auth/change-password` tăng `User.sessionVersion`, kết thúc các JWT cũ.
  Frontend xóa phiên cục bộ ngay sau thành công và đưa người dùng về đăng nhập.

## Lưu trữ và đồng thời

`PasswordResetChallenge` → `password_reset_challenges`, khóa SHA-256 của định danh có prefix mục đích.
Không dùng lại proof đăng ký hoặc proof đổi SĐT. Chỉ lưu BCrypt hash của mã/proof,
reference của provider khi cần xác minh bên ngoài, snapshot `userId`/`sessionVersion`,
thời hạn, số lần sai/gửi và cửa sổ 24 giờ. Không trả hash/reference/userId qua API.
Khóa pessimistic tài khoản trước challenge; unique key và `@Version` bảo vệ lần tạo đầu.
Đổi password, vô hiệu proof và tăng phiên nằm trong cùng transaction. Sai OTP commit bộ đếm;
lỗi gửi tin rollback challenge, không tiêu thụ proof cũ khi gửi lại chưa thành công.
Cleanup theo giờ xóa challenge hết hạn hơn một ngày, giữ được cửa sổ giới hạn gửi.

JPA `ddl-auto=update` hiện tại tạo bảng mới. Triển khai dùng migration/validate cần tạo bảng
tương ứng với entity trước khi bật API. Không sửa schema SQL tham chiếu cũ thay cho migration triển khai.

## Bằng chứng kiểm thử

`PasswordRecoveryTests`: MockMvc + H2, `JavaMailSender` giả lập và eSMS adapter thật
gọi HTTP server loopback; không dùng số điện thoại, SMTP hay khóa dịch vụ thật.
Bao gồm replay, hết hạn, 5 lần sai, cooldown, daily limit, inactive/unknown/unverified contact,
phân quyền hồ sơ, lỗi nhà cung cấp, concurrent confirmation và vô hiệu JWT/mật khẩu cũ.
Test provider và Google login cũ được chạy cùng để kiểm tra hồi quy.
Browser tests dùng API giả lập để kiểm tra tương tác web; không chứng minh giao SMS/email thật.
