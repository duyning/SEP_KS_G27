# Nhà trọ của tôi — triển khai mobile

> Cập nhật: bốn tab quản lý còn lại đã được triển khai thêm form Loại phòng/Phòng, xử lý lịch và Profile chủ trọ riêng. Xem [HOST-MANAGEMENT.md](HOST-MANAGEMENT.md). Màn Nhà trọ của tôi giữ bố cục trong tài liệu này.

Màn `/home` trong chế độ ROOM_HOST hiện là Nhà trọ của tôi: header có một điểm vào Đăng ký, một thẻ teal thể hiện phòng trống/tổng phòng, danh sách nhóm nền trắng với ảnh nhỏ, tên, địa chỉ và số phòng. Nhấn cả hàng mở hồ sơ theo propertyId/registrationId. Không có Back, nút tài khoản hoặc CTA đăng ký lặp ở cuối màn hình.

## Navigation

Chủ trọ: Nhà trọ · Loại & giá · Phòng · Yêu cầu · Cá nhân. Profile tái sử dụng `/account`; các màn chỉnh sửa, bảo mật và Favorites giữ nguyên. Màn con vẫn nằm trong Stack và có Back. Route `/host/rooms` và `/host/viewings` giữ URL, chuyển vào nhóm `(main)` để làm tab thật. `/host/properties` chuyển về màn Nhà trọ hiện tại.

Tenant/guest vẫn có Trang chủ · Tìm phòng · Cá nhân. Chủ trọ chuyển sang tìm phòng và quay lại quản lý từ Profile; `/host/discovery` xử lý chuyển mode trước khi mở tab Explore đang ẩn. Quyền dựa trên role ROOM_HOST thật, không dựa trên email/tên. Auth, dữ liệu riêng và xử lý logout dùng store hiện có.

## Nguồn số liệu thật

- `GET /api/host/dashboard`: dùng `availableRoomCount` và `totalRoomCount` khi là số nguyên hợp lệ, không âm và số trống không vượt tổng.
- Fallback `GET /api/host/rooms`: endpoint hiện trả toàn bộ phòng của chủ sở hữu, không phân trang. Đếm toàn bộ danh sách và chỉ đếm trạng thái VACANT là phòng trống.
- `GET /api/host/property`: từng hàng dùng `vacantRooms`/`totalRooms` của chính record; không suy ra số đã thuê. Hồ sơ chưa có số liệu hiển thị chưa biết.
- `GET /api/host/property/photos/{documentId}`: ảnh xác thực bearer; thiếu/lỗi ảnh dùng icon, không dùng ảnh nhà mẫu.
- Chưa tải không hiển thị 0; tải lỗi có Thử lại, giữ dữ liệu thành công trước đó kèm thông báo. Có skeleton, empty state và pull-to-refresh.

Không sửa Spring Boot, MySQL hoặc web. Không có mock trong runtime app.

## Điểm vào chức năng

Source ban đầu chưa có màn đăng ký native và tab loại phòng. Đã thêm route hoạt động bằng contract có thật:

- `/host/room-types`: `GET /api/host/room-types`, hiển thị loại/giá thật; nhấn mở danh sách phòng lọc theo loại và nhà trọ.
- `/host/property-registration`: `GET /api/host/property-registrations/eligibility`, form bốn bước và `POST /api/host/property-registrations` multipart theo DTO/validation backend, xác nhận trước gửi, cảnh báo khi rời form chưa gửi. Không gửi đăng ký thật vào database trong kiểm thử.
- Tài liệu tải lên hiện chọn ảnh qua ImagePicker. Backend có nhận PDF nhưng giao diện này chưa có bộ chọn PDF. Upload native dùng expo-file-system phiên bản SDK 58; cần kiểm thử trên thiết bị.

## Các file trong phạm vi

- UI: `src/components/host/my-properties-screen.tsx`, `host-list-screen.tsx`; `src/app/(main)/home.tsx`, `account.tsx`, `host/{room-types,rooms,viewings}.tsx`.
- Navigator/context: `src/components/app-tabs.tsx`, `app-tabs.web.tsx`, `src/context/host-mode-context.tsx`, `src/app/_layout.tsx`.
- Adapter/đăng ký: `src/app/host/{properties,discovery,property-registration}.tsx`; `src/app/favorites.tsx` chỉ sửa đích khám phá của chủ trọ khi tab Explore bị ẩn.
- Data: `src/services/host.ts`, `property-registration.ts`, `registration-upload.ts`, `registration-upload.web.ts`; `package.json`, `package-lock.json`.
- Kiểm thử: `tests/host.test.ts`, `tests/property-registration.test.ts`, `scripts/check-my-properties.cjs`, `check-host.cjs`, `check-host-backend.cjs`.
- Tài liệu: file này cùng ghi chú cập nhật trong LANDLORD.md và NAVIGATION.md. Component dashboard cũ không còn được render ở Home, không xóa các phần không liên quan.

## Kết quả kiểm tra

- `npm run typecheck`, `npm run lint`: đạt.
- Các script test auth, google, listings, favorites, search, host, registration: 77 test đạt.
- Expo Web/Playwright: 320, 390, 430 px; thêm 320×568 và mô phỏng cỡ chữ 130%. Thẻ tổng và hàng đầu hiển thị phía trên menu ở màn nhỏ; danh sách dài cuộn được hàng cuối lên trên menu. Ảnh kiểm tra ở `.expo/host-review/`, dùng dữ liệu fixture riêng của test.
- Luồng đã kiểm tra trên web: guest, đăng nhập chủ trọ, năm tab, mở nhà trọ, phòng, yêu cầu và Back; Profile/bảo mật, chuyển mode tìm phòng, đăng xuất; bốn bước đăng ký và multipart bằng server fixture; lỗi/Thử lại/empty. Các script regression Search/Profile/Favorites cũng đạt.
- Smoke GET backend thật cổng 8081: bảy resource truy cập thành công. Tài khoản kiểm tra hiện chưa có nhà trọ/phòng; số liệu có dữ liệu và ảnh thật chưa được kiểm tra với tài khoản này.
- Chưa kiểm thử iPhone/Android thật hoặc emulator, native multipart upload, OS Dynamic Type/VoiceOver, bàn phím và safe-area native. Mô phỏng font trên web không thay thế kiểm tra Dynamic Type. Chưa kiểm thử tablet/landscape hoặc dark mode; màn được thiết kế theo light theme người dùng yêu cầu.

## Hướng dẫn và nguồn thực sự dùng

- Đọc `AGENTS.md` ở gốc project và trong mobile; áp dụng `mobile/.agents/skills/mobile-app-ui-design/SKILL.md` và checklist `.agents/skills/ui-ux-pro-max/SKILL.md` ở gốc project. CLI của skill thứ hai không chạy được vì Python launcher không khả dụng; không cài thêm Python. Bố cục phòng trống trước là yêu cầu cụ thể của người dùng, ưu tiên hơn mẫu dashboard task-first trước đó.
- Đối chiếu Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/ , https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/ , https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/ .
- Không tuyên bố nghiên cứu flow Mobbin/Pinterest bị giới hạn truy cập; thiết kế hiện tại dựa trên bố cục cụ thể người dùng yêu cầu và các pattern native trong skill.
