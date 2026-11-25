# Báo cáo tích hợp DungDT và DuongND

Ngày 25/11/2026 · Nhánh đích `integration/final-merge`

## Trạng thái và truy vết

| Mốc | Commit |
| --- | --- |
| `integration/final-merge` và `origin/integration/final-merge` lúc bắt đầu | `e666e34f2a9e85a014954de44bd78a8663478298` |
| `origin/DungDT` sau fetch | `34ff6d73ef01da1c04f9be31c0ef15c37c262d3a` |
| `origin/DuongND` sau fetch | `04cae07932c63d145504f65a06cf463b48882122` |
| Merge-base của từng nhánh nguồn với nền ban đầu | `8b99a48c55d8cbb692b7be1691242b90edd4f445` |
| Bản tích hợp DungDT | `3cfc5b46f9f6d5ac01919d8589f9ff4f7ef8af4a` |
| Bản tích hợp DuongND, cũng là HEAD mã đã kiểm thử | `727b3403462149b8ed3a4516f95263d2caca9492` |

Local và remote của nhánh đích có độ lệch `0/0` sau fetch. Tag local `backup/final-merge-before-DungDT-DuongND-e666e34` giữ mốc khôi phục. Bản sao của 41 tệp tracked đã sửa và 87 tệp untracked nằm trong thư mục `.final-merge-local-backup-F3xrG3` tại gốc workspace. Các thay đổi này nằm ngoài hai commit tích hợp. Đã so sánh bản vá tracked và từng tệp untracked với bản sao theo byte.

Đã đối chiếu lịch sử, `git merge-base`, `git log`, `git diff`, `git show`, `git cherry` và thử merge tree. Hai lượt thử merge không báo xung đột dòng. Các khác biệt nghiệp vụ bên dưới cần tích hợp ở cấp khối mã. DungDT được tích hợp và kiểm thử trước, sau đó đến DuongND. Mỗi commit ghi `Source-Commit` để truy về bản nguồn.

- DungDT `34ff6d73ef01da1c04f9be31c0ef15c37c262d3a` cung cấp phần giao diện dịch vụ, kiểm tra quyền sở hữu và bộ kiểm thử.
- DuongND `f79f05db86eb0ef4177fb99bb7e68bc612dc29d2` cung cấp bộ lọc Cộng đồng và kiểm thử. Merge nguồn `6680423c06aadf0e2db7c1db8176c482b24a2754` nhận mốc nền `8b99a48` và cập nhật mock JWT cùng CSS tải theo route. `04cae07932c63d145504f65a06cf463b48882122` cung cấp nhắn tin và xử lý lỗi tải trang, đọc dữ liệu.
- DungDT `f7bd2f6c42fd048a94c16649e2eeae6de85b20af` và DuongND `a13120d8e3871235cf0565c76ec3c3af9bab6032` đã thuộc lịch sử nhánh đích. `git cherry` không phát hiện patch tương đương bổ sung trong các commit ứng viên. Các khối từ nền chung đã có được giữ tại chỗ.

## Phần đã tích hợp

### DungDT

- Cập nhật thẻ và bộ lọc danh mục dịch vụ, giao diện xử lý khiếu nại và hộp thoại xét duyệt hồ sơ dịch vụ. Nhãn xác nhận phản ánh lựa chọn đang thực hiện, kể cả quyết định đối với yêu cầu xóa dịch vụ.
- Kiểm tra dịch vụ mục tiêu thuộc người gửi hồ sơ trước khi áp dụng quyết định. Quy trình xét duyệt của STAFF/ADMIN, kiểm tra revision và bản công khai đã duyệt tiếp tục dùng cùng luồng.
- Đồng bộ `frontend/package-lock.json` với manifest frontend. `npm ls --offline --package-lock-only --depth=0` và đối chiếu metadata khóa đều đạt. Thêm bộ kiểm thử điều kiện công khai cùng dữ liệu kiểm tra hồ sơ dịch vụ.

