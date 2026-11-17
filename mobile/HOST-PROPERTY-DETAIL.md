# Chi tiết nhà trọ của chủ trọ

Route `/host/property?id=…` (hoặc registrationId cho hồ sơ chưa tạo nhà trọ) được tái sử dụng. Back về `/home` — Nhà trọ của tôi; không có tab bar trên màn chi tiết. Chỉ ROOM_HOST được render nội dung, nguồn records là danh sách sở hữu từ HostProvider/API hiện có.

## Bố cục và đối chiếu dữ liệu

Đã đối chiếu `frontend/src/pages/host/HostPropertyPage.jsx`, các service host/property-registration trên web, `HostPropertyController`, `HostPropertyService`, `HostPropertyResponse`, `PropertyRegistrationController` và `PropertyEditService`. Tin nhắn nhiệm vụ không kèm ảnh web/mobile mới, nên nguồn đối chiếu cụ thể là mã nguồn hiện tại và yêu cầu bằng văn bản.

| Dữ liệu backend cho phép chủ trọ xem | Chỗ hiển thị mobile |
|---|---|
| name, address | Dưới ảnh bìa; tên xuống dòng tự nhiên, địa chỉ loại đoạn xã trùng khi hiển thị |
| photos: documentId/type/fileName/verificationStatus | Ảnh bìa; thư viện vuốt ngang với bộ đếm/đóng/trước/sau; filename và trạng thái kiểm tra trong trình xem. ID dùng gọi API ảnh riêng, type dùng phân loại ảnh |
| displayStatus | Dưới tên và mục Hồ sơ, tách khỏi xác minh |
| roomTypeCount, totalRooms, vacantRooms, pendingViewingCount | Một dải tổng quan bốn số gọn, phòng trống teal. Không suy ra số đã thuê; giá trị thiếu/sai hoặc chưa có property là “—” |
| propertyType, addressDetail, commune | Mục Thông tin |
| description | Mục Thông tin, Xem thêm/Thu gọn cho mô tả dài; đọc được toàn bộ |
| amenities, selectedRules, rules | Mục Thông tin; dịch nhãn theo các key của web, giữ giá trị lạ để không bỏ dữ liệu; quietHours hỗ trợ giờ đã lưu |
| managerName, contactPhone, zaloPhone, contactInfo | Mục Thông tin; contactInfo cũ vẫn có chỗ riêng, Zalo chưa điền hiện Chưa cập nhật |
| address, commune, nearby | Mục Vị trí; nearby giữ nguyên cả ghi chú khoảng cách nếu được lưu trong chuỗi này |
| latitude, longitude | Khi cặp tọa độ hợp lệ: tọa độ đã lưu và liên kết bản đồ/chỉ đường chính xác; không dùng tâm xã hoặc ghim giả |
| verified, reverificationRequired, reverificationReasons | Mục Hồ sơ, nhóm Xác minh riêng; không dùng VISIBLE để kết luận đã xác minh |
| reasonNote, requestedFields, fieldNotes | Hồ sơ, phản hồi của hồ sơ gốc; đầy đủ ghi chú theo trường và nhóm ảnh |
| changeRequest.registrationId/status/reasonNote/requestedFields/fieldNotes | Hồ sơ, một nhóm riêng cho đề nghị thay đổi đang theo dõi |
| documents: type/fileName/verificationStatus | Hồ sơ, ba nhóm giấy phép kinh doanh / CCCD hoặc CMND / PCCC, trạng thái và filename riêng tư; ID dùng định danh metadata, không tạo liên kết tải file |
| propertyId, registrationId, createdAt, updatedAt | Hồ sơ, mã nhà trọ/mã hồ sơ và ngày giờ Việt Nam theo formatter hiện có |

Chuẩn hóa địa chỉ chỉ tác động chuỗi render, không sửa bản ghi gốc. Có skeleton, lỗi Thử lại, ảnh lỗi Thử lại, ảnh thiếu dùng placeholder trung tính và trạng thái không tìm thấy trong tài khoản. Khi đổi mục sau khi cuộn sâu, nội dung mục mới trở về đầu vùng mục, tránh bỏ qua thông tin đầu tiên.

## Quản lý đúng nhà trọ và Back

Mục Phòng mở `/host/property-management?propertyId=…&section=room-types|rooms|viewings`. Đây là adapter Stack mỏng, dùng chính RoomTypesScreen/RoomsScreen/ViewingsScreen hiện có; không có danh sách hoặc API/store quản lý thứ hai. Bộ chọn nhận propertyId ban đầu; Loại & giá cũng nhận propertyId từ route. Adapter kiểm tra ID thuộc records sở hữu. Các màn mở từ đây có Back và không có tab bar; khi trở lại chi tiết, mục Phòng và trạng thái màn chi tiết được giữ. Ba tab quản lý chính giữ bố cục/navigator cũ và không có Back.

Safe Area của màn Stack/Modal xử lý top/bottom một lần; footer nằm trong layout thông thường ngoài ScrollView, không phủ nội dung. Không thêm dependency hoặc sửa cấu trúc menu.

## API thực sự dùng

- GET `/api/host/property`: dữ liệu đầy đủ qua HostProvider có sẵn; không dùng DTO công khai của người thuê.
- GET `/api/host/property/photos/{documentId}`: bearer, cachePolicy none; fallback/Thử lại nếu lỗi. Backend kiểm tra chủ sở hữu và chỉ cho PHOTO_n hợp lệ.
- Các component quản lý dùng lại GET `/api/host/room-types`, `/api/host/rooms`, `/api/host/viewings` và store hiện có. Không thêm endpoint.
- Bản đồ theo pattern mở liên kết HTTPS hiện có trên mobile, đích tạo từ cặp tọa độ đã lưu được kiểm tra số/range. Chỉ render nút sau canOpenURL thành công. Không có map SDK nhúng trong mobile, không thêm WebView hoặc bản đồ giả.

