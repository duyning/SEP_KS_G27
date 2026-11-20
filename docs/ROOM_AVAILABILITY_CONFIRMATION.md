# Xác nhận độ mới thông tin phòng trống — N01–N04

Triển khai 11/11/2026 trên backend Spring Boot và frontend React. Không thay prototype giao_dien hoặc mobile.

## Hợp đồng

RoomType lưu `availabilityConfirmedAt` (Instant, UTC, độ chính xác microsecond) và quan hệ `availabilityConfirmedBy` tới User. Dữ liệu cũ để null; không backfill bằng ngày tạo/cập nhật hay mốc của một Room. Người xác nhận lấy từ phiên đăng nhập, không nhận ID hoặc ngày do client gửi. Không công khai người xác nhận.

HostRoomTypesResponse.RoomTypeSummary, AccommodationSummary (Search/detail/similar/favorites/comparison sử dụng cùng summary) và PublicPropertyService.Type (Home/API public cũ) thêm:

| Trường | Ý nghĩa |
| --- | --- |
| availabilityConfirmedAt | ISO-8601 UTC hoặc null |
| availabilityConfirmationStatus | UNCONFIRMED, CURRENT, STALE |
| availabilityStale | true chỉ khi STALE; không đại diện cho UNCONFIRMED |

`vacantRooms` ở host/public property và `availableRooms` ở accommodation vẫn lấy từ Room, không lưu snapshot count. Không tự đổi số phòng thành 0 khi thông tin quá hạn, không ẩn nhà trọ hoặc chặn lịch xem chỉ vì quá hạn.

- UNCONFIRMED: null hoặc timestamp bất thường nằm trong tương lai.
- CURRENT: từ thời điểm xác nhận tới đúng 7 × 24 giờ.
- STALE: lớn hơn 7 × 24 giờ; backend tính bằng Instant, không phụ thuộc timezone máy.
- UI định dạng thời gian Việt Nam (Asia/Ho_Chi_Minh). Tải lại/refetch nhận trạng thái theo đồng hồ server; không có timer cập nhật khi giữ trang mở vô hạn.

Ví dụ fixture với `now=2026-11-11T13:00:00Z`: null → UNCONFIRMED; `2026-11-10T13:00:00Z` → CURRENT; `2026-11-04T13:00:00Z` → CURRENT đúng biên; `2026-11-03T13:00:00Z` → STALE. Số phòng trống có thể bằng 0 trong mọi trạng thái.

## API ghi

`POST /api/host/room-types/{id}/availability-confirmation`, không cần body. Bearer authentication, vai trò ROOM_HOST/ADMIN và vẫn bắt buộc sở hữu loại phòng. Nhà trọ ACTIVE và registration APPROVED; phải có ít nhất một Room. Loại phòng hết phòng trống nhưng có phòng thực tế vẫn được xác nhận.

Response là ApiResponse chứa RoomTypeSummary đã cập nhật, bao gồm tổng phòng và số trống hiện tại. Owner lock giống các thao tác ghi danh sách phòng, toàn bộ xác nhận trong một transaction. Không sửa trạng thái từng phòng. Lặp request không tạo bản ghi phụ, chỉ làm mới mốc. Không nhận số lượng, người xác nhận, timestamp từ client.

Xác nhận toàn loại cập nhật đồng thời `Room.confirmedAt` của TẤT CẢ phòng thuộc
loại đó (cả VACANT và OCCUPIED), cùng một thời điểm với RoomType, chuyển UTC sang
giờ Việt Nam cho trường Room legacy. Vì vậy khung “Xác nhận gần nhất” của từng
phòng cũng được làm mới và hết cảnh báo cũ sau khi tải lại. Không tác động phòng
thuộc loại khác. Tất cả thay đổi lưu cùng giao dịch. Các lần xác nhận toàn loại
trước bản sửa này cần bấm xác nhận lại một lần để đồng bộ mốc từng phòng.