### DuongND

- Thêm `/messages` cho USER, ROOM_HOST, STAFF và ADMIN, nút thông báo tin nhắn và khung hội thoại. Hỗ trợ tìm kiếm hội thoại, phân trang lịch sử, trạng thái đã đọc, trích dẫn, tệp ảnh/video riêng tư và mở hội thoại từ bài Cộng đồng đủ điều kiện.
- Thêm API `/api/messaging` để mở/liệt kê hội thoại, xem/gửi tin, đánh dấu đã đọc và tải tệp. Kiểm tra thành viên hội thoại áp dụng cả với ADMIN. Tin và tệp được lưu cùng giao dịch. Mã gửi hỗ trợ thử lại an toàn. Sự kiện SSE sau commit chỉ đến các thành viên và phiên đã bị thu hồi bị ngắt.
- Gom các bộ lọc Cộng đồng, thêm xử lý lỗi tạm thời cho dữ liệu đang đọc và giữ nội dung đang xem khi đồng bộ thất bại. Thêm thử tải lại module theo route và màn báo lỗi có nút tải lại. Cập nhật Web dev proxy và làm nóng các route thường dùng.
- Bổ sung mô tả API, các bảng nhắn tin và quan hệ JPA vào tài liệu. Bổ sung kiểm thử luồng nhắn tin, quyền truy cập, SSE, biểu mẫu và kiểm duyệt Cộng đồng.

## Quyết định tích hợp và lỗi đã sửa

| Thay đổi nguồn | Xử lý trên nhánh đích |
| --- | --- |
| DungDT tự duyệt CREATE bằng Gemini và thêm nhánh tự duyệt DELETE | Để lại cho quyết định nghiệp vụ. Luồng nguồn dùng tài khoản hệ thống có role USER để áp dụng quyết định, bao gồm đường DELETE trong mã, trong khi tài liệu nguồn mô tả DELETE duyệt thủ công. Phần nằm ngoài bản tích hợp gồm `ServiceAiSchedulingConfiguration`, `ServiceAutoReviewWorker`, `GeminiCommunityScanner.assessService`, `ServiceReviewService.approveAutomatically`, audit tự duyệt, cấu hình tương ứng trong `application.properties` và `application-test.properties`, ca tự duyệt trong `ServiceRegistrationTests` và `ServiceAutoReviewWorkerTest`, cùng đoạn mới trong `docs/SERVICE_MANAGEMENT.md`. |
| DungDT bỏ lựa chọn tải và giữ tài liệu xác minh trong `ServiceRegistrationModal.jsx` | Giữ phần đính kèm không bắt buộc khi gửi hoặc bổ sung hồ sơ. |
| DungDT xóa 37 tệp trong `docs/class-diagram-demo/` và `docs/class-diagrams/`, đồng thời thêm `.tmp/` vào `.gitignore` | Giữ các sơ đồ và quy tắc Git hiện tại vì các thay đổi này không cần cho tính năng dịch vụ. |
| DuongND bỏ lịch sử báo cáo của thành viên và rút gọn CSS/API tương ứng | Giữ liên kết **Báo cáo của tôi** trong luồng Cộng đồng, route `/community/reports`, phần đọc báo cáo cá nhân trong `frontend/src/services/community-reports.js` và CSS `frontend/src/styles/community-reports.css`. Giữ cả chế độ quản trị tại `/admin/community/reports`. Bổ sung CSS cần cho mở trực tiếp từng route. |
| DuongND đổi cổng backend local sang `8081` và thêm báo cáo riêng của nhánh nguồn | Giữ mặc định `8080`, cùng khả năng cấu hình `API_TARGET`. Ba phần đổi cổng trong hai tệp `.run/HL_RCS_Full_Stack*.run.xml` và `docs/run-local.md` nằm ngoài tích hợp. `docs/INTEGRATION_DUONGND_20261125.md` mô tả mốc riêng và việc gỡ lịch sử báo cáo nên được thay bằng báo cáo tích hợp hiện tại. |
| Lỗi chạy route Cộng đồng trên bản patch đầu | Sửa vị trí liên kết lịch sử báo cáo ngay trong component và kiểm tra lại bằng bàn phím, truy cập trực tiếp và quay lại trang. |
| Tám ca kiểm thử SSE kỳ vọng bộ đếm emitter 65 giây cũ | Cập nhật kỳ vọng lên 305 giây cho TTL 5 phút và 5 giây đệm. Giữ nguyên kiểm tra từ chối phiên sai, hết hạn, đóng kết nối và chỉ gửi sự kiện cho người có quyền. |
| Một lần chạy đầy đủ ghi nhận 188 ca nộp hồ sơ lỗi khi Mockito dùng lẫn hai mock maker | Dùng mock maker mặc định trong `ServicePublicationIsPublicUnitTest` để các bộ kiểm thử cùng tiến trình dùng chung cấu hình. Giữ toàn bộ assertion và ca kiểm thử dịch vụ. |

