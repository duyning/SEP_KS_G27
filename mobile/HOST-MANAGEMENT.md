# Bốn màn quản lý chủ trọ

> Cập nhật màn chi tiết nhà trọ: xem [HOST-PROPERTY-DETAIL.md](HOST-PROPERTY-DETAIL.md). Các component quản lý nay nhận scope/Back để dùng lại trong Stack từ chi tiết; menu chính giữ nguyên.

## Kết quả

- Loại phòng & Giá: bộ chọn nhà trọ dùng chung component, danh sách hàng gọn, giá căn phải với đơn vị ₫/tháng. Thêm/sửa cấu hình theo propertyId/roomTypeId thật; giữ ảnh, tiền cọc, tiện nghi, mô tả và phí hiện có khi sửa các trường cơ bản.
- Quản lý phòng: cùng bộ chọn nhà trọ, tìm mã phòng, bộ lọc Tất cả/Trống/Đã thuê; từng phòng hiển thị mã, loại và trạng thái bằng chữ. Thêm/sửa theo RoomRequest thật; chỉ chọn loại thuộc nhà trọ đang thao tác. Không có Bảo trì vì API chỉ chấp nhận VACANT/OCCUPIED.
- Yêu cầu xem phòng: mặc định Chờ phản hồi, sắp lịch tăng dần; nhóm Đã xử lý giữ các trạng thái xác nhận/từ chối/hủy thật. Ngày giờ Việt Nam (Asia/Ho_Chi_Minh), có thông tin người gửi/loại phòng/nhà trọ. Chỉ xử lý trong chi tiết, xác nhận nhắc lại loại phòng và giờ hẹn; từ chối bắt buộc có lý do theo backend.
- Cá nhân chủ trọ: nhận diện teal, tên/email/avatar/role thật, nhóm Thông tin cá nhân và Đổi mật khẩu, Đăng xuất riêng với lựa chọn Ở lại. Tái sử dụng Edit/Security, auth store và logout có thật. Điểm chuyển sang tìm phòng giữ quyền khám phá/Favorites hiện có, không lặp các tab quản lý.

Giữ menu Nhà trọ · Loại & giá · Phòng · Yêu cầu · Cá nhân; không sửa navigator hay thiết kế Nhà trọ của tôi trong nhiệm vụ này. Root tabs không Back, màn con có Back. Bộ chọn và bộ lọc của từng tab được giữ khi mở chi tiết rồi quay về. Đổi nhà trọ xóa tìm kiếm/lọc loại phòng cũ để không lẫn dữ liệu.

## API/DTO và quyền

- GET `/api/host/room-types`: toàn bộ loại phòng và nhà trọ sở hữu; property summary có status. Nút thêm chỉ hiện khi nhà trọ ACTIVE.
- GET `/api/host/room-types/{id}`: tải chi tiết đầy đủ trước chỉnh sửa.
- POST `/api/host/room-types`: JSON RoomTypeRequest cho thêm loại.
- PUT `/api/host/room-types/{id}`: multipart `details` application/json; cập nhật tên, diện tích, sức chứa, giá, giữ nguyên các trường khác và retainedImageIds. Không tự sửa giá riêng/phần hợp đồng.
- GET `/api/host/rooms`: danh sách toàn bộ, không phân trang trong contract hiện có. Tìm/lọc phía client trên tập đầy đủ; không dùng số phòng của một trang để suy ra tổng.
- POST `/api/host/rooms`, PUT `/api/host/rooms/{id}`: RoomRequest với roomTypeId, roomNumber, floor, status, customPrice. Backend hiện cho chủ sở hữu cập nhật VACANT/OCCUPIED, không có trạng thái do hợp đồng quản lý trong luồng này.
- GET `/api/host/viewings`: toàn bộ yêu cầu; đếm PENDING từ tập đầy đủ.
- POST `/api/host/viewings/{id}/decision`: status APPROVED/REJECTED, reason, expectedScheduledDate; backend kiểm tra quyền/trạng thái/giờ đề xuất và phòng trống. Lỗi 409 tự tải lại dữ liệu. Không đổi trạng thái lạc quan trước thành công.
- Hồ sơ giữ PUT `/api/auth/profile`, POST `/api/auth/change-password`, POST `/api/auth/logout` hiện có. Email vẫn chỉ đọc; cập nhật đồng bộ auth store, logout dọn store riêng như trước.

