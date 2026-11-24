# HL_RCS Landlord Hub — Mobile

> Cập nhật: Home chủ trọ đã chuyển sang **Nhà trọ của tôi**, thay cho dashboard dưới đây. Navigation năm tab, số liệu và kết quả kiểm thử hiện hành được ghi tại [MY-PROPERTIES.md](MY-PROPERTIES.md). Phần dưới lưu mô tả triển khai trước đó.

## Navigation / phạm vi
ROOM_HOST: tab /home hiển thị Tổng quan chủ trọ, /explore vẫn Tìm phòng, /account vẫn Cá nhân. Tenant/Guest/STAFF/ADMIN giữ Home công khai hiện có; mobile không tự mở dashboard cho ADMIN dù một số GET backend cho phép ADMIN trên dữ liệu sở hữu của chính họ. Profile ROOM_HOST thêm điểm vào Quản lý nhà trọ. Không tạo bốn tab giả; ba chức năng quản lý thật nằm trong Stack /host/*. Dashboard không Back; các trang con có Back.

Tenant Home được chuyển nguyên implementation sang src/components/home/tenant-home.tsx, route home là wrapper theo role. Không đổi Search/Favorites/Detail/Auth APIs hoặc backend. Các cổng8080/8081/5173/8082 giữ nguyên.

## Thiết kế
Task-first: header tên từ auth + inbox badge thật; selector cho nhiều nhà trọ; tối đa3 PENDING requests; tối đa4 KPI trong grid2 cột;3 action quản lý; tối đa2 property preview và Xem tất cả. Cards dọc/native, ảnh nhà trọ được xác thực bearer khi backend có ảnh; thiếu/lỗi ảnh dùng icon fallback trung tính. Không có sidebar, bảng rộng, WebView hoặc chart library. Không dùng ảnh nhà mẫu thay ảnh thật.

Selector chỉ gồm property thực thuộc chủ sở hữu từ dashboard. Property records có thể gồm hồ sơ chưa tạo property (propertyId=null); chúng xem được trong danh sách hồ sơ, không dùng làm property filter. Khi không có property, thay grid KPI0 bằng onboarding ngắn; pending registration nếu có chỉ hiển thị số thật. Chưa thêm form đăng ký dài trên Dashboard.

## API thật
- GET /api/host/dashboard: tổng hợp owner từ principal, không truyền ownerId.
- GET /api/host/property: records bao gồm hồ sơ và nhà trọ; có totalRooms/vacantRooms/pendingViewingCount, trạng thái, photos.
- GET /api/host/property/photos/{documentId}: ảnh riêng, bearer header, cachePolicy none.
- GET /api/host/rooms: danh sách phòng đầy đủ, không pagination. Mobile lọc property/status trên tập đầy đủ này; FlatList virtualization.
- PUT /api/host/rooms/{roomId}: roomTypeId, roomNumber, floor, status VACANT/OCCUPIED, customPrice. UI thay status; giữ thông tin khác. Preflight GET danh sách mới nhất và từ chối nếu fields/status đã đổi từ snapshot. Backend chưa có version/expectedVersion cho room: không thể bảo đảm atomic compare-and-swap với cập nhật từ thiết bị khác giữa preflight và PUT.
- GET /api/host/viewings: danh sách yêu cầu đầy đủ, lọc property/status ở mobile.
- POST /api/host/viewings/{bookingId}/decision: status APPROVED/REJECTED, reason (bắt buộc khi từ chối), expectedScheduledDate giữ nguyên string backend. Có confirmation; server quyết định tính hợp lệ giờ hẹn/phòng trống/quyền.
- GET /api/viewings/notifications?page=N: inbox current recipient, unreadCount và hasNext; tải thêm, dedupe notificationId.
- PUT /api/viewings/notifications/{id}/read: đọc thông báo thật. Chỉ mở host viewing detail khi booking thuộc tập host viewings; inbox có thể gồm hoạt động trong vai người tìm phòng, không giả định mọi notification đều thuộc property đang chọn.

## KPI và consistency
Toàn bộ nhà trọ: số property từ danh sách dashboard hoàn chỉnh, totalRoomCount, availableRoomCount, pendingViewingCount từ API tổng hợp. Một property: đếm rooms/viewings từ các tập đầy đủ đã tải, lọc propertyId; thiếu nguồn không tự gán0. Không tính tổng từ trang đầu.

Không sử dụng occupancyRate backend để gọi là tỷ lệ đang thuê, vì service hiện lấy total-vacant có thể bao gồm trạng thái khác. roomCounts đếm VACANT/OCCUPIED/other độc lập (có test), nhưng không thêm biểu đồ trùng KPI trên Dashboard. Không suy ra doanh thu/tỷ lệ tăng trưởng.

HostStore dùng Context/useSyncExternalStore, một instance theo userId và role; tải5 nguồn độc lập, khóa refresh/mutation trùng, generation+AbortController chống response tài khoản cũ. Không persist data/token ảnh xuống disk. Logout/đổi account bỏ snapshot và abort;401/403 bỏ private cache và revalidate auth hiện có. Lỗi mạng giữ last-success cache kèm lỗi từng section; lỗi một API không che các mục khác. Mỗi mutation refresh authoritative resources; không optimistic occupancy hoặc count thành công giả. Init được dedupe, không gọi lại API mỗi lần một PropertyCard xuất hiện. Dashboard focus/pull refresh cập nhật nguồn chung; notifications paging được quản lý trong cùng store.

## Chức năng đã có
Dashboard/selector/KPI, property list/detail read, room list/filter/detail/update status, viewing list/filter/detail/approve/reject, inbox/read/load-more, guest/tenant denial, native Back, loading/error/retry/empty/refresh. Chủ trọ vẫn khám phá phòng. Không tạo global Add Room FAB vì tạo phòng yêu cầu chọn Room Type và form riêng.

## Giới hạn / không đánh đồng thiếu API với thiếu UI
- Chưa làm native create/delete room, edit Room Type, đăng ký/sửa hồ sơ property; backend có một số API tương ứng, nhưng cần flow form/giấy tờ/approval riêng. Property detail hiện đọc và dẫn tới quản lý phòng/yêu cầu, không có nút sửa giả; đăng ký/hồ sơ cần bổ sung vẫn xử lý trên web hiện có.
- Không triển khai thu tiền, hóa đơn, bảo trì, tenant/contracts/revenue hoặc audit timeline: không có contract đã xác minh cho Dashboard này. Notification có thật nằm ở inbox, không tự biến lịch sử booking thành nhật ký.
- GET list owner hiện chưa phân trang; mobile dùng FlatList và dashboard chỉ preview2/3. Chủ trọ quy mô rất lớn cần API cursor/page + per-property dashboard để tránh tải toàn bộ; đề xuất GET /api/host/dashboard?propertyId=, GET /api/host/rooms?page=&size= và GET /api/host/viewings?status=&propertyId=&page= (chưa tồn tại, không gọi runtime).
- Không lọc unread badge theo property vì inbox contract chưa có propertyId.

## Motion / safe area
Tái dùng AnimatedPressable scale0.98/haptic và ConfirmDialog Reduce Motion, selector modal slide/fade theo Reduce Motion. Không replay stagger/counter khi refresh. NativeTabs quản lý bottom inset; root Dashboard chỉ top/left/right SafeArea. Stack con có SafeArea đầy đủ. HostPage hỗ trợ keyboard taps/automatic keyboard inset trên iOS; Android theo resize hiện có. List dài dùng FlatList, không nested vertical list. Không thêm thư viện/skill; không tìm thấy animate-ui/expo-animation trong skill catalog phù hợp.

## References truy cập được
- Pinterest https://www.pinterest.com/ideas/mobile-app-dashboard/941994552590/ trả403. Không phân tích pin/screens.
- Mobbin https://mobbin.com/discover/apps/ios/top chỉ shell/login; không Mobbin MCP. Không tuyên bố đã xem flow.
- DailyFlutterUI https://payhip.com/DailyFlutterUI chỉ danh mục công khai, không tải/source thương mại.
- https://help.guesty.com/hc/en-gb/articles/9360094137629-Overview-of-the-Guesty-mobile-app và https://help.guesty.com/hc/en-gb/articles/20877272088093-Managing-tasks-in-the-Guesty-mobile-app — tài liệu công khai hỗ trợ chọn property/context và task-oriented management, không phải phép đo visual spacing hay thử toàn bộ app. Chọn3 pattern cho HL_RCS: task-first; contextual property filtering; overview→detail→confirmed action→refresh. Tokens/spacing/visual do HL_RCS thiết kế mới, không sao chép asset/layout thương mại.

## Files
Mới: src/services/host.ts; src/context/host-context.tsx; src/components/host/host-ui.tsx, landlord-dashboard.tsx, host-list-screen.tsx; src/app/host/{properties,property,rooms,room,viewings,viewing,notifications}.tsx; tests/host.test.ts; scripts/check-host.cjs; scripts/check-host-backend.cjs; LANDLORD.md.
Chuyển: src/app/(main)/home.tsx implementation → src/components/home/tenant-home.tsx; home.tsx thành role wrapper.
Sửa tích hợp: src/app/_layout.tsx; src/components/app-tabs.tsx, app-tabs.web.tsx (label role); src/app/(main)/account.tsx (menu host); package.json (test:host).
Giữ nguyên các thay đổi web/backend chưa commit có trước.

## Validation
Typecheck và lint --no-cache đạt.68 tests: host10 + search5 + auth29 + Google4 + listings7 + favorites13.
UI fixture:320/390/430 Dashboard, multi-property selector/scoped KPI, approve/reject/required reason, stale scheduled-date payload, confirmation, room failure giữ status rồi retry thành công, unread/read, Back, khám phá, logout, guest deep-link denied không dispatch host requests, empty onboarding không grid KPI0. Search regression320/360/390/430 cũng đạt. Không pageerror. Fixture chỉ trong scripts, không ở runtime.
Backend thật8081:5 GET owner endpoints đạt, tổng rooms/vacant/pending khớp danh sách đầy đủ. Tài khoản seedROOM_HOST hiện0 property/0 room: chưa chứng minh populated real API/ảnh private, không gọi mutation phòng/lịch thật hoặc đổi DB.
Chưa có kiểm thử iPhone/Android thật/emulator, Dynamic Island/Home Indicator, Android gesture/3button, keyboard native, OS font scaling, VoiceOver/TalkBack, protected photo cache native hoặc notification nhiều trang trên server thật. Viewport browser không thay thiết bị.

## Chạy
npm run dev vẫn dùng các cổng cố định. Đăng nhập ROOM_HOST để vào Tổng quan. npm run test:host; các script typecheck/lint/test khác giữ nguyên. UI fixture cần Expo web8092 riêng + PLAYWRIGHT_MODULE rồi node scripts/check-host.cjs. Backend smoke đặt HLRCS_TEST_EMAIL/HLRCS_TEST_PASSWORD (tài khoản test có sẵn), tùy chọn HLRCS_TEST_API_URL, rồi node scripts/check-host-backend.cjs. Không ghi credentials/token vào source hay log.