Lỗi: chưa đăng nhập/sai vai trò bị chặn; không sở hữu hoặc không tồn tại → 404; nhà trọ không hợp lệ → 409; chưa có phòng thực tế → 400. Frontend giữ mốc cũ khi lỗi và cho thử lại. Refresh sau thành công đọc dữ liệu đã lưu.

## Khi danh sách phòng thay đổi

- Tạo Room, đổi VACANT/OCCUPIED, chuyển RoomType hoặc xóa Room: vô hiệu xác nhận toàn loại (đặt hai trường về null). Chuyển loại vô hiệu cả loại cũ và mới.
- Lưu Room vẫn giữ cơ chế confirmedAt từng phòng của project. Mốc này KHÔNG tự xác nhận tất cả phòng của RoomType.
- Đổi giá, mô tả, tên/tầng khi không thay trạng thái hoặc loại: không làm mới/vô hiệu mốc toàn loại.
- Tạo loại phòng kèm danh sách phòng: ban đầu UNCONFIRMED; chủ trọ kiểm tra rồi bấm xác nhận.

N02 trong tracking nhắc ghi mốc khi đổi trạng thái phòng: đã giữ ghi nhận ở Room.confirmedAt; mốc toàn loại chỉ ghi khi xác nhận toàn bộ. Đây là quy tắc tránh lấy việc sửa một phòng làm bằng chứng kiểm tra tất cả phòng.

## Tự xem trên hệ thống

1. Dừng lần chạy cũ trong IntelliJ; chọn HL-RCS Full Stack và Run lại để backend nạp code/schema mới. Mở frontend http://127.0.0.1:5173.
2. Đăng nhập chủ trọ có nhà trọ ACTIVE, đã duyệt và loại phòng có phòng thực tế.
3. Mở `/host/room-types`, chọn đúng nhà trọ. Dữ liệu cũ hiện “Chưa xác nhận tình trạng phòng trống”. Cả dạng thẻ và bảng đều có thao tác xác nhận.
4. Bấm “Xác nhận tình trạng phòng”. Modal hiển thị tổng phòng/số phòng trống và liên kết “Kiểm tra danh sách phòng”. Kiểm tra đúng rồi bấm “Thông tin hiện tại chính xác”.
5. Thấy thông báo thành công và ngày giờ xác nhận. F5 vẫn thấy mốc đã lưu. Số phòng trống không đổi vì xác nhận không đổi trạng thái phòng.
   Mở “Quản lý phòng” và xem một phòng bất kỳ thuộc loại vừa xác nhận: “Xác nhận gần nhất” phải cùng mốc mới, không còn cảnh báo 25/10. Phòng thuộc loại khác giữ nguyên mốc của nó.
6. Mở cửa sổ khách/ẩn danh, tìm loại phòng trên `/search`, mở chi tiết. Thấy “Đã xác nhận…”; Home hiển thị mốc của loại phòng được chọn trên card, có tên loại phòng để tránh nhầm với toàn nhà trọ.
7. Trở lại host, vào `/host/rooms`, đổi một phòng Trống → Đang thuê. Quay lại/tải lại loại phòng: số trống giảm và trở về Chưa xác nhận. Xác nhận lại, Search/detail sau tải lại thấy số và mốc mới.
8. Thử loại phòng có tất cả phòng đang thuê: vẫn được xác nhận, khách vẫn thấy “Hết phòng” và mốc mới. Loại chưa tạo Room thì nút bị khóa, có giải thích.

### Xem cảnh báo quá 7 ngày mà không chờ một tuần

Chỉ thực hiện trên database phát triển/test, chọn đúng ID loại phòng của bạn. Đầu tiên xác nhận một lần qua UI để có người xác nhận hợp lệ, sau đó dùng MySQL client:

```sql
SELECT room_type_id, room_type, availability_confirmed_at
FROM room_types WHERE room_type_id = 12;

-- Thay 12 bằng ID vừa kiểm tra. Chỉ thay mốc của đúng loại phòng này.
UPDATE room_types
SET availability_confirmed_at = UTC_TIMESTAMP(6) - INTERVAL 8 DAY
WHERE room_type_id = 12 AND availability_confirmed_by IS NOT NULL;
```

