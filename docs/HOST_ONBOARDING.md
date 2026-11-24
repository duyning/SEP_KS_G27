# Đăng ký chủ trọ và nhà trọ trong một hồ sơ

Cập nhật 2026-11-14. Web `/become-host` dùng `HostOnboardingPage`.
Người dùng hoàn thiện tài khoản, hai mặt CCCD và form nhà trọ hiện có;
chỉ bước cuối mới gửi một request multipart đến `/api/host-onboarding`.
Hai mặt CCCD được dùng trực tiếp cho hồ sơ nhà trọ, không yêu cầu tải lại.

## Xét duyệt

- Một hồ sơ `PropertyRegistration.hostOnboarding=true` xuất hiện tại **Xác minh nhà trọ**.
  Staff xem thông tin tài khoản, ghi chú, vị trí, ảnh và cả hai mặt CCCD.
  Danh sách có nhãn **Chủ trọ & nhà trọ**. Trong chi tiết, mục **2. Đơn đăng ký làm
  Chủ trọ** hiển thị thông tin tài khoản, vai trò hiện tại, xác minh điện thoại,
  cam kết, ngày gửi, ghi chú và nút xem từng mặt CCCD. Đơn gộp không tạo một yêu cầu
  xét duyệt độc lập thứ hai tại **Xác minh đăng ký chủ trọ**.
- Bản `HostApplication` lưu thông tin tài khoản/ảnh ở trạng thái nội bộ `MERGED`,
  không xuất hiện trong hàng chờ hoặc số liệu xét duyệt chủ trọ riêng.
- **Duyệt chủ trọ & Nhà trọ** thực hiện trong cùng transaction: kiểm tra hồ sơ,
  chuyển tài khoản USER → ROOM_HOST, ghi nhận đơn chủ trọ APPROVED, tạo nhà trọ ACTIVE
  và ghi quyết định hồ sơ nhà trọ. Gửi lặp không tạo nhà trọ thứ hai.
- Yêu cầu bổ sung hoặc từ chối không cấp quyền và không tạo nhà trọ công khai.
  Người dùng mở lại `/become-host`, chọn **Bổ sung & gửi lại hồ sơ**;
  giữ dữ liệu/tài liệu cũ, chỉ các mục được yêu cầu mới được sửa khi cần bổ sung.
  Nhóm CCCD cho phép bổ sung từng mặt. Khi được duyệt, ảnh cập nhật trở thành nguồn
  dùng lại cho các nhà trọ tiếp theo.
- Giữ nguyên phân công và quyền xét duyệt hiện tại; không mở rộng quyền Admin/Staff.

## Đăng ký thêm nhà trọ

Chủ trọ vẫn dùng `/host/property/new` trong Host Portal, có thể gửi nhiều nhà trọ
khác nhau. Những hồ sơ này chỉ xét nhà trọ, không xin cấp quyền tài khoản lại.
Hồ sơ chủ trọ riêng đã tồn tại vẫn đọc/xét theo luồng cũ; nếu người dùng chuyển sang
luồng gộp, đơn đó được chuyển thành MERGED trong transaction nộp hồ sơ thành công.
API cũ được giữ tương thích; giao diện web mới không gửi đơn cấp quyền riêng.

## API và dữ liệu riêng tư

Chi tiết xác minh chỉ bổ sung `hostApplication` sau khi đã kiểm tra quyền đọc hồ sơ
nhà trọ của nhân viên; không trả byte ảnh hoặc khóa/đường dẫn công khai.
Hàng chờ mặc định mới gửi trước (`submittedAt`, nếu chưa gửi lại thì `createdAt`),
kể cả khi đặt lại bộ lọc. Tài liệu đính kèm cũng hiển thị lần tải lên mới nhất trước;
tài liệu chưa có thời điểm tải lên xếp sau các tài liệu có thời điểm xác định.

