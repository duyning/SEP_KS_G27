# HL-RCS
Platform Connecting the Rental Community and Supporting Services in Hoa Lac

HL_RCS connects renters, room hosts, and supporting service providers in Hoa Lac.

## Project Overview

Technology direction: React and Android frontend; Java/Spring Boot backend; MySQL and Firebase;
Google OAuth 2.0, Google Maps and Gemini API integrations; AWS deployment.
The implementation and local run instructions below describe the currently available code.

Clone this repository with `git clone https://github.com/duyning/SEP_KS_G27.git`.
Configure database credentials and API keys before running. Never commit passwords, API keys or private credentials.

## Development Team

FPT University - SEP490-G27

| Member | Role |
| --- | --- |
| Nguyen Thi Thanh Mai | Leader |
| Nguyen Van Viet | Tech Leader |
| Do Thi Dung | Member |
| Nguyen Dinh Duong | Member |
| Dao Duy Ninh | Member |

Lecturer: Chu Thi Minh Hue

## Cap nhat React

Frontend hien tai da chuyen sang React/Vite trong frontend/.
Giao dien HTML cu trong src/main/resources/static da duoc xoa.
Backend cung cap REST API, cac URL giao dien cu chuyen huong sang http://localhost:5173.
Trong IntelliJ, chon cau hinh **HL-RCS Full Stack**, bam Run, sau do mo http://127.0.0.1:5173/login.
Xem frontend/README.md de biet cau truc va cach build React.

## Chay ca project trong IntelliJ

Mo thu muc co `pom.xml` nay nhu Maven project. Trong danh sach Run/Debug,
chon **HL-RCS Full Stack** roi bam Run (Shift+F10). Cau hinh cung duoc cung cap
o thu muc cha neu ban dang mo `Code/HL-RCS` trong IntelliJ.

- Spring Boot ket noi MySQL va chay API tren cong 8080.
- Sau khi backend khoi dong thanh cong, React/Vite tu khoi dong tren cong 5173.
- Mo http://127.0.0.1:5173/login; sua React se cap nhat ngay.
- Bam Stop de dung ca hai. Neu frontend loi, backend cung dung va console hien nguyen nhan.

Can MySQL dang chay va Node.js 22.12+ (hoac 20.19+). Launcher tim Node trong
NODE_HOME, PATH, bo runtime Codex co san tren may, hoac Program Files/nodejs.
Neu thieu frontend dependencies, launcher tu chay pnpm/npm install; lan dau can Internet.
Khong can goi run-frontend.cmd hay cai plugin Node.js cho IntelliJ.

Cau hinh nay bat `-Dhlrcs.frontend.enabled=true` tren main class
`org.hlrcs.HlRcsApplication`. Chay main class bang cau hinh cu chi khoi dong backend;
hay chon **HL-RCS Full Stack** mot lan trong dropdown. Ban build JAR va test
khong tu khoi dong Vite. Neu cong 5173 dang bi chiem, dung frontend cu truoc khi Run.

## Cau truc hien tai

Day la ung dung Java 17+ / Spring Boot 4.1.1, build bang Maven Wrapper.
Frontend la React/Vite chay tren cong 5173 va goi REST API Spring Boot tren cong 8080.

```text
src/main/java/org/hlrcs/
  configuration/  Spring Security, MVC va tai khoan demo
  controller/     REST API
  dto/            Request va response
  entity/         JPA entities
  repository/     Spring Data JPA
  security/       JWT va phan quyen
  service/        Xu ly nghiep vu
frontend/        React app: pages, components, context, services va styles
src/main/resources/application.properties
src/test/         Kiem thu HTTP voi database H2 rieng
sql/schema.sql   Schema MySQL tham khao; khong tu dong import
```

## Chay nhanh tren Windows

