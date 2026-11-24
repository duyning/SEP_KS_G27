# Hồ sơ cá nhân mobile

## Màn hình và điều hướng

- `/account`: Profile Overview / Guest Profile, mở từ avatar tài khoản trên Home. Đây là Stack screen nên có Back theo history thực tế; không thêm tab hoặc thay đổi Trang chủ/Tìm phòng.
- `/account/edit`: chỉnh sửa tên, điện thoại, trường học/nơi làm việc, khu vực ưu tiên và avatar. Email chỉ đọc, không đưa email/role vào request cập nhật.
- `/account/security`: đổi mật khẩu hiện tại/mật khẩu mới, xác nhận chỉ dùng trên client.

Profile có avatar thật hoặc chữ cái tên/icon khi thiếu/lỗi ảnh; map role thực `USER`, `ROOM_HOST`, `STAFF`, `ADMIN`. Phiên bản lấy từ `Constants.expoConfig.version`. Không có badge xác minh, số lượng giả hoặc thông tin user hardcode.

## API và auth

Dùng API hiện có: `GET /api/auth/me`, `PUT /api/auth/profile`, `PUT /api/auth/change-password`, `POST /api/auth/logout`. Không sửa backend/MySQL.

AuthApi whitelist trường đúng DTO; AuthSession mở rộng bằng thao tác cập nhật profile/password nhưng giữ cơ chế JWT, SecureStore, hàng đợi lưu trữ và chống submit trùng. Cập nhật profile chỉ chấp nhận userId đang đăng nhập, đồng bộ auth context ngay, bỏ kết quả lỗi thời sau unmount. HTTP 401 của thao tác được xác thực xóa token và thông tin user. Không lưu mật khẩu hoặc tạo refresh-token flow mới.

Backend yêu cầu mật khẩu cũ, mật khẩu mới tối thiểu 6 ký tự và khác mật khẩu cũ; đổi thành công không bắt buộc logout/đổi JWT nên app giữ phiên hiện tại. Google-only accounts vẫn phải có mật khẩu hiện tại để dùng API này; không giả lập chức năng đặt/reset mật khẩu Google.

## Avatar và form

Expo ImagePicker SDK 58 tương thích Expo Go; chỉ mở thư viện khi người dùng nhấn Đổi ảnh đại diện. Không truy cập camera/microphone; config plugin tắt hai quyền không cần này. Chọn ảnh, crop/preview và gửi data URI JPG/PNG/WebP khi Lưu; kiểm tra giới hạn 2,5 MB theo byte base64 thực. Không gửi lại URL avatar Google hiện tại nếu avatar không đổi, vì backend chỉ nhận data URI khi cập nhật ảnh. Cho phép xóa avatar bằng chuỗi rỗng, đúng contract backend.

Backend hiện bỏ qua phoneNumber rỗng, không xóa số đã lưu. Form báo rõ thay vì báo lưu thành công cho thao tác xóa số không được hỗ trợ. Các field khác có thể xóa đúng DTO; validation hiển thị inline tiếng Việt.

Form giữ dữ liệu khi bàn phím đóng. Dùng KeyboardAvoidingView, ScrollView, footer trong flow và SafeAreaView một lần. Không đặt tab bar trên form. Nút lưu disabled khi không dirty/busy; duplicate request có lock. `usePreventRemove` của Expo Router hiện tại xác nhận hủy/bỏ thay đổi, chặn Back trong lúc đang lưu.

## Logout và dữ liệu riêng tư

Dialog xác nhận có Hủy/Đăng xuất, không gọi API khi hủy. Dùng nguyên signOut hiện tại; chỉ điều hướng guest sau hoàn tất local cleanup. Nếu remote logout lỗi nhưng local cleanup đã xong, Profile chuyển sang guest và giữ thông báo lỗi thật. Nếu token storage không xóa được, không báo thành công. Private profile form được unmount khi user thay đổi/biến mất; overview không hiện tên/email cũ sau logout.

