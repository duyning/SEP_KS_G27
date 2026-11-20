# Profile trong Bottom Tabs

> Cập nhật chủ trọ: chế độ quản lý có năm tab Nhà trọ · Loại & giá · Phòng · Yêu cầu · Cá nhân; guest/tenant giữ ba tab dưới đây. Xem [MY-PROPERTIES.md](MY-PROPERTIES.md) cho cấu trúc hiện hành và chuyển chế độ tìm phòng.

Cấu trúc: Root Stack → (main) tabs: home / explore / account. Profile Overview được chuyển từ src/app/account.tsx sang src/app/(main)/account.tsx; URL /account giữ nguyên, không tạo bản sao hoặc redirect route.

Root Stack vẫn chứa /account/edit, /account/security, /favorites và Room Detail. Các trang con giữ Back và ẩn thanh tab; Back trả về tab Cá nhân. Chưa có route lịch hẹn/settings/dashboard hoạt động nên không thêm menu giả.

Native: giữ NativeTabs và giao diện hệ điều hành hiện tại, thêm trigger account với Feather user; icon selected teal, inactive #84928D. Layout/indicator/animation chuyển tab do navigator điều khiển. Không tạo active state thủ công. iOS tự phân bố chiều rộng ba tab; hình dáng capsule do hệ điều hành quản lý.
Web: mở rộng headless tabs thành ba mục icon/label trong capsule sáng, rộng tối đa 360 và co theo màn hình, target tối thiểu 44. Loại bỏ link tài liệu/dev brand khỏi menu để ba tab vừa màn hình nhỏ. Chỉ một TabList.

Profile root không có Back. Guest dùng UI Login/Register cũ, không tự điều hướng hoặc giả danh tính. Logout giữ tab Cá nhân và hiển thị Guest; auth/favorites store vẫn xóa trạng thái riêng như cũ. USER/ROOM_HOST dùng Favorites theo quyền hiện có; STAFF/ADMIN vẫn có Profile và các menu được phép. Không thay API, token hoặc backend.

HomeHeader bỏ toàn bộ avatar/handler/style; giữ nút chuông và callback/Alert cũ. Không tìm thấy route Notifications/API unread trong luồng hiện tại: không tự tạo route; bỏ mặc định badge giả 2, vẫn hiển thị khi truyền unreadNotifications thật. Guest giữ nút đăng nhập hiện có.

Safe Area: Home/Explore giữ xử lý cũ. NativeTabs SDK58 tự áp dụng inset đáy (Android) hoặc điều chỉnh ScrollView (iOS); Profile root chỉ SafeArea top/left/right và automatic scroll inset. Stack con giữ SafeArea đầy đủ. Web TabList nằm ngoài TabSlot trong normal flow, không đè nội dung, tính bottom inset đúng một lần. Không cộng chiều cao giả của tab bar.

Motion: giữ chuyển tab native, press feedback và confirm dialog Reduce Motion. Bỏ entrance Profile Overview để không fade/replay khi đổi tab. Không thêm thư viện, không có skill animate-ui/expo-animation phù hợp đã cài.

File: src/components/app-tabs.tsx, app-tabs.web.tsx, src/components/home/home-header.tsx, src/components/profile/profile-ui.tsx; chuyển src/app/account.tsx → src/app/(main)/account.tsx; cập nhật scripts/check-profile.cjs, scripts/check-favorites.cjs, PROFILE.md, FAVORITES.md và tài liệu này.

Kiểm thử: typecheck/lint, 53 test hiện có đạt. UI fixture Profile đạt 320/360/390/430: ba tab/active state; guest/register/login; Home không avatar và có chuông; Profile không Back; edit/back/unsaved changes/save; password; logout thành Guest. Dữ liệu fixture chỉ trong script kiểm thử, không ở runtime.
UI fixture Favorites cũng đạt: Detail/Back, bỏ lưu/rollback, phân trang, guest/đổi tài khoản và lỗi refresh giữ cache.
Chưa kiểm thử thiết bị iOS/Android, Home Indicator/Dynamic Island, Android gesture/3-button, font scaling hệ điều hành hoặc animation native trên thiết bị. Viewport browser không thay kiểm thử thiết bị.

Chạy: npm run dev (web API8080, mobile API8081, web5173, Expo8082 giữ nguyên).

