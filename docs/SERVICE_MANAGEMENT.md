# Quản lý nhiều dịch vụ, ảnh và duyệt thay đổi

## Chủ dịch vụ gỡ trực tiếp (2026-11-26)

Web dùng `POST /api/service-registrations/services/{id}/remove` với `{revision}`:
xác nhận một lần, không nhập lý do, không tạo hồ sơ DELETE chờ duyệt.
Backend khóa tài khoản, kiểm tra chủ sở hữu, phiên bản, hồ sơ gốc và hồ sơ thay đổi đang xử lý; endpoint gỡ trực tiếp không yêu cầu MANAGE_SERVICE còn ACTIVE;
chuyển Service sang DELETED và tăng revision trong cùng transaction với ModerationLog
OWNER_REMOVED (người thao tác, thời điểm, trạng thái trước/sau). Không xóa bản ghi,
ảnh, tài liệu, đánh giá hay yêu cầu đã có; không thu hồi capability.
Dịch vụ đã gỡ được ẩn khỏi danh sách thẻ dịch vụ của chủ sở hữu; hồ sơ và lịch sử vẫn được giữ lại,
không công khai và không nhận yêu cầu mới. Luồng DELETE chờ duyệt cũ vẫn được giữ
để tương thích hồ sơ/API cũ; mô tả luồng xóa chờ duyệt bên dưới là luồng cũ.

## Hủy hồ sơ chờ duyệt (2026-11-14)

Chủ hồ sơ được hủy hồ sơ CREATE/UPDATE/DELETE khi trạng thái còn PENDING qua
`POST /api/service-registrations/{id}/cancel` với `{revision}`. Backend khóa hồ sơ
rồi khóa tài khoản như luồng duyệt, kiểm tra ownership và revision; hồ sơ đã xử lý
hoặc phiên bản cũ trả 409. Hủy chuyển sang CANCELLED, tăng revision, ghi lịch sử;
không xóa tài liệu, không sửa capability hoặc snapshot công khai. Hồ sơ đã hủy
không chặn gửi mới. UI chủ hồ sơ có xác nhận hủy; Staff có bộ lọc Đã hủy.
Migration MySQL: `sql/migrations/20261114_service_registration_cancellation.sql`
bổ sung giá trị CANCELLED cho cột ENUM nếu có; VARCHAR không cần đổi.

Cập nhật 2026-11-08. Luồng này mở rộng service; không thay luồng host/property hoặc phân công Staff.

## Người dùng

- `/services`: toolbar tìm kiếm tên dịch vụ/nhà cung cấp (không phân biệt dấu), lọc kết hợp danh mục và khu vực lấy từ dữ liệu công khai; query q/category/area giữ trên URL, có chip bỏ từng điều kiện và xóa toàn bộ. Frontend lọc trên toàn bộ danh sách được API public trả về, không thay điều kiện eligibility. Card dùng ảnh 16:9, mô tả 2 dòng, tiêu đề 2 dòng, metadata có icon, giá/nút căn đáy; CSS giới hạn trong danh sách công khai. Grid 3 card/hàng trên màn hình trên 1000 px, 2 card trên tablet và 1 trên mobile. Mỗi card có ảnh, danh mục, mô tả, khu vực, giá và nút **Xem chi tiết**, **Liên hệ**. Liên hệ mở thông tin nhà cung cấp với nút gọi điện/gửi email.
- Hồ sơ cần bổ sung hiển thị yêu cầu và nhân viên xét duyệt ở đầu modal. Mô tả/ghi chú dài mặc định rút gọn, có Xem thêm/Thu gọn; nội dung ô chỉnh sửa giữ đầy đủ. Người đăng nhập mở **Dịch vụ của tôi** để xem các dịch vụ đã duyệt và toàn bộ hồ sơ/yêu cầu, kể cả bị từ chối hoặc cần bổ sung.
- Sau onboarding và được cấp MANAGE_SERVICE ACTIVE, một người dùng có thể gửi thêm nhiều dịch vụ. Trước khi được cấp quyền, vẫn chỉ một hồ sơ onboarding đang xử lý. Tránh trùng tên trong dịch vụ còn hoạt động và yêu cầu chưa xử lý của cùng người cung cấp.
- Thêm dịch vụ có thông tin và 1–5 ảnh bắt buộc; tài liệu xác minh là tùy chọn (tối đa 5 tệp nếu gửi qua API). Sửa dịch vụ dùng cùng form thông tin, có thể thay ảnh; backend sao chép tài liệu gốc sang hồ sơ thay đổi riêng để Staff thẩm định, không buộc tải lại giấy tờ khi cập nhật.
- Luồng hiện hành: chủ sở hữu xác nhận gỡ một lần, không nhập lý do, hiệu lực ngay bằng DELETED và OWNER_REMOVED. Luồng DELETE proposal cũ vẫn yêu cầu lý do và Staff duyệt để tương thích; không dùng luồng cũ để mô tả nút gỡ hiện tại.
- Trong lúc chờ duyệt, bản công khai vẫn giữ nguyên. Không hiển thị ảnh hoặc thông tin đang chờ duyệt ra public. Từ chối cập nhật/xóa giữ nguyên bản đang công khai.