Tất cả màn quản lý vẫn qua useHost/HostPage và role ROOM_HOST; backend quyết định quyền sở hữu từ principal. Không sửa backend, web, MySQL, quyền hay menu tenant. Client chống gửi lặp, có timeout và giữ lỗi. GET preflight phòng/loại phòng tránh ghi snapshot đã cũ; backend chưa có version/ETag cho PUT này nên chưa bảo đảm compare-and-swap nguyên tử nếu có cập nhật chen giữa GET và PUT.

## File tạo/sửa trong nhiệm vụ

- Routes: `src/app/(main)/host/{room-types,rooms,viewings}.tsx`, `src/app/(main)/account.tsx`, `src/app/host/{room-type,room,viewing}.tsx`.
- UI: `src/components/host/{management-ui,room-types-screen,rooms-screen,viewings-screen}.tsx`; `src/components/profile/profile-ui.tsx` chỉ thêm cancelLabel tùy chọn, mặc định cũ vẫn là Hủy.
- Data: `src/services/host.ts`, `host-edit.ts`, `host-type-upload.ts`, `host-type-upload.web.ts`, `src/context/host-context.tsx`.
- Kiểm thử: `tests/host.test.ts`, `scripts/check-host-management.cjs`, `scripts/check-my-properties.cjs` (cập nhật nhãn thao tác chủ trọ).
- Tài liệu: `HOST-MANAGEMENT.md`, ghi chú cập nhật `MY-PROPERTIES.md`.

## Kiểm thử

- `npm run typecheck`, `npm run lint`: đạt.
- Các test đã cấu hình: auth29 + google4 + listings7 + favorites13 + search5 + host19 + registration5 = **82 đạt**.
- `check-host-management.cjs`: thêm loại đúng nhà trọ, sửa giá multipart giữ ảnh/phí, lọc/tìm phòng và Back giữ bộ lọc, thêm/sửa phòng chỉ chọn loại đúng nhà trọ; xác nhận/từ chối, lỗi 500 không đổi trạng thái, xung đột 409 tải lại; lưu Profile, đổi mật khẩu, Ở lại và đăng xuất thật qua API fixture. Không có page error.
- Expo Web: ảnh bốn màn ở 320/390/430 px trong `.expo/host-management-review/`; kiểm tra 130% font mô phỏng, Reduce Motion, landscape 740×390, lỗi/Thử lại và Đăng xuất cuộn lên trên menu. Không tràn ngang.
- Regression `check-profile.cjs` (người thuê) và `check-my-properties.cjs` (bao gồm dữ liệu trống, đăng ký, chuyển mode, Guest sau logout): đạt. Đã sửa trường hợp tab giữ nền đọc propertyId khi dữ liệu bị dọn sau logout/không còn nhà trọ được chọn.
- API writes trong browser test dùng fixture riêng, không tạo/sửa dữ liệu backend thật. Native multipart upload, bàn phím native, Safe Area iOS/Android, OS Dynamic Type và screen reader chưa được kiểm thử trên thiết bị. Không có adb/emulator được tìm thấy trong môi trường.

## Hướng dẫn và skill

Đã đọc AGENTS.md ở gốc HL-RCS và mobile. Áp dụng `mobile/.agents/skills/mobile-app-ui-design/SKILL.md` và `.agents/skills/ui-ux-pro-max/SKILL.md` ở gốc project (đã đọc trong cùng phiên; dùng checklist native). Giữ token/thư viện hiện có, không áp dụng các ví dụ HTML/Tailwind hoặc khoảng cách section web cho màn native gọn.

Đối chiếu [Expo Router SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/) và [Expo FileSystem SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/). Không dùng mockup HTML làm bản chạy thật; không tuyên bố nghiên cứu flow Mobbin/Pinterest không truy cập được. Bố cục triển khai bám yêu cầu cụ thể trong file đính kèm.