Tải lại trang host và Search/chi tiết: hiện “Quá 7 ngày chưa xác nhận”, số phòng trống giữ nguyên. Bấm xác nhận lại ở host để khôi phục mốc hiện tại; tải lại trang khách sẽ hết cảnh báo. Không có API công khai cho phép giả lập thời gian. Không có dữ liệu MySQL nào được đổi ngày tự động trong quá trình triển khai này.

## Schema và kiểm thử

### Bổ sung cảnh báo phòng riêng lẻ

Khung chi tiết `/host/rooms` cũng hiển thị cảnh báo cạnh “Xác nhận gần nhất” của
từng Room. DTO RoomSummary thêm `confirmationStatus`/`confirmationStale`, dùng
cùng mốc 7 ngày; datetime Room cũ được hiểu theo giờ Việt Nam. Nếu backend chưa
restart, UI vẫn có fallback cho confirmedAt legacy. Phòng quá hạn có thể bấm
lại lựa chọn trạng thái hiện tại để xác nhận mà không phải đổi sang trạng thái khác.
Xác nhận một Room không làm mới mốc của toàn RoomType. Đây là cảnh báo trong
giao diện, không tự tạo thông báo ở biểu tượng chuông.

Schema development dùng ddl-auto=update sẽ thêm hai cột nullable và FK. Có script MySQL bổ sung/chạy lại an toàn ở `sql/migrations/20261111_room_type_availability.sql` cho môi trường quản lý schema thủ công; không cần chạy thêm nếu Hibernate đã cập nhật. Không xóa dữ liệu cũ.

- Backend: AvailabilityFreshnessTests kiểm tra null/tương lai/trước/đúng/sau 7 ngày; AvailabilityConfirmationTests dùng H2 cô lập kiểm tra auth, ownership, property state, inventory rỗng/hết phòng, giữ trạng thái Room, persist và public result, thay giá không làm mới mốc, đổi trạng thái vô hiệu xác nhận.
- Frontend: availability.test.js kiểm tra nhãn, múi giờ và hợp đồng POST/lỗi.
- Browser: `frontend/scripts/check-availability-confirmation.cjs`; API fixture cô lập, không ghi MySQL. Vite kiểm thử mặc định cổng 5187; PLAYWRIGHT_MODULE trỏ Playwright nếu cần. Ảnh/kết quả trong target/availability-browser.
- Luồng tái xác minh nhà trọ N05–N10 không thuộc thay đổi này.

## Kết quả kiểm chứng 11/11/2026

- 71 backend tests qua: AvailabilityConfirmationTests (6), AvailabilityFreshnessTests (1), AccommodationTests (12), HostDashboardTests (46), FavoriteTests (6), H2 riêng và HTTP random port.
- 33 frontend tests liên quan qua; production Vite build qua.
- Browser Edge headless/API fixtures: host 375/768/1024/1440px, modal bàn phím/Escape/trả focus, kiểm tra zoom 200%, dạng bảng, lỗi/thử lại, ngăn gửi lặp, reload, STALE; Search khách ở bốn chiều rộng, chi tiết và Home hiển thị cảnh báo. Đã xem ảnh mobile/desktop của phần thay đổi.
- Bộ frontend toàn dự án có 4 lỗi có sẵn ở host-logout.test.js/routing.test.js. Đã chạy lại đúng hai file trên bản HEAD trước thay đổi (archive đọc riêng trong target) và tái hiện cùng 4 lỗi; không sửa các lỗi ngoài phạm vi này.
- Kiểm tra public với phiên host ở 375px còn thấy header cũ tràn ngang do nút “Bảng điều khiển”; public với phiên khách không tràn. Header không bị sửa trong task này.
- Chưa chạy script migration trên MySQL thật; không cập nhật mốc xác nhận hay dữ liệu tài khoản của MySQL trong lượt triển khai. Các kiểm tra ghi dữ liệu dùng H2 hoặc browser fixture. Thao tác khởi động lại và xem dữ liệu thật thực hiện theo hướng dẫn ở trên.