## Mô hình

ServiceRegistration là snapshot đề nghị, bổ sung:

- `operation`: CREATE (mặc định cho dữ liệu mới, null legacy được coi là CREATE), UPDATE hoặc DELETE.
- `targetService`: ManyToOne nullable tới Service, liên kết dịch vụ đích của thay đổi và lịch sử sau khi tạo.
- `serviceRevision`: phiên bản Service mà yêu cầu thay đổi dựa vào.
- `imageContent`: BLOB ảnh đại diện; `imageContentType` là MIME ảnh đã kiểm tra.

Service thêm `revision` integer NOT NULL DEFAULT 0. Mỗi lần tạo/cập nhật/xóa được duyệt tăng revision. `Service.registration` OneToOne trỏ snapshot đã duyệt gần nhất; các yêu cầu cũ giữ targetService để tra lịch sử. Không tạo Service mới khi duyệt UPDATE/DELETE.

Ảnh public đọc từ snapshot đang được Service tham chiếu, không đọc từ proposal mới nhất bất kể trạng thái. Ảnh tối đa 5 MB, JPG/PNG/WEBP với kiểm tra MIME và chữ ký nội dung. Giấy tờ vẫn riêng tư và dùng endpoint riêng. Từ 2026-11-26, đăng ký mới bắt buộc ít nhất 1 ảnh ở cả web và backend; API trả 400 nếu danh sách ảnh null/rỗng. Cập nhật/bổ sung không chọn ảnh mới vẫn giữ bộ ảnh đã lưu; catalog có placeholder cho dữ liệu cũ thiếu ảnh.

Không có role mới; Service Owner vẫn là capability MANAGE_SERVICE độc lập. Staff/Admin không tự duyệt hồ sơ của mình. Yêu cầu cập nhật đã bị thu hồi quyền không thể tự kích hoạt lại capability qua phê duyệt; Staff có thể từ chối yêu cầu đó. Xóa một dịch vụ không thu hồi capability của người cung cấp và không ảnh hưởng dịch vụ khác.

## API