## Đối chiếu chức năng và cơ sở dữ liệu

- So với mốc `e666e34`, cả 43 route đăng ký ban đầu giữ nguyên định nghĩa và điều kiện quyền. `/messages` là route đăng ký mới. Các mapping controller trước merge được giữ. Luồng cuộn đầu trang, phân trang tìm phòng, anchor liên hệ, danh sách phòng của chủ trọ và mã căn chỉnh thẻ ảnh đăng ký nhà trọ được bảo toàn.
- Các màn xác minh và quản trị tiếp tục kiểm tra quyền theo vai trò STAFF và ADMIN. Luồng báo cáo Cộng đồng, kiểm duyệt bài, bình luận, thông báo, đăng ký và duyệt dịch vụ vẫn hiện diện. Các phần thay đổi chưa commit về tìm phòng, đăng ký nhà trọ và mobile được bảo toàn ngoài phạm vi.
- JPA bổ sung `messaging_conversations`, `messaging_messages` và `messaging_attachments`. Ràng buộc bao gồm cặp thành viên duy nhất, thứ tự và mã thử lại trong phạm vi hội thoại, cùng khóa ngoại cho người dùng, hội thoại, tin được trích dẫn và tệp đính kèm. Bộ kiểm thử dùng H2 chế độ MySQL để kiểm tra mapping, quyền, giao dịch và gửi trùng. Mặc định runtime tiếp tục dùng `ddl-auto=update`. Các tệp SQL và migration hiện có giữ nguyên.
- `package.json`, `pnpm-lock.yaml`, manifest Maven, cấu hình Spring Security và cây mã mobile không có thay đổi từ hai giai đoạn. Đối chiếu diff của hai commit tích hợp không có tệp bị xóa.

## Kết quả kiểm thử