`/api/host-onboarding/current` chỉ trả hồ sơ của tài khoản đăng nhập.
`/{id}/edit`, `/{id}/resubmit`, `/photos/{id}` giới hạn đúng chủ sở hữu và hồ sơ gộp;
không cấp USER quyền truy cập các API quản lý trong `/api/host/**`.
Tra vị trí dùng `/api/host-onboarding/location/resolve`.
Ảnh CCCD không lưu vào localStorage/sessionStorage. Bản nháp nhà trọ chỉ lưu chữ;
ảnh và xác nhận phải chọn lại sau khi tải lại trang trước khi gửi.

Restart backend để Hibernate update thêm `host_onboarding` mặc định false.
Môi trường migration thủ công dùng `sql/host-onboarding.sql` một lần nếu cột chưa có.
Không tự chuyển trạng thái hoặc cấp quyền cho hồ sơ lịch sử khi restart.

## Cách kiểm tra

1. Đăng nhập USER → Đăng ký làm chủ trọ → thêm đủ hai mặt CCCD và tích xác nhận.
2. Tiếp tục điền nhà trọ, ảnh, giấy phép kinh doanh, PCCC; kiểm tra và gửi.
3. Mở lại trang: hồ sơ Chờ xét duyệt, tài khoản vẫn là Người thuê.
4. Staff → Xác minh nhà trọ → mở hồ sơ gộp → kiểm tra cả hai mặt CCCD.
5. Thử yêu cầu bổ sung: USER sửa mục được yêu cầu và gửi lại cùng hồ sơ.
6. Staff phê duyệt: USER bấm Cập nhật trạng thái → vào Host Portal xem nhà trọ.
7. Host Portal → Đăng ký nhà trọ: đăng ký thêm nhà trọ mà không xin cấp quyền lại.

Kiểm thử tự động dùng H2 và API/ảnh giả trên trình duyệt, không dùng hồ sơ thật
hoặc gửi SMS: `HostDashboardTests#onboarding*`,
`frontend/scripts/check-host-onboarding.cjs`.


## Hàng đợi thẩm định thống nhất (16/11/2026)

- Menu nhân viên dùng một mục **Xác minh nhà trọ** cho hồ sơ gộp và hồ sơ nhà trọ tiếp theo.
  Đường dẫn danh sách cũ /staff/host-registrations chuyển đến /staff/verifications;
  liên kết chi tiết hồ sơ chủ trọ lịch sử vẫn được giữ để tra cứu.
- Mặc định mở Chờ xác minh, sắp theo lần gửi gần nhất giảm dần (submittedAt,
  nếu chưa gửi bổ sung thì createdAt); có bộ lọc và tùy chọn cũ nhất trước.
- Trên tên nhà trọ chỉ hiển thị phân loại: Đăng ký mới, Cập nhật hoặc Đã bổ sung.
- Hồ sơ PENDING chờ **trên 48 giờ** có nhãn vàng cạnh thời gian gửi,
  kèm số ngày đã chờ. Mốc nhắc việc kế thừa màn xác minh chủ trọ cũ;
  không phải thao tác tự động từ chối/phê duyệt. Tính lại mỗi phút khi trang mở.
  Gửi bổ sung bắt đầu tính lại từ lần gửi gần nhất; NEEDS_SUPPLEMENT và hồ sơ
  đã xử lý không nhận cảnh báo chờ duyệt.
- Cột **Hành động** chỉ có **Thẩm định ngay** mở chi tiết. Phê duyệt, yêu cầu bổ sung,
  từ chối chỉ có trong chi tiết và vẫn tuân thủ quyền xử lý từ backend.
- Kiểm tra: mở danh sách, đối chiếu thời gian giảm dần, thử hồ sơ PENDING quá 48 giờ
  và hồ sơ vừa gửi bổ sung, sau đó dùng Thẩm định ngay để xem đơn chủ trọ,
  CCCD, nhà trọ và các quyết định. Không cần tạo hồ sơ thật cho kiểm thử tự động.