- `GET /api/service-registrations/mine`: tất cả hồ sơ của chính người đăng nhập; không nhận ownerId từ client.
- `POST /api/service-registrations`: multipart details/documents như trước, thêm part `image`.
- `POST /api/service-registrations/services/{id}/changes`: multipart `details` gồm `{operation, serviceRevision, details, note}`; details lồng là ServiceRegistrationRequest, bắt buộc cho UPDATE, không cần cho DELETE; part image tùy chọn.
- `GET /api/service-registrations/{id}/image`: ảnh snapshot riêng cho chủ hồ sơ hoặc STAFF/ADMIN.
- `POST /api/service-registrations/{id}/resubmit`: tiếp tục nhận nội dung/tệp giữ/mới/revision, thêm part image tùy chọn. Áp dụng cả hồ sơ thay đổi NEEDS_SUPPLEMENT.
- API Staff hiện có nhận và duyệt mọi operation; DTO hồ sơ bổ sung operation/targetServiceId/serviceRevision/hasImage. UI chỉ rõ loại yêu cầu và cho mở bản đang công khai để đối chiếu.
- UI Staff dùng một lựa chọn: **Duyệt hồ sơ**, **Yêu cầu bổ sung**, **Từ chối hồ sơ**. Duyệt không cần nhập lý do; khi để trống, hệ thống lưu mặc định “Đã kiểm tra và duyệt thành công.” vào kết quả và lịch sử xử lý. Yêu cầu bổ sung/từ chối cần phản hồi 10–2000 ký tự, đổi nhãn theo lựa chọn và hiển thị cho chủ hồ sơ. Duyệt/từ chối gửi cùng quyết định cho capability và listing qua API hiện có; yêu cầu bổ sung dùng endpoint riêng và giữ hồ sơ để người đăng ký sửa/nộp lại. Từ chối yêu cầu không thu hồi capability hoặc thay đổi dịch vụ đã công khai.
- `GET /api/services/{id}/image`: chỉ trả ảnh khi chính dịch vụ đủ public eligibility; no-store và nosniff. Không còn truy cập ảnh khi dịch vụ bị xóa/ngừng hoặc capability/provider không hoạt động.
- DTO public thêm imageUrl phiên bản hóa theo Service.revision; không trả bytes trong JSON.

## Đồng thời và quyền

Mọi thao tác owner lấy applicant từ principal. Proposal UPDATE/DELETE khóa user trước khi đọc Service và kiểm tra ownership, capability ACTIVE, serviceRevision. Gỡ trực tiếp kiểm tra ownership, revision, hồ sơ gốc và không có PENDING/NEEDS_SUPPLEMENT; không kiểm tra capability ACTIVE. Web hiện vẫn vô hiệu hóa nút Gỡ dịch vụ khi capability không ACTIVE; đây là khác biệt giữa điều kiện UI và endpoint backend. Mỗi Service chỉ có một yêu cầu PENDING/NEEDS_SUPPLEMENT. Staff khóa application rồi user theo cùng thứ tự với vòng resubmit; không có khóa application ngược từ owner change. Phê duyệt kiểm tra lại trạng thái/quyền/version của Service gốc. Double-submit hoặc request dựa trên bản cũ nhận 409; lỗi ảnh/validation rollback toàn bộ yêu cầu.

Phiên bản application tiếp tục chặn quyết định từ màn hình Staff cũ; serviceRevision bảo vệ snapshot dịch vụ đích. Trùng tên cũng được kiểm tra lại khi duyệt, để không bỏ qua kiểm tra thông qua lần bổ sung. Backend không nhận providerId, status, reviewer hoặc quyền từ nội dung client.

## Kiểm chứng / review

- 46 backend tests (31 host/staff regression + 15 service) qua với HTTP/H2 riêng: nhiều dịch vụ, ảnh riêng/public, ownership, ảnh sai rollback, pending duplicate, cập nhật không lộ trước duyệt, từ chối giữ bản cũ, giữ service ID sau cập nhật, stale version, duyệt xóa làm detail/ảnh 404, supplement trên UPDATE, cạnh tranh yêu cầu và thu hồi capability.
- 65 frontend unit/contract tests qua; production Vite build thành công.
- `scripts/check-services-management.cjs` kiểm tra Edge headless: grid 3 cột desktop, upload preview, gọi điện, form thêm/sửa/xóa/hủy, khóa pending; 1024/768/390 px không tràn ngang. Mọi API được intercept; không ghi MySQL thật.
- Đã xem ảnh chụp desktop/mobile, giữ bảng màu teal/slate, card bo góc và shell hiện có. Trong review đã sửa khoảng hiển thị dữ liệu cũ sau submit và ngăn thao tác khi quyền hoặc yêu cầu hiện tại không phù hợp.
- Chưa chạy migration trên MySQL thật. Hibernate ddl-auto=update hiện tại thêm các cột/FK. Cần khởi động backend/frontend cùng phiên bản.

