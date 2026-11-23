# Rà soát tích hợp các nhánh vào main

Ngày 24/11/2026 · Nhánh rà soát `integration/safe-merge` · Mốc `origin/main` `077be80e24df15a22ff30ed9d8ef80dc111814bb`.

## Quan hệ giữa các nhánh

Đã fetch các nhánh từ GitHub và đối chiếu bằng `git merge-base --is-ancestor` và `git rev-list --left-right --count`. Sáu đầu nhánh đều là tổ tiên của mốc `main` nêu trên. Cột commit ngoài nhánh tích hợp đếm những commit của đầu nhánh chưa có trong `integration/final-merge`.

| Nhánh | Đầu nhánh | Backend, API và dữ liệu tiêu biểu | Frontend và chức năng tiêu biểu | Commit ngoài `integration/final-merge` | Tệp xung đột mới | Trạng thái |
| --- | --- | --- | --- | ---: | ---: | --- |
| `DungDT` | `f7bd2f6` | Danh mục, vùng phục vụ, hồ sơ dịch vụ, yêu cầu, đánh giá và khiếu nại | Danh sách và chi tiết dịch vụ, biểu mẫu nhà cung cấp, hàng chờ Staff | 0 | 0 | Đã có trong `main` |
| `DuongND` | `a13120d` | Báo cáo cộng đồng, bảo toàn chứng cứ, thông báo và hỗ trợ kiểm duyệt bằng AI | Feed, thông báo, nộp và xét duyệt báo cáo, liên kết màn hình liên quan | 2 | 0 | Đã có trong `main` |
| `MaiNTT` | `2d4bb9c` | Gợi ý phòng, tìm theo khoảng cách, xác nhận tình trạng phòng, điều hành tài khoản | Bản đồ tìm kiếm, thẻ ảnh loại phòng, trợ lý và console quản trị | 5 | 0 | Đã có trong `main` |
| `NingDD` | `825c978` | Onboarding chủ trọ, công khai phòng, hợp đồng, người thuê, điện nước và hóa đơn | Host Portal, app Expo cho người thuê/chủ trọ, header chung của khu vực người thuê | 18 | 0 | Đã có trong `main` |
| `VietNV` | `4aea39e` | OTP đăng ký, lịch xem phòng, thông báo, bài tổng hợp và API scraper | Xác minh OTP, lịch xem phòng, hộp thư thông báo và bài tổng hợp | 0 | 0 | Đã có trong `main` |
| `integration/final-merge` | `36c9b48` | Thông báo bổ sung hồ sơ dẫn về đúng luồng onboarding | Header chung Host/Staff, xét duyệt hồ sơ dịch vụ, lọc và sắp xếp danh sách dịch vụ | 0 | 0 | Đã có trong `main` |

`main` đã chứa merge `integration/final-merge` tại `fd3bbf3`, sau đó merge `NingDD` tại `077be80`. Nhánh `origin/DuongND-service-ui` cũng là tổ tiên của mốc này. Việc merge lại các đầu nhánh sẽ không mang thêm commit mới. Mốc gốc và các thay đổi đang lưu trên máy được giữ nguyên.

## Ranh giới tích hợp và thay đổi đề xuất