| Phạm vi | Kết quả |
| --- | --- |
| DungDT · Spring Boot | Maven `package` đạt. 237 ca kiểm thử qua, gồm điều kiện công khai dịch vụ, ma trận hồ sơ và luồng xét duyệt H2. |
| DungDT · frontend | 295 ca đạt. Vite build đạt. Chrome kiểm tra màn xét duyệt theo role, bàn phím, lựa chọn duyệt/từ chối/yêu cầu bổ sung và kích thước 375, 768, 1024, 1440 px. |
| Toàn bản · Spring Boot | Maven `package` đạt trên snapshot cuối. 2.077 ca đạt, 1 ca opt-in dịch vụ thật bị bỏ qua, 0 lỗi. Có 11 ca API nhắn tin H2, 2 ca SSE riêng tư và 719 ca trong ma trận dịch vụ Cộng đồng. |
| Toàn bản · frontend | 397 ca đạt, Vite build production đạt. Vite cảnh báo một số chunk lớn hơn 500 kB sau minify. |
| Chrome với API mô phỏng | 44 route đăng ký và 36 URL chuyển hướng cũ đạt. Kiểm tra khách được chuyển đến đăng nhập, 4 vai trò đã xác thực vào được Tin nhắn, trả lời và gửi lại sau lỗi 503, giữ mã gửi khi thử lại, không tràn ngang ở 375 px, mở **Báo cáo của tôi** bằng bàn phím. Mô phỏng lỗi tải chunk và phục hồi bằng nút **Tải lại trang** đạt. |
| Hồi quy cuộn và điều hướng | Qua ở 375, 768, 1024, 1440 px và cấu hình hiển thị 2× tại 720 px. Đã kiểm tra vào trang từ đầu, nút Quay lại, phân trang, anchor liên hệ và mở lại Cộng đồng đã có cache. |
| Mobile | 174 ca kiểm thử script có sẵn đạt trong worktree kiểm thử với dependency TypeScript từ workspace. |

Các ca tích hợp H2 và trình duyệt mô phỏng không bao phủ dữ liệu MySQL triển khai thực tế, cấu hình proxy production, thiết bị Expo hay dịch vụ Gemini/SMS/Google trực tiếp. Ca Gemini mô tả nhà trọ chạy với dịch vụ thật được bỏ qua theo cấu hình opt-in.

## Chờ quyết định

- Phạm vi tự duyệt dịch vụ bằng AI cần xác nhận nghiệp vụ, đặc biệt với quyền quyết định của nhân viên và yêu cầu xóa.
- Nhánh local có hai commit mã và commit báo cáo này. Đối chiếu GitHub sau khi tích hợp xác nhận remote nhánh đích vẫn ở `e666e34`. `main`, `DungDT` và `DuongND` giữ nguyên các mốc trên GitHub. Bản tích hợp chờ duyệt trước khi đẩy lên nhánh đích.

## Danh sách tệp theo commit

### DungDT

#### Thêm (3)

- `src/test/java/org/hlrcs/service/ServicePublicationIsPublicUnitTest.java`
- `src/test/java/org/hlrcs/service/ServiceRegistrationSubmitUnitTest.java`
- `src/test/resources/service-registration-submit-cases.json`

#### Sửa (7)

- `frontend/package-lock.json`
- `frontend/src/components/ServiceComplaints.jsx`
- `frontend/src/components/ServicesCatalog.jsx`
- `frontend/src/pages/staff/StaffServiceApplicationsPage.jsx`
- `frontend/src/styles/service-applications.css`
- `frontend/src/styles/service-feedback.css`
- `src/main/java/org/hlrcs/service/ServiceReviewService.java`

#### Xóa (0)

Không có.

### DuongND và điều chỉnh để chạy chung hai bộ kiểm thử

#### Thêm (43)