Artifacts kiểm tra UI nằm ở `frontend/migration/service-management-check/`; ảnh là dữ liệu kiểm thử, không phải dịch vụ thật được seed.

## Bộ ảnh dịch vụ (2026-11-08)

- Cho chọn tối đa 5 ảnh, mỗi ảnh tối đa 5 MB; JPG/PNG/WEBP kiểm tra MIME và chữ ký nội dung. Multipart lặp part `image`; một ảnh theo contract cũ vẫn hợp lệ.
- Ảnh đầu lưu vào các cột imageContent/imageContentType hiện có để giữ tương thích; ảnh còn lại lưu trong element collection `service_registration_images` (registration_id, image_position, image_content, content_type), embeddable ServiceImage, thứ tự ổn định.
- Hồ sơ trả `imageCount`; public trả `imageUrls` bên cạnh `imageUrl` ảnh đại diện. Endpoint ảnh nhận `index` từ 0; sai chỉ số trả 404. Mỗi ảnh riêng tư/public dùng cùng kiểm tra ownership và điều kiện công khai hiện có.
- Chọn nhiều lần để thêm ảnh, có thể xóa ảnh mới trước khi gửi; ảnh đầu còn lại làm ảnh đại diện. Khi sửa/bổ sung, không chọn ảnh mới sẽ giữ nguyên cả bộ ảnh. Chọn ảnh mới sẽ thay thế toàn bộ bộ ảnh trong proposal. Bản public chỉ đổi sau duyệt; từ chối không đổi ảnh công khai.
- Staff/chủ hồ sơ xem bộ ảnh trong hồ sơ; người dùng xem bộ ảnh ở trang chi tiết. Card danh sách dùng ảnh đại diện.
- Cần khởi động backend phiên bản mới để Hibernate ddl-auto=update tạo bảng ảnh bổ sung. Không có migration trực tiếp trên MySQL trong phiên làm việc này.

### Kiểm tra phiên bản backend khi chỉ thấy một ảnh

Nếu API `/api/services` chỉ có `imageUrl`, không có `imageUrls`, tiến trình backend vẫn là phiên bản cũ; cần chạy lại cấu hình IntelliJ, không chỉ refresh frontend. Phiên kiểm tra 2026-11-08 đã xác minh API sau khi người dùng chạy lại có `imageUrls`, nhưng các dịch vụ cũ chỉ lưu 1 ảnh. Các ảnh chưa được backend cũ lưu không thể tự phục hồi; người đăng ký cần chọn lại bộ ảnh trong yêu cầu cập nhật và gửi Staff duyệt. Gallery hiển thị ảnh nhỏ, chỉ số hiện tại/tổng ảnh và nút trước/sau; tên tệp được rút gọn, tên gốc vẫn giữ khi tải xuống.

## Lifecycle completion — 2026-11-14

GET /api/service-registrations/services returns the authenticated owner’s services with an associated registration, including DELETED rows; the web filters deleted services out of its cards. Staff detail includes currentListing comparison for proposal review. Rejecting an update does not reactivate a revoked capability. Customer service requests are documented separately in [SERVICE_REQUESTS.md](SERVICE_REQUESTS.md); legacy DELETE proposal approval semantics remain supported; direct owner removal is the current web flow described above.


## Mở rộng khu vực dịch vụ (2026-11-14)

Service và ServiceRegistration thêm `custom_service_areas` tách khu vực tự nhập khỏi khu vực chuẩn; không thêm quan hệ/entity. Proposal chỉ cập nhật bản public sau duyệt. Xem [SERVICE_AREAS.md](SERVICE_AREAS.md) cho API mở rộng, validation, migration và danh sách file.