- Backend giữ các API quản lý phòng, hồ sơ chủ trọ, hợp đồng, lịch xem, xác thực, yêu thích, thông báo, dịch vụ và cộng đồng. Các test Spring kiểm tra đăng ký, quyền truy cập, công khai phòng, lịch xem, xét duyệt, tài liệu riêng tư và vận hành nhà trọ.
- Web giữ router theo vai trò, header người thuê, điều hướng Host/Staff, thông báo và API dịch vụ. Các test Edge dùng dữ liệu mô phỏng để kiểm tra 18 trang, thao tác bàn phím, nút yêu thích, hồ sơ dịch vụ của Staff và điều hướng Host.
- Mobile giữ điều hướng Expo, phiên đăng nhập, Google và OTP email, phòng yêu thích, đăng ký và vận hành nhà trọ. Kiểm tra bao gồm test TypeScript, typecheck và lint.
- Đợt rà soát này không có tệp merge conflict. Các lần tích hợp trước đã có lịch sử riêng tại [báo cáo tích hợp gốc](INTEGRATION_FINAL_MERGE.md). Hai điểm ghép quan trọng trên mốc đang rà soát là `PortalLayout.jsx` dùng header người thuê của `NingDD` cùng header Host/Staff của nhánh tích hợp, và `StaffService.java` dùng đường dẫn `/become-host` cho thông báo bổ sung hồ sơ onboarding.
- Browser tái hiện tràn ngang 9px ở trang chủ 320px. Khi thứ tự nạp CSS thay đổi, quy tắc hai cột của giao diện gốc có thể ghi đè quy tắc một cột trên mobile. Bản sửa tăng độ ưu tiên của quy tắc một cột đúng phạm vi trang chủ mobile. Header cũng giảm vừa đủ kích thước logo và chữ thương hiệu dưới 350px để không lấn nút thông báo.
- Thay đổi cần duyệt trong PR gồm hai tệp CSS trên và báo cáo này. Backend, API, schema và các chức năng khác dùng đúng mã của mốc rà soát.

## Cơ sở dữ liệu và cấu hình

- Maven chạy profile `test` với H2 ở chế độ tương thích MySQL. Cấu hình backend mặc định dùng Hibernate `ddl-auto=update`. Các script SQL được quản lý riêng.
- Đã chạy 4 migration trên một instance MySQL 8.0.46 riêng, bind loopback, database thử nghiệm rỗng. Dùng cấu trúc bảng hợp đồng trước khi có chữ ký cho ca nâng cấp, sau đó kiểm tra 6 bảng, 2 khóa ngoại và index duy nhất của mã ký hợp đồng. Đã tắt instance thử nghiệm.
- Các migration được kiểm tra động gồm `20261121_rental_contract_signatures.sql`, `20261121_room_tenancies.sql`, `20261121_room_utility_readings.sql` và `20261121_room_billing.sql`. `room_tenancies` phải được tạo trước bước thêm cột và khởi tạo hóa đơn.
- `sql/schema.sql` có lệnh `DROP TABLE` và chỉ định nghĩa 31 bảng, trong khi 53 entity khai báo tên bảng. Khi xét cả script SQL được lưu trong Git, 9 bảng entity vẫn chưa có câu lệnh `CREATE TABLE` tương ứng. Đây là khoảng lệch giữa schema tham chiếu và mô hình JPA, cần được xem xét riêng trước một đợt triển khai SQL thủ công.
- Chưa replay toàn bộ 17 migration trên một bản sao MySQL có dữ liệu hiện hữu. Không sử dụng `schema.sql` để kiểm thử và không kết nối hay thay đổi database đang sử dụng.

## Kiểm tra đã chạy

| Phạm vi | Kết quả |
| --- | --- |
| Spring Boot và Maven `verify` | Build JAR thành công. 1.028 test, 1.027 đạt, 0 thất bại, 1 bỏ qua vì cần cấu hình AI trực tiếp |
| Web Vite và Node | Build production đạt sau bản sửa. 291/291 test đạt |
| Web Edge với API mô phỏng | 18 trang, 10 độ rộng và mức phóng to 200% đạt sau bản sửa. 8/8 lần tải lại và đổi kích thước về 320px đạt, có kiểm tra logo, lưới một cột và menu |
| Expo | Typecheck và lint đạt. 174/174 test đạt |
| Scraper Python | 7/7 test offline đạt với các dependency của scraper |
| MySQL 8.0.46 riêng | 4/4 migration được chọn chạy thành công và cấu trúc bảng/khóa/index khớp |
| Git | Không có conflict mới và `git diff --check` đạt |

Hạn chế xác minh gồm Google, SMTP/Zalo, AI, Facebook, dữ liệu MySQL triển khai thực tế và bản build native trên thiết bị. Các ca kiểm thử browser, scraper và provider dùng dữ liệu mô phỏng. Vite vẫn cảnh báo một số bundle vượt ngưỡng 500 kB.

`main` giữ nguyên ở mốc rà soát trong quá trình thực hiện. PR ở trạng thái draft để chủ dự án xem lại phạm vi thay đổi.
