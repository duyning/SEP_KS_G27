# Quản lý nhiều dịch vụ, ảnh và duyệt thay đổi

Cập nhật 2026-11-08. Luồng này mở rộng service; không thay luồng host/property hoặc phân công Staff.

## Người dùng

- `/services`: toolbar tìm kiếm tên dịch vụ/nhà cung cấp (không phân biệt dấu), lọc kết hợp danh mục và khu vực lấy từ dữ liệu công khai; query q/category/area giữ trên URL, có chip bỏ từng điều kiện và xóa toàn bộ. Frontend lọc trên toàn bộ danh sách được API public trả về, không thay điều kiện eligibility. Card dùng ảnh 16:9, mô tả 2 dòng, tiêu đề 2 dòng, metadata có icon, giá/nút căn đáy; CSS giới hạn trong danh sách công khai. Grid 3 card/hàng trên màn hình trên 1000 px, 2 card trên tablet và 1 trên mobile. Mỗi card có ảnh, danh mục, mô tả, khu vực, giá và nút **Xem chi tiết**, **Liên hệ**. Liên hệ mở thông tin nhà cung cấp với nút gọi điện/gửi email.
- Hồ sơ cần bổ sung hiển thị yêu cầu và nhân viên xét duyệt ở đầu modal. Mô tả/ghi chú dài mặc định rút gọn, có Xem thêm/Thu gọn; nội dung ô chỉnh sửa giữ đầy đủ. Người đăng nhập mở **Dịch vụ của tôi** để xem các dịch vụ đã duyệt và toàn bộ hồ sơ/yêu cầu, kể cả bị từ chối hoặc cần bổ sung.
- Sau onboarding và được cấp MANAGE_SERVICE ACTIVE, một người dùng có thể gửi thêm nhiều dịch vụ. Trước khi được cấp quyền, vẫn chỉ một hồ sơ onboarding đang xử lý. Tránh trùng tên trong dịch vụ còn hoạt động và yêu cầu chưa xử lý của cùng người cung cấp.
- Thêm dịch vụ có thông tin, ảnh đại diện và tài liệu xác minh. Sửa dịch vụ dùng cùng form thông tin, có thể thay ảnh; backend sao chép tài liệu gốc sang hồ sơ thay đổi riêng để Staff thẩm định, không buộc tải lại giấy tờ khi cập nhật.
- Yêu cầu xóa cần lý do và có bước hủy/xác nhận. Xóa có hiệu lực sau khi Staff duyệt, sử dụng trạng thái DELETED để bảo toàn lịch sử; card dịch vụ được loại khỏi danh sách quản lý sau khi duyệt xóa, không hiển thị card “Đã xóa”.
- Trong lúc chờ duyệt, bản công khai vẫn giữ nguyên. Không hiển thị ảnh hoặc thông tin đang chờ duyệt ra public. Từ chối cập nhật/xóa giữ nguyên bản đang công khai.

## Mô hình

ServiceRegistration là snapshot đề nghị, bổ sung:

- `operation`: CREATE (mặc định cho dữ liệu mới, null legacy được coi là CREATE), UPDATE hoặc DELETE.
- `targetService`: ManyToOne nullable tới Service, liên kết dịch vụ đích của thay đổi và lịch sử sau khi tạo.
- `serviceRevision`: phiên bản Service mà yêu cầu thay đổi dựa vào.
- `imageContent`: BLOB ảnh đại diện; `imageContentType` là MIME ảnh đã kiểm tra.

Service thêm `revision` integer NOT NULL DEFAULT 0. Mỗi lần tạo/cập nhật/xóa được duyệt tăng revision. `Service.registration` OneToOne trỏ snapshot đã duyệt gần nhất; các yêu cầu cũ giữ targetService để tra lịch sử. Không tạo Service mới khi duyệt UPDATE/DELETE.

Ảnh public đọc từ snapshot đang được Service tham chiếu, không đọc từ proposal mới nhất bất kể trạng thái. Ảnh tối đa 5 MB, JPG/PNG/WEBP với kiểm tra MIME và chữ ký nội dung. Giấy tờ vẫn riêng tư và dùng endpoint riêng. UI thêm mới yêu cầu chọn ảnh; backend tiếp tục nhận hồ sơ legacy chưa có ảnh để tương thích dữ liệu hiện có; catalog có placeholder khi thiếu ảnh.

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

Mọi thay đổi owner lấy applicant từ principal, khóa user trước khi đọc Service và kiểm tra ownership, capability ACTIVE, serviceRevision. Mỗi Service chỉ có một yêu cầu PENDING/NEEDS_SUPPLEMENT. Staff khóa application rồi user theo cùng thứ tự với vòng resubmit; không có khóa application ngược từ owner change. Phê duyệt kiểm tra lại trạng thái/quyền/version của Service gốc. Double-submit hoặc request dựa trên bản cũ nhận 409; lỗi ảnh/validation rollback toàn bộ yêu cầu.

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

GET /api/service-registrations/services returns the authenticated owner’s approved non-deleted snapshots. Staff detail includes currentListing comparison for proposal review. Rejecting an update does not reactivate a revoked capability. Customer service requests are documented separately in [SERVICE_REQUESTS.md](SERVICE_REQUESTS.md); existing DELETE approval/public-snapshot semantics are retained.


## Mở rộng khu vực dịch vụ (2026-11-14)

Service và ServiceRegistration thêm `custom_service_areas` tách khu vực tự nhập khỏi khu vực chuẩn; không thêm quan hệ/entity. Proposal chỉ cập nhật bản public sau duyệt. Xem [SERVICE_AREAS.md](SERVICE_AREAS.md) cho API mở rộng, validation, migration và danh sách file.

## Đơn vị tính (2026-11-14)

Hồ sơ và dịch vụ có `priceUnit` tùy chọn: bỏ trống lưu NULL, có nội dung thì trim và kiểm tra 2–20 ký tự. Trường được gửi/đọc qua các endpoint hiện có; bản công khai chỉ đổi sau khi duyệt đề nghị cập nhật. Migration `sql/migrations/20261114_service_price_unit.sql` thêm `price_unit VARCHAR(20) NULL` vào `service_registrations` và `services`, có thể chạy lại. Dữ liệu cũ giữ NULL. Trang chi tiết hiển thị đơn vị riêng sau giá và không hiển thị khi giá thỏa thuận.