## Phạm vi chức năng

Mobile hiện có route /favorites, mở từ Phòng đã lưu cho USER/ROOM_HOST (xem FAVORITES.md). Chưa có route lịch hẹn, inbox thông báo hay dashboard chủ trọ để liên kết. Vì vậy không tạo quick-action/menu giả, không chuyển sang các trang web và không dựng bản sao dashboard. Profile phục vụ các thao tác tài khoản chung cho bốn role, không thay quyền. Không có màn hình Settings trống, avatar upload giả, hotline tự đặt, OTP, xác minh danh tính, thanh toán, 2FA hay xóa tài khoản.

## Components và motion

Tái sử dụng AuthInput, PasswordInput, PrimaryButton, InlineError, AnimatedPressable, auth colors và token hiện có. Thêm ProfilePage/Header, UserAvatar, grouped MenuRow, ConfirmDialog, Skeleton và PrivateProfileGate. Overview fade/translate 220ms theo nhóm, press scale 0.98 và haptic hiện có; Reduce Motion qua Reanimated/System và animation modal tương ứng. Không animation từng hàng hoặc lặp vô hạn. Skill directories được kiểm tra; không có animate-ui/expo-animation để áp dụng. Không sử dụng asset trả phí hoặc source bên ngoài.

## Files trong thay đổi này

- `src/app/(main)/account.tsx`
- `src/app/account/edit.tsx`
- `src/app/account/security.tsx`
- `src/components/profile/profile-ui.tsx`
- `src/components/profile/private-profile-gate.tsx`
- `src/components/home/home-header.tsx` (avatar mở Profile thay Alert cũ)
- `src/services/auth.ts`
- `src/context/auth-context.tsx`
- `package.json`, `package-lock.json`, `app.json` (ImagePicker/quyền)
- `tests/auth.test.ts`
- `scripts/check-profile.cjs`
- `scripts/check-profile-backend.cjs`

## Kết quả kiểm tra

- Typecheck và lint đã chạy.
- 40 test: 29 auth/profile, 4 Google config/guard và 7 accommodation API đều đạt.
- Edge headless với API fixture: guest → login → Home → Profile; edit; hủy và bỏ thay đổi; lưu đồng bộ; password success và xóa field mật khẩu; hủy logout và logout thật trong fixture; Back; không tràn ngang ở 320/360/390/430px. Screenshot đã xem trong `.expo/profile-review` (ignored). Fixture chỉ nằm trong script, không dùng ở runtime app.
- Backend thật: auth service mobile đọc profile, PUT lại đúng dữ liệu đang có, xác nhận email/userId giữ nguyên, API từ chối mật khẩu hiện tại sai và logout thành công. Không thay mật khẩu hoặc avatar tài khoản thật. Script chỉ xuất kết quả, không xuất JWT/mật khẩu.
- Chưa kiểm thử chọn/crop ảnh trên thiết bị, upload avatar thật, đổi mật khẩu thật, iPhone/Android keyboard, font scaling, Dynamic Island/Home Indicator và Android gesture/3-button navigation. Đó không phải các kiểm tra được mô phỏng bằng viewport browser.

## Chạy

Trong `mobile`:

```powershell
npm run typecheck
npm run lint
npm run test:auth
npm run test:google
npm run test:listings
npx expo start --clear --port 8082
```

Backend dùng 8081 theo `.env.local`; mở tab Cá nhân để vào Profile. Guest route `/account` hiển thị lời mời đăng nhập, không giả user.

Browser fixture helper: chạy Expo web trên 8092, cấu hình `PLAYWRIGHT_MODULE` đến Playwright cài sẵn rồi `node scripts/check-profile.cjs`. Real backend smoke helper: đặt `HLRCS_TEST_EMAIL`, `HLRCS_TEST_PASSWORD`, tùy chọn `HLRCS_TEST_API_URL`, chạy `node scripts/check-profile-backend.cjs`. Không lưu credentials trong script.


