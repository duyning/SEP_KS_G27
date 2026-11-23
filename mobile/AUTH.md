# Đăng nhập và đăng ký trên mobile

Hai màn hình dùng Expo Router và gọi API Spring Boot hiện có. Không thay đổi website hoặc backend.

## Chạy trên điện thoại

1. Sao chép `.env.example` thành `.env.local` nếu chưa có.
2. Điền `EXPO_PUBLIC_API_URL=http://<IP-Wi-Fi-máy-tính>:8081`. Điện thoại không dùng `localhost` để truy cập máy tính.
3. Chạy backend, kết nối điện thoại và máy tính cùng mạng, cho phép truy cập cổng backend qua firewall khi cần.
4. Chạy `npx expo start --port 8082` và mở app bằng Expo Go. Giữ Metro chạy để nhận Fast Refresh khi lưu code. Thay đổi biến môi trường cần khởi động lại Metro.

Login dùng email và mật khẩu. Register gồm họ tên, email, số điện thoại tùy chọn, mật khẩu và xác nhận mật khẩu. Mật khẩu tối thiểu 6 ký tự theo API hiện tại. Tài khoản đăng ký luôn gửi vai trò USER.

Ứng dụng dùng `/api/auth/login`, `/google`, `/register`, `/me`, `/logout`. Chỉ chuyển vào app sau khi API xác nhận thành công. Token được lưu bằng Expo SecureStore trên iOS/Android; bản web preview chỉ giữ token trong bộ nhớ. Không lưu mật khẩu. Đã thêm Google OAuth: xem [GOOGLE_AUTH.md](GOOGLE_AUTH.md). Expo Go chỉ hỗ trợ kiểm thử email/mật khẩu; Google native cần development build cùng OAuth Client ID iOS hoặc cấu hình Android package/SHA-1 thực. Bản web dùng Google Identity Services. Khôi phục mật khẩu chưa được triển khai.

## Kiểm tra

```sh
npm run typecheck
npm run lint
npm run test:auth
npx expo export --platform all --max-workers 2
```

Kiểm thử trình duyệt sử dụng API được chặn trong test, không tạo tài khoản thật. Cần kiểm tra thêm bàn phím, autofill và safe area trên điện thoại thật, cùng việc đăng nhập vào backend thực tế của môi trường triển khai.