Tu thu muc KS_G27:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Code\HL-RCS\start.ps1
```

Mo terminal thu hai va chay:

```powershell
.\Code\HL-RCS\run-frontend.cmd
```

Mo http://localhost:5173/login. Dung Ctrl+C trong tung terminal de dung server.
Neu cong 8080 dang duoc su dung, them `-Port 8081`.
Script tu tim JDK tu JAVA_HOME hoac thu muc cai Java thong dung va su dung Maven Wrapper.
Lan build dau can Internet de tai cac thu vien Maven.

Khong dung Live Server hoac mo HTML truc tiep: cac trang can REST API cua Spring Boot.

Che do mac dinh `mysql` ket noi MySQL localhost:3306/hlrcs.
Can khoi dong MySQL va tao database hlrcs truoc khi chay ung dung.
Chi co mot file cau hinh chay ung dung: src/main/resources/application.properties.
H2 chi dung trong kiem thu tu dong, khong duoc dong goi vao ung dung chay that.
File du lieu H2 cu trong data/ duoc giu nguyen, khong tu dong chuyen sang MySQL.

## Tai khoan demo

| Vai tro | Email | Mat khau |
| --- | --- | --- |
| Admin | admin@hlrcs.com | admin123 |
| Staff | staff@hlrcs.com | 123456 |
| Chu tro | host@hlrcs.com | 123456 |
| Nguoi thue | user@hlrcs.com | 123456 |

DataInitializer chi tao tai khoan khi email chua ton tai, khong dat lai mat khau tai khoan cu.
Tai khoan demo nay rieng voi cac tai khoan trong giao dien prototype `Code/html/`.

## Dung MySQL

Ket noi MySQL: localhost:3306/hlrcs, user root.
`application.properties` doc `DB_USERNAME` (mac dinh `root`), `DB_PASSWORD` va `APP_JWT_SECRET` tu bien moi truong.
JWT secret can toi thieu 32 byte va khong duoc dua len GitHub.
Khi phat trien tren may, co the dat cac gia tri trong `config/mysql-local.properties` (duoc Git bo qua):

```properties
DB_PASSWORD=YOUR_MYSQL_PASSWORD
APP_JWT_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_BYTES
```

Bien moi truong co do uu tien cao hon file cuc bo. Gia tri tren may hien tai duoc giu trong file rieng, khong commit.
Khoi dong MySQL va tao database hlrcs neu chua co.
Chay tu thu muc KS_G27:

```powershell
.\Code\HL-RCS\run.cmd -Profile mysql
```

Trong IntelliJ, co the chon cau hinh `HL-RCS MySQL (Maven)`.
Tat ca cau hinh Run ung dung deu ket noi MySQL; H2 chi con trong test.
Neu thong tin MySQL tren may khac, sua cac dong spring.datasource trong application.properties.
File `config/mysql-local.properties` la tuy chon va chi dung tren may; khong commit file nay.
User MySQL can quyen truy cap va cap nhat cac bang trong database hlrcs.
Ket noi thanh cong hay khong phu thuoc thong tin tai khoan MySQL tren may.

## Đăng ký cung cấp dịch vụ

Khởi động MySQL (database `hlrcs`), chạy backend bằng `./mvnw.cmd spring-boot:run`.
Trong thư mục `frontend`, chạy `npm install` (lần đầu) và `npm run dev`.
Đăng nhập bằng tài khoản người dùng, mở `/services` và chọn **Đăng ký cung cấp dịch vụ**.
Nhập người đăng ký, danh mục, thông tin dịch vụ đầu tiên, loại giá/số tiền, khu vực,
liên hệ và từ 1–5 tài liệu PDF/JPG/PNG/WEBP (tối đa 10 MB/tệp).

Hồ sơ và tệp được lưu trong database với trạng thái `PENDING`; chưa tạo dịch vụ công khai
và chưa cấp capability `MANAGE_SERVICE`. Mở lại form để xem trạng thái, phản hồi và tải
tài liệu của chính mình. Trước khi có capability, mỗi người có một hồ sơ onboarding đang xử lý.
Sau khi được cấp Service Owner ACTIVE, có thể thêm nhiều dịch vụ và dùng **Dịch vụ của tôi**
để gửi cập nhật/xóa cho Staff duyệt. Xem docs/SERVICE_MANAGEMENT.md. Hồ sơ bị từ chối được đăng ký lại.
Danh mục mặc định được tạo khi backend khởi động; Hibernate `ddl-auto=update` thêm các cột mới.
Danh sách `/services` và `/services/detail?id=...` đọc dữ liệu thực tế đã được duyệt.

API yêu cầu JWT, không yêu cầu sẵn capability cung cấp dịch vụ:

- `GET /api/service-registrations/categories`: danh mục thực tế.
- `GET /api/service-registrations/current`: khả năng đăng ký và hồ sơ mới nhất của người đăng nhập.
- `POST /api/service-registrations`: multipart gồm `details` (JSON) và `documents` (tệp lặp lại); trả HTTP 201.
- `GET /api/service-registrations/documents/{id}`: tải tài liệu, chỉ người nộp hồ sơ được truy cập.

`details` gồm `applicantName`, `categoryId`, `serviceName`, `description`, `pricingType`
(`FIXED`, `FROM`, `NEGOTIABLE`), `price`, `serviceArea`, `contactPhone`, `contactEmail`.
Giá `FIXED`/`FROM` phải lớn hơn 0; `NEGOTIABLE` phải gửi `price: null`.
Danh tính người nộp được lấy từ JWT. Các yêu cầu gửi đồng thời được khóa theo người nộp
để tránh hồ sơ trùng; tệp không hợp lệ làm rollback toàn bộ hồ sơ.

Kiểm thử riêng: `./mvnw.cmd -Dtest=ServiceRegistrationTests test` và trong `frontend`, `npm test`.

### Xét duyệt và công khai dịch vụ

1. Đăng nhập Staff hoặc Admin, mở **Hồ sơ dịch vụ** tại `/staff/service-applications`.
2. Mọi Staff và Admin được xem danh sách, chi tiết, tài liệu và duyệt hồ sơ chờ xử lý, không cần phân công.
3. Xem thông tin, tải tài liệu và chọn riêng quyết định capability / nội dung. Nhập lý do 10–2000 ký tự cho mọi kết quả.
4. Lưu quyết định. Thời gian, người xử lý, hai quyết định, lý do và nhật ký được lưu cùng giao dịch.

`APPROVE/APPROVE` cấp hoặc kích hoạt `MANAGE_SERVICE`, tạo một dịch vụ `ACTIVE` và công khai.
`APPROVE/REJECT` cấp capability, không công khai dịch vụ đầu tiên.
`REJECT/REJECT` từ chối hồ sơ, không cấp quyền và không tạo dịch vụ.
`REJECT/APPROVE` không hợp lệ. Hồ sơ đã xử lý không được duyệt lại.
Admin kế thừa đầy đủ quyền xét duyệt dịch vụ của Staff; người nộp không được tự duyệt hồ sơ của mình.
Service Owner là capability `MANAGE_SERVICE` ở bảng `user_capabilities`, không phải role mới.
Các role USER/ROOM_HOST/STAFF/ADMIN được giữ nguyên khi cấp quyền và không tự có quyền cung cấp dịch vụ chỉ từ role.
Khóa hồ sơ và tài khoản người đăng ký tránh cấp quyền/tạo dịch vụ trùng khi duyệt đồng thời.
Người nộp mở lại form đăng ký hoặc bấm **Cập nhật kết quả hồ sơ** để xem quyết định, lý do, thời gian,
`providerId`, `serviceId`, `capabilityActive`, `serviceState` và `publicEligible`.
`providerId` là ID tài khoản người cung cấp; `serviceId` là ID dịch vụ được tạo sau khi cả hai quyết định được duyệt.
API công khai tiếp tục kiểm tra capability hoạt động,
tài khoản hoạt động và cả hai quyết định duyệt trước khi trả nội dung; không trả tài liệu xác minh.

Các API xét duyệt (JWT STAFF hoặc ADMIN):

- `GET /api/staff/service-applications`: Staff và Admin xem tất cả hồ sơ dịch vụ.
- `GET /api/staff/service-applications/{id}`: hồ sơ, tài liệu và lịch sử.
- `POST /api/staff/service-applications/{id}/review`: JSON `{ "capabilityDecision": "APPROVE", "listingDecision": "APPROVE", "reason": "Thông tin đã được xác minh đầy đủ." }`.
- `GET /api/staff/service-applications/{id}/files/{fileId}`: tài liệu của hồ sơ có quyền truy cập.
- `GET /api/services/categories`: danh mục từ database, gồm cả danh mục chưa có dịch vụ công khai.
- `GET /api/services?categoryId=123`: lọc danh mục tại database; bỏ `categoryId` để lấy tất cả.
- `GET /api/services/{id}`: chi tiết công khai và liên hệ, không cần đăng nhập.

Danh sách và chi tiết trả `pricingLabel` (giá cố định / giá từ / thỏa thuận), `providerId`, `activeState`,
`publicEligible`, điện thoại và email liên hệ. Giao diện dùng liên kết gọi điện/gửi email thực tế,
không giả lập đặt dịch vụ. Dịch vụ, người cung cấp hoặc capability ngừng hoạt động sẽ không còn xuất hiện
trên cả danh sách lẫn đường dẫn chi tiết trực tiếp. Các cột phân công cũ được giữ lại để bảo toàn dữ liệu,
không còn dùng để chặn quyền xem hay duyệt hồ sơ dịch vụ.

## Build va kiem thu

Tu thu muc chua pom.xml:

```powershell
.\mvnw.cmd verify
```

Neu JAVA_HOME chua hop le, dat bien nay den thu muc JDK 17+ truoc khi chay Maven.
Test su dung H2 in-memory va cong HTTP ngau nhien, khong truy cap MySQL hay du lieu local.

## Pham vi da co

API dang ky, dang nhap, JWT, ho so, doi mat khau, dang xuat va endpoint kiem tra vai tro.
Cac entity nghiep vu da co, nhung project chua cung cap API/CRUD day du cho nha tro,
phong, kiem duyet va dashboard Admin nhu giao dien prototype o `Code/html/`.