## Phần còn thiếu / không giả lập

1. **Gửi đề nghị thay đổi trên mobile chưa có luồng.** Backend đã có GET `/api/host/property-registrations/{id}/edit` và POST multipart `/{id}/resubmit`; contract có editableFields, versionToken, retainedPhotoIds và có thể tạo bản đề nghị để staff duyệt. Mobile hiện chỉ có form đăng ký mới. Nhiệm vụ này không nối nút đề nghị vào form đăng ký hoặc PUT trực tiếp. Vùng dưới hiển thị thông báo thực hiện trên web / trạng thái chờ duyệt hoặc cần bổ sung. Không có nút bấm giả hay thông báo gửi thành công. Web và backend không thay đổi.
2. **Không mở binary giấy tờ.** HostPropertyController chỉ có endpoint ảnh PHOTO_n. API chủ trọ hiện trả metadata giấy tờ, không có endpoint đọc giấy phép/CCCD/PCCC cho ROOM_HOST. Chỉ hiển thị trạng thái và filename trong vùng chủ trọ; không dùng endpoint staff hoặc tạo URL đoán. Không log hồ sơ, token hoặc URL ảnh riêng.
3. **Không có trường trạng thái xét duyệt gốc riêng trong PropertyDetail.** Với PENDING/NEEDS_SUPPLEMENT/REJECTED/APPROVED, displayStatus cung cấp kết quả tương ứng. verified=true chứng minh hồ sơ APPROVED theo HostPropertyService. VISIBLE đơn thuần không được coi là đã duyệt/đã xác minh; trường hợp chưa đủ dữ liệu hiện Chưa có kết quả xét duyệt riêng. Trạng thái proposal từ changeRequest được hiển thị độc lập.
4. **Không có trường khoảng cách tách riêng hoặc ngày reviewedAt trong DTO này.** Giữ nguyên ghi chú nearby, createdAt/updatedAt; không tính khoảng cách hoặc đoán ngày duyệt.

## File tạo/sửa

- `src/app/host/property.tsx`: route cũ, quyền/Back/loading/error.
- `src/components/host/property-detail-content.tsx`: bốn mục, tổng quan, liên hệ/vị trí/hồ sơ và thông báo đề nghị.
- `src/components/host/property-gallery.tsx`: ảnh riêng, thư viện native paging, lỗi/Thử lại/Reduce Motion.
- `src/services/host.ts`: khai báo đủ PropertyDetail/Attachment của backend.
- `src/services/host-property.ts`: helper địa chỉ, tọa độ, số liệu và nhãn nghiệp vụ.
- `src/app/host/property-management.tsx`: adapter Stack dùng chung các màn quản lý.
- `src/components/host/{management-ui,room-types-screen,rooms-screen,viewings-screen}.tsx`: nhận scope/Back; không thiết kế lại các tab chính.
- `tests/host.test.ts`, `scripts/check-host-property.cjs`: kiểm tra dữ liệu, quyền, ảnh và navigation.
- Tài liệu này và ghi chú trong HOST-MANAGEMENT.md.

## Kiểm thử thực sự chạy

- `npm run typecheck`, `npm run lint`: đạt.
- Các test đã cấu hình: auth29, google4, listings7, favorites13, search5, host24, registration5 = **87 đạt**.
- Expo Web/Playwright: mở hai nhà trọ từ Home; bốn mục; ảnh ba trang, cuộn ngang, bộ đếm/đóng, ảnh lỗi/Thử lại; kiểm tra bearer của mọi request ảnh, Guest không đọc host data/ảnh; tọa độ thiếu không có Chỉ đường; phân biệt VISIBLE với verified=false; phản hồi gốc và proposal; ba màn quản lý đúng ID, chọn nhà trọ thứ hai không lẫn dữ liệu nhà thứ nhất; Back giữ mục; lỗi dữ liệu/Thử lại. Không có page error hoặc host write trong test chi tiết.
- Chụp ảnh Expo Web ở 320/390/430 px, mô phỏng chữ 130% và Reduce Motion. File trong `.expo/host-property-review/`. Dữ liệu và ảnh PNG nhỏ là fixture riêng, không phải hình nhà trọ/tài khoản thật.
- Regression `check-host-management.cjs` và `check-my-properties.cjs`: đạt, gồm thêm/sửa quản lý qua fixture, logout/Guest, đăng ký và menu. Các test browser dùng API fixture, không ghi database thật.
- Chưa kiểm thử thiết bị/emulator iOS/Android, vuốt ảnh bằng tay trên native, OS Dynamic Type/VoiceOver, map app/chỉ đường thực, file giấy tờ hoặc gửi đề nghị. Không có thiết bị/emulator được kết nối để chụp ảnh native. Không báo các luồng thiếu này đã hoạt động.

## Hướng dẫn / skill

Đọc AGENTS.md ở gốc HL-RCS và mobile. Áp dụng `mobile/.agents/skills/mobile-app-ui-design/SKILL.md` và `.agents/skills/ui-ux-pro-max/SKILL.md` ở gốc project đã đọc trong cùng phiên. Giữ React Native + Expo, token teal/ivory và AnimatedPressable/Reduce Motion hiện có.

Đối chiếu tài liệu đúng SDK 58: [Router](https://docs.expo.dev/versions/v58.0.0/sdk/router/), [Image](https://docs.expo.dev/versions/v58.0.0/sdk/image/), [Linking](https://docs.expo.dev/versions/v58.0.0/sdk/linking/). Không nghiên cứu hoặc tuyên bố đã xem screenshot/flow Mobbin không được cung cấp trong nhiệm vụ này.