## Đơn vị tính (2026-11-14)

Hồ sơ và dịch vụ có `priceUnit` tùy chọn: bỏ trống lưu NULL, có nội dung thì trim và kiểm tra 2–20 ký tự. Trường được gửi/đọc qua các endpoint hiện có; bản công khai chỉ đổi sau khi duyệt đề nghị cập nhật. Migration `sql/migrations/20261114_service_price_unit.sql` thêm `price_unit VARCHAR(20) NULL` vào `service_registrations` và `services`, có thể chạy lại. Dữ liệu cũ giữ NULL. Trang chi tiết hiển thị đơn vị riêng sau giá và không hiển thị khi giá thỏa thuận.

## Hồ sơ không yêu cầu tài liệu xác minh (2026-11-17)

Form gửi mới/nộp bổ sung bỏ mục tài liệu xác minh; API cho phép không có tài liệu. Tài liệu cũ vẫn được giữ và truy cập theo quyền hiện có. Ảnh dịch vụ và quy trình xét duyệt không thay đổi.

## Đánh giá và báo cáo dịch vụ (2026-11-18)

Đã nối đánh giá 0–5 sao, ảnh và phản hồi chủ dịch vụ; báo cáo riêng tư, giải trình và staff gỡ công khai qua moderationHidden. Chi tiết API, phân quyền, trạng thái và migration: [SERVICE_FEEDBACK.md](SERVICE_FEEDBACK.md).

## Cập nhật nền giao diện dịch vụ (2026-11-20)

Các màn dịch vụ tự đọc lại dữ liệu mỗi 5 giây khi tab hiển thị, khi quay lại tab, kết nối mạng trở lại và sau thao tác dịch vụ thành công, kể cả từ tab khác. Cơ chế dùng polling. Bỏ nút tải lại ở nhánh dịch vụ. Đọc nền giữ nội dung form đang nhập. Form hồ sơ kiểm tra dữ liệu khi nhập; dashboard admin có khối hồ sơ/báo cáo dịch vụ dùng API thực tế.

## Tự duyệt đăng ký bằng AI (2026-11-25)

Worker xét tối đa 3 hồ sơ CREATE/PENDING mỗi vòng (mặc định 60 giây), gồm hồ sơ đang chờ từ trước và hồ sơ nộp lại. Dùng Gemini transport/key/model community.ai.key và community.ai.model, đọc từ config/mysql-local.properties qua GEMINI_API_KEY hoặc giá trị property tương ứng; không cần chép khóa sang code. Bật bằng service.ai.auto-review.enabled=true trong file local; mặc định repository/test tắt. Scheduler riêng tránh chặn các công việc nền khác.

AI nhận tên, danh mục, mô tả, giá, khu vực và toàn bộ ảnh dịch vụ; không gửi số điện thoại, email, tên người nộp hay giấy tờ xác minh. Chỉ APPROVE hợp lệ mới áp dụng quyết định APPROVE/APPROVE qua cùng logic transaction với nhân viên: khóa hồ sơ/tài khoản, revision, trạng thái, tên trùng, capability và snapshot. Hồ sơ thiếu ảnh, không rõ, lỗi AI hoặc bị safety block không tự duyệt/từ chối. HUMAN_REVIEW ghi audit theo revision và chờ nhân viên; lỗi mạng được thử lại vòng sau. UPDATE/DELETE vẫn duyệt thủ công.

Lịch sử AI_APPROVED/AI_HUMAN_REVIEW ghi model và lý do. Actor riêng service-review-ai@system.invalid có role USER, mật khẩu ngẫu nhiên không công bố; không được cấp quyền STAFF/ADMIN. Không có API cho client gọi đường duyệt tự động. Không thay đổi role người đăng ký; chỉ cấp MANAGE_SERVICE sau duyệt hợp lệ. Cần khởi động lại backend sau cập nhật cấu hình.