- `docs/MESSAGING.md`
- `frontend/scripts/api-proxy.mjs`
- `frontend/src/components/AppErrorBoundary.jsx`
- `frontend/src/components/messaging/ConversationList.jsx`
- `frontend/src/components/messaging/MessageAttachment.jsx`
- `frontend/src/components/messaging/MessageThread.jsx`
- `frontend/src/components/messaging/MessagingBell.jsx`
- `frontend/src/components/messaging/MessagingDock.jsx`
- `frontend/src/context/MessagingContext.jsx`
- `frontend/src/context/messagingState.js`
- `frontend/src/pages/MessagesPage.jsx`
- `frontend/src/routing/lazy-page.js`
- `frontend/src/services/messaging-media.js`
- `frontend/src/services/messaging.js`
- `frontend/src/services/retry-read.js`
- `frontend/src/styles/messaging.css`
- `frontend/tests/api-proxy.test.js`
- `frontend/tests/community-post-form-fields.test.js`
- `frontend/tests/lazy-page.test.js`
- `frontend/tests/messaging-media.test.js`
- `frontend/tests/messaging.test.js`
- `src/main/java/org/hlrcs/controller/MessagingController.java`
- `src/main/java/org/hlrcs/entity/DirectConversation.java`
- `src/main/java/org/hlrcs/entity/DirectMessage.java`
- `src/main/java/org/hlrcs/entity/DirectMessageAttachment.java`
- `src/main/java/org/hlrcs/repository/DirectConversationRepository.java`
- `src/main/java/org/hlrcs/repository/DirectMessageAttachmentRepository.java`
- `src/main/java/org/hlrcs/repository/DirectMessageRepository.java`
- `src/main/java/org/hlrcs/service/CommunityMessagingContext.java`
- `src/main/java/org/hlrcs/service/MessagingChanged.java`
- `src/main/java/org/hlrcs/service/MessagingContextResolver.java`
- `src/main/java/org/hlrcs/service/MessagingMediaService.java`
- `src/main/java/org/hlrcs/service/MessagingService.java`
- `src/test/java/org/hlrcs/MessagingTests.java`
- `src/test/java/org/hlrcs/service/CommunityFeatureFlowTest.java`
- `src/test/java/org/hlrcs/service/CommunityNotificationMatrixTest.java`
- `src/test/java/org/hlrcs/service/CommunityPostFormFieldTest.java`
- `src/test/java/org/hlrcs/service/CommunityRealtimeMatrixTest.java`
- `src/test/java/org/hlrcs/service/CommunityReportAssistantMatrixTest.java`
- `src/test/java/org/hlrcs/service/CommunityServiceMatrixExtraTest.java`
- `src/test/java/org/hlrcs/service/CommunityServiceMatrixTest.java`
- `src/test/java/org/hlrcs/service/MessagingRealtimePrivacyTest.java`
- `src/test/resources/community-post-form-cases.json`

#### Sửa (31)

- `docs/ENTITY_CATALOG.md`
- `docs/ERD.md`
- `docs/PROJECT_CONTEXT.md`
- `frontend/scripts/intellij-dev.mjs`
- `frontend/src/App.jsx`
- `frontend/src/components/CommunityNotificationBell.jsx`
- `frontend/src/components/CommunityNotificationInbox.jsx`
- `frontend/src/components/CommunityPostComments.jsx`
- `frontend/src/components/CommunityPostFooter.jsx`
- `frontend/src/components/CommunityPrototype.jsx`
- `frontend/src/components/layout/PublicNavbar.jsx`
- `frontend/src/components/useCommunityFeed.js`
- `frontend/src/layouts/PortalLayout.jsx`
- `frontend/src/main.jsx`
- `frontend/src/pages/CommunityReportsPage.jsx`
- `frontend/src/pages/PortalScreens.jsx`
- `frontend/src/pages/admin/AdminDashboardPage.jsx`
- `frontend/src/routing/screens.js`
- `frontend/src/services/community-feed.js`
- `frontend/src/services/community-live.js`
- `frontend/src/styles/community-prototype.css`
- `frontend/src/styles/home-prototype.css`
- `frontend/tests/community-feed.test.js`
- `frontend/tests/community-live.test.js`
- `frontend/vite.config.js`
- `src/main/java/org/hlrcs/exception/GlobalExceptionHandler.java`
- `src/main/java/org/hlrcs/service/CommunityRealtimeService.java`
- `src/main/java/org/hlrcs/service/CommunityVideoService.java`
- `src/test/java/org/hlrcs/CommunityRealtimeTests.java`
- `src/test/java/org/hlrcs/service/CommunityUnitSupport.java`
- `src/test/java/org/hlrcs/service/ServicePublicationIsPublicUnitTest.java`

#### Xóa (0)

Không có.

### Báo cáo

- Thêm `MERGE_REPORT.md` trong một commit tài liệu riêng ngay sau hai commit tích hợp.
