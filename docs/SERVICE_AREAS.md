# Khu vực phục vụ chuẩn và tự nhập — 2026-11-14

Giữ nguyên endpoint và multipart contract. Mở rộng JSON `details` của đăng ký, bổ sung và đề nghị UPDATE:

```json
{
  "serviceArea": "Tân Xã, Thạch Hòa",
  "customServiceAreas": "Yên Bình, Phú Cát",
  "otherAreasEnabled": true
}
```

- `serviceArea`: chuỗi khu vực chuẩn; được để trống nếu có khu vực tự nhập hợp lệ.
- `customServiceAreas`: trường mới, tùy chọn; chuỗi các mục ngăn cách bằng dấu phẩy.
- `otherAreasEnabled`: cờ tùy chọn trong request, giúp backend từ chối trường hợp bật Khu vực khác nhưng để trống. Không cần lưu cờ này: form đọc lại dựa vào nội dung đã lưu.
- Mỗi mục tự nhập có 2–100 ký tự sau chuẩn hóa; tối đa 5 mục khác nhau, không phân biệt hoa thường. Trim, gộp khoảng trắng, loại trùng; chuẩn hóa Unicode NFC và viết hoa đầu mỗi từ của khu vực tự nhập (ví dụ `cỔ đông` → `Cổ Đông`). Khu vực chuẩn giữ tên quy định. UI áp dụng cùng định dạng cho dữ liệu cũ mà không sửa trực tiếp database. Mục trùng khu vực chuẩn được đưa về phần chuẩn, tránh hiển thị hai lần.
- `serviceArea: "Tất cả các khu vực"` không được đi kèm khu vực khác hoặc `otherAreasEnabled: true`. Frontend bỏ chọn và disable các ô còn lại; bỏ chọn Tất cả mở lại các ô, không khôi phục nội dung đã xóa.
- Bốn khu vực chuẩn hiện tại: Tân Xã, Thạch Hòa, Bình Yên, Khu Công nghệ cao Hòa Lạc. Hằng số tương ứng nằm trong ServiceAreaPolicy và property-registration.js.

## Lưu trữ và duyệt

Thêm `custom_service_areas VARCHAR(600) NULL` vào `service_registrations` và `services`. Hồ sơ chờ duyệt có khu vực riêng; nhân viên xem cả hai trường trong đối chiếu. Chỉ khi duyệt, cả hai trường mới được sao chép sang bản dịch vụ công khai. Từ chối không đổi snapshot đang công khai; đề nghị DELETE sao chép đầy đủ dữ liệu gốc.

Response hồ sơ, danh sách dịch vụ của tôi, public list/detail và snapshot đối chiếu đều thêm `customServiceAreas`. Form cập nhật/bổ sung đọc lại hai phần. API cũ gửi chuỗi tự do trong `serviceArea` vẫn được nhận: backend tự phân loại giá trị ngoài danh sách chuẩn sang trường mới và áp dụng validation tương ứng.

Migration [20261114_service_custom_areas.sql](../sql/migrations/20261114_service_custom_areas.sql) kiểm tra cột trước khi thêm, có thể chạy lại. Chưa áp dụng vào database thật. Chạy migration trước khi triển khai backend mới. Không sửa dữ liệu lịch sử trong migration; UI nhận diện khu vực cũ ngoài danh sách chuẩn khi mở form, lần gửi tiếp theo lưu tách riêng. Hồ sơ cũ vượt giới hạn mới cần được người dùng chỉnh lại khi gửi.

## Hiển thị và tìm kiếm

Thẻ, chi tiết, liên hệ và hồ sơ hiển thị danh sách gộp chuẩn + tự nhập, đã loại trùng. Dropdown khu vực lấy từ dữ liệu dịch vụ công khai, gộp cả khu vực chuẩn và tự nhập, loại trùng và sắp xếp theo tên. Khu vực trong hồ sơ chờ duyệt chưa xuất hiện trong bộ lọc public. Ô từ khóa tìm trên tên dịch vụ, nhà cung cấp và cả hai phần khu vực, hỗ trợ tìm không dấu. Dịch vụ chọn Tất cả khớp mọi bộ lọc khu vực.

## File backend đã sửa

- [ServiceRegistrationRequest.java](../src/main/java/org/hlrcs/dto/request/ServiceRegistrationRequest.java): thêm hai trường request tùy chọn.
- [Service.java](../src/main/java/org/hlrcs/entity/Service.java): cột snapshot công khai.
- [ServiceRegistration.java](../src/main/java/org/hlrcs/entity/ServiceRegistration.java): cột hồ sơ/proposal.
- [ServiceAreaPolicy.java](../src/main/java/org/hlrcs/service/ServiceAreaPolicy.java): chuẩn hóa, loại trùng, validation dùng chung (mới).
- [ServiceRegistrationService.java](../src/main/java/org/hlrcs/service/ServiceRegistrationService.java): create/update/resubmit/delete-copy, DTO hồ sơ.
- [ServiceReviewService.java](../src/main/java/org/hlrcs/service/ServiceReviewService.java): snapshot đối chiếu và áp dụng dữ liệu khi duyệt, chấp nhận dịch vụ chỉ có khu vực tự nhập.
- [PublicServiceController.java](../src/main/java/org/hlrcs/controller/PublicServiceController.java): trường response public.
- [20261114_service_custom_areas.sql](../sql/migrations/20261114_service_custom_areas.sql): migration hai bảng.

## File frontend đã sửa

- `components/ServiceAreaSelect.jsx`, `components/ServiceRegistrationModal.jsx`
- `components/ServicesCatalog.jsx`, `pages/staff/StaffServiceApplicationsPage.jsx`
- `services/service-areas.js` (mới), `services/service-registration.js`, `services/service-catalog.js`
- `styles/service-registration-form.css`

## Kiểm tra thực hiện

Frontend production build và backend Maven clean compile thành công. Không chạy test hoặc migration trên database, theo phạm vi yêu cầu. Không thay đổi cấu hình kết nối database.
