# ANIMATE UI INTEGRATION REPORT

Ngày kiểm tra: 27/10/2026. Project: `Code/HL-RCS/HL-RCS`. Frontend: `frontend/`.

## 1. Kiến trúc và lựa chọn tích hợp

- React 19, React DOM 19, React Router 7, Vite 7; JSX/JavaScript, CSS thuần; pnpm và pnpm-lock.yaml.
- Không có Next.js, TypeScript, Tailwind, shadcn/components.json, Radix, Base UI hoặc React Aria trong hệ UI hiện hành.
- Áp dụng đường C của skill: giữ markup/CSS/props, dùng catalog Button và Motion recipes cho component tự viết. Không chạy `animate all`, không đổi framework hay cài bộ UI khác.
- Backend Spring Boot/MySQL, services, auth context, JWT và RBAC không được chỉnh bởi tích hợp motion này. Không thêm dữ liệu mẫu vào production hay thay endpoint.
- Có sẵn thay đổi chưa commit của tác vụ đồng bộ staff/menu/modal trước khi bắt đầu; đã giữ lại. Việc xóa `StaffHostShellTemplate.jsx` là thay đổi có sẵn, không phải bước migration Animate UI.

## 2. Official skill và dependency

Nguồn: [Animate UI repository](https://github.com/imskyleen/animate-ui), [official skills guide](https://animate-ui.com/docs/skills), [Motion presence](https://motion.dev/docs/react-animate-presence), [Motion accessibility](https://motion.dev/docs/react-accessibility).

- Cài project-scoped duy nhất tại `.agents/skills/animate-ui/SKILL.md`; khóa nguồn trong `skills-lock.json`.
- Skill thuộc tài liệu Animate UI v2.3; hash: `bea74c688175a0a722fc280681a1fafe125933702dc05f8414709c17bfeec5cf`.
- Máy không có npx; dùng cùng trình cài qua `pnpm dlx skills add imskyleen/animate-ui --skill animate-ui --agent codex -y`. Không cài thêm bản global.
- Thêm `@animate-ui/react ^2.3.0` (resolved 2.3.0), `motion ^14.6.0` (resolved 14.6.0). React 19 đáp ứng peer React ^19, Motion 14 đáp ứng peer ^14.
- `framer-motion 14.6.0` là dependency nội bộ của `motion`, chỉ một phiên bản được resolve; không cài engine riêng thứ hai. Không force/legacy-peer-deps, không đổi package manager hoặc tạo lockfile khác.
- Các peer tùy chọn về Radix/Base UI/React Aria không được cài.
- CLI có binary tên `animate-ui`; lệnh pnpm dlx mặc định gọi `cli` lỗi. Audit đã chạy thành công bằng `pnpm --package=@animate-ui/cli dlx animate-ui audit src --json`.

## 3. Kế hoạch và pilot đã thực hiện

1. Đọc yêu cầu, git status, package/config, inventory component/CSS và kiểm tra skill trùng.
2. Cài/đọc official skill, catalog, tokens, rules, review, feel và recipes; lưu audit trước sửa.
3. Pilot bốn thành phần: Button, Toast, native Modal, account Menu. Build và kiểm tra trình duyệt trước mở rộng.
4. Sau pilot: tái dùng cho nút, modal và điều khiển đang có trên các portal; sửa lớp CSS animation cũ.
5. Kiểm tra các luồng API bằng fixture trong trình duyệt, responsive/reduced motion/focus, audit và build cuối.

## 4. Motion system dùng chung

`src/components/motion/MotionUI.jsx` cung cấp `AppMotionProvider`, `MotionButton`, `MotionDialog`, `MotionMenu`, `MotionToast`, `AnimatePresence`, `useSurfaceMotion`.

- Provider tempo **0.85**: mức subtle/snappy, dùng `ReducedMotionConfig` cho cả cây.
- Button dùng nguyên catalog `@animate-ui/react/primitives/buttons/button`: scale nhấn từ `scale.press`, `spring.press`; không scale khi hover, không đổi kích thước layout.
- Surface lấy `useMotionTokens()`: menu/scale.menu + transition.menu; dialog/scale.dialog + spring.dialog; toast/scale.toast + spring.toast. Opacity dùng transition.fade, exit dùng transition.dismiss (tempo .85 => 170ms).
- Giao diện dày đặc không dùng nghiêng 3D hay blur mở modal như default expressive recipe. Giữ scale rất nhẹ theo token, fade, xuất hiện giữa màn hình; menu origin top-right từ trigger.
- Tween exit nằm trong exit target, không `mode=wait` hay trì hoãn API/navigation. `transitionEnd` trả transform về none để không tạo containing block cố định sau animation.
- CSS shared: `src/styles/motion.css`, transition.color tại tempo .85 là 170ms ease, menu 187ms soft. Native checkbox/radio/select giữ nguyên và có phản hồi màu/border.

## 5. Component migration

| Component/nhóm | Trước | Sau | Phạm vi / kiểm tra |
| --- | --- | --- | --- |
| Button | Nút HTML, hover dịch/chồng CSS | Official Animate UI Button, giữ type/disabled/handlers/name/class/DOM button | Auth, Profile/BecomeHost, Host, Staff, Admin; kiểm tra bàn phím và luồng thao tác |
| Portal Modal | Native dialog mở/đóng tức thì | Native dialog + Motion surface + presence ở call site | Host CRUD, public details, xác minh; giữ top layer/focus/Escape |
| Common Modal | Overlay div, fade CSS, focus chưa bị giới hạn | Giữ overlay/DOM, thêm Motion surface, focus trap/restore, inert khi rời | Public, Host support, Staff assistance/community |
| Staff host decisions | Dialog native, geometry riêng | Cùng MotionDialog; giữ validation, busy, lý do, checklist và review payload | Duyệt/từ chối/bổ sung, 409 conflict, mobile |
| Account dropdown | CSS popoverFadeIn | MotionMenu + presence, origin theo nút, inert khi đóng | Shared shell, Enter/Escape và trả focus |
| Toast | Hiện/xóa ngay | MotionToast + unique counter ID + presence | Giữ role status/alert, nội dung và timer 6s cũ; không thêm notify giả |
| Tabs/filter/view controls | State đổi trực tiếp, transition all | State đổi ngay; press/color/border nhẹ, không chờ panel exit | Profile tabs, list/card, filters, admin tabs |
| Native checkbox/radio/select | Native controls | Giữ native semantics/focus/value, chuyển màu nhẹ | Checklist bổ sung và form |
| Loader | Vòng lặp CSS không theo visibility | Chỉ giữ loader chức năng; observer dừng ngoài viewport/tab ẩn; reduced-motion có text thay thế | Kiểm tra pause/resume khi cuộn |
| KPI, status, table, pagination | Dữ liệu/state hiện có | Giá trị hiện ngay; chỉ control phản hồi, không count-up hay row entrances | Không tạo thống kê, không đổi thứ tự/bộ lọc |

Các call site conditional modal được bọc AnimatePresence; không giữ cả trang trong presence. Modal native trả focus lúc bắt đầu rời, phần đang rời inert; mở lại nhanh phục hồi geometry và modality. Đã sửa lỗi nội suy transform none của toast và lỗi đảo chiều lifecycle của dialog phát hiện trong pilot.

## 6. Theo từng portal

- **USER/public**: auth controls, profile, đăng ký Chủ trọ, cards/details và modal hiện có; giữ toàn bộ giao diện gốc và dữ liệu đang dùng. Main text không bị giấu chờ animation.
- **HOST**: nhà trọ, loại phòng, danh sách phòng, wizard, import Excel, thêm/sửa/xóa, thông báo/hỗ trợ/xem phòng. Việc save/list refresh/toast vẫn chạy theo kết quả API hiện hữu. Không sửa multipart/upload hay validation.
- **STAFF**: menu chung, dashboard, danh sách và chi tiết, quyết định xét duyệt/bổ sung/từ chối, preview. Không tự đổi hồ sơ thành APPROVED trước phản hồi API.
- **ADMIN**: nút/tabs và shared shell. Giữ module prototype/local đang có; **không coi tác vụ local của Admin là API/database đã hoàn thiện**. Motion không bổ sung hay giả lập endpoint Admin. Sửa tràn ngang 390px bằng wrap tabs, min-width panel và một cột summary grid; bảng cuộn trong panel.

## 7. Audit trước/sau và phân loại

Raw evidence: `audit-before.json`, `audit-after.json`, `css-changes.json` cùng thư mục. Fact count của CLI là dữ kiện, không phải số lỗi; `animated-properties` tăng do ghi rõ từng thuộc tính thay cho all và thêm MotionButton.

| Fact | Trước | Sau |
| --- | ---: | ---: |
| animated-properties | 357 | 615 |
| hover-not-gated | 112 | 0 |
| hover-scale | 25 | 14 |
| infinite-loop | 38 | 9 |
| long-duration | 12 | 0 |
| no-reduced-motion | 29 | 30 |
| transition-all | 285 | 0 |
| will-change | 2 | 1 |

- **KEEP**: native focus/keyboard, loaders chỉ theo trạng thái xử lý hiện hữu, ảnh zoom nhẹ trong khung clip khi hover-capable, phản hồi màu, conditional validation. CLI vẫn đánh dấu image zoom là hover-scale dù đó là ảnh con, không phải nút.
- **IMPROVE**: hover pointer gating, color transitions có tên thuộc tính, reduced motion toàn cục, focus trap của common modal, account Escape, KPI Enter/Space, exit inert.
- **REPLACE**: popover CSS entrance bằng shared surface; modal/toast/button phù hợp dùng official component hoặc token/recipe.
- **REMOVE**: 285 transition all trong CSS và 4 inline transition all; 30 decorative/shimmer loops; hover scale/dịch không hợp lý trên nút; 21 keyframe không dùng/trùng; will-change khai báo dài hạn. 46 keyframe còn dùng được namespace theo file để tránh va chạm global.
- 112 hover rules được sửa; các transform hover còn dùng được gate `(hover:hover) and (pointer:fine)`.
- Bỏ thời gian chờ flip auth toàn màn hình; giữ nguyên static faces/bố cục. Các progress width đơn giản đổi ngay, không animate layout; ảnh hover trước 400ms đổi sang menu token CSS.
- CLI không lần được provider/token/recipe qua mọi import, nên `no-reduced-motion` tại file riêng không đồng nghĩa thiếu coverage: provider root và CSS reduced motion bao phủ chúng. Audit cũng không kiểm tra toàn bộ animation nằm trong node_modules.
- Fact `will-change` còn lại thuộc `leaflet.css`: giữ nguyên gợi ý compositing của thư viện bản đồ, không phải hiệu ứng trang trí. Chín infinite-loop facts còn lại là spinner chức năng, được pause ngoài viewport/tab ẩn và ngừng dưới reduced motion.

## 8. Accessibility, API và hiệu năng

- OS reduced motion: không scale/translate/rotate/loop; UI vẫn hiển thị, có fade ngắn cho surface; focus ring luôn hiện ngay.
- Native dialog giữ focus trap của trình duyệt; common modal có trap và restore. Escape và xác nhận tôn trọng busy handler cũ. Không focus vào phần exit vì inert/aria-hidden.
- Không bọc/chuyển key của focused button khi đổi label, giữ submit/native control semantics. Không delayed event handler hoặc timer điều khiển API.
- Chỉ surface nhỏ/controls có transform/opacity. Không animate top/left/width/height qua từng frame, không layout trên toàn bảng, không stagger hàng, không page transition/parallax/confetti/number counting.
- Vị trí fixed lúc dialog rời chỉ được chụp/gán một lần, không tween layout.
- Loading observer chỉ theo child/class mutation và visibility, không React setState theo pointer/scroll/frame. Motion springs/tweens có thể đảo chiều; đã thử mở/đóng nhanh liên tiếp.
- Không thêm retry giả, loading giả, trạng thái phê duyệt giả hoặc notification mới trong nghiệp vụ. API fixtures chỉ nằm trong scripts/tests, không trong production.
- Các browser checks không ghi dữ liệu MySQL. Không dùng test này để khẳng định API/DB integration thực tế đã được kiểm thử lại.
- Không có TypeScript/typecheck script trong project: mục typecheck không áp dụng; dùng Vite compile và tests JS. Không cài TypeScript chỉ để tích hợp motion.

## 9. Kết quả kiểm tra

**Đã pass**:

- Production `vite build` (log trong build.log); `git diff --check`.
- `check-motion.cjs`: 1920,1440,1366,1280,1024,768,390; native modal focus trap/restore, Enter/Escape, reduced motion, toast/menu enter/exit, mở/đóng ngắt quãng nhanh, off-screen loader pause/resume, 0 pageerror.
- `check-motion-portals.cjs`: 4 portal x 7 widths = 28 responsive checks; không tràn ngang, account menu keyboard, 0 pageerror.
- `check-staff-navigation.cjs`: 12 staff routes cùng menu, badge/active item, 3 mobile routes.
- `check-staff-host-applications.cjs`: 3 quyết định, validation, checklist, error recovery, 409, guard, đồng đều modal 1280/390.
- `check-public-home.cjs`, `check-profile-prototype.cjs`, `check-become-host.cjs`: dữ liệu/filter/detail/tabs/edit/save, ảnh, confirmation/pending/supplement và lỗi API.
- `check-room-type-crud.cjs`, `check-room-type-wizard.cjs`: tạo/sửa/xóa, failure paths, ảnh, batch rooms; không mất validation/payload.
- `check-registration-file-focus.cjs`: không mất thông tin/ảnh/tài liệu khi chọn file và focus; Google request được chặn trong test này, không xác nhận Google Maps thực tế.
- `check-staff-workspace.cjs`, `check-verification-detail-design.cjs`, `check-supplement-modal.cjs`: review, preview, read-only map, checklist, request failure/success, responsive.

**Unit suite**: 80/84 pass. Bốn source/inventory assertions đã lỗi trong mã trước tích hợp, không bị che bằng skip hoặc nới assertion:

1. Profile logout assertion tìm ID trong ProfilePage thay vì ProfilePrototype.
2. Inventory cố định 32 routes trong khi routing hiện có 35.
3. Assertion mọi module phải blocked trong khi đã có connected modules.
4. Prototype còn các href="#" từ giao diện gốc.

Đối chiếu HEAD xác nhận ID profile đã không còn ở controller, prototype đã có placeholder href và routing đã có connected trước thay đổi motion. Nên cập nhật bộ inventory/source assertions trong tác vụ riêng với contract hiện hành; unit suite chưa thể báo xanh toàn bộ.

Trong browser regression đã cập nhật fixture cho endpoint host-applications mới của menu chung, câu validation/checklist mới và chờ animation kết thúc khi so geometry. Không dùng forced click để né lỗi sản phẩm.

Build còn cảnh báo chunk >500KB (entry và ExcelJS). Không tắt cảnh báo. Tách route/vendor và lazy-load các màn hình nặng là bước tối ưu tiếp theo; chưa tự refactor bundling trong đợt tích hợp này. Performance mới được kiểm tra bằng giới hạn thuộc tính, responsiveness và interaction; chưa có CPU/GPU profiling hay kiểm thử screen reader vật lý.

Build cuối: entry JS 1,283.06 kB (gzip 351.75 kB), CSS 459.06 kB (gzip 77.96 kB), ExcelJS 936.82 kB (gzip 270.66 kB). Ảnh kiểm tra: [modal mobile](screenshots/staff-supplement-390.png), [modal desktop](screenshots/staff-approve-1280.png).

## 10. Chủ động không chuyển

Không đổi Leaflet/Google map engine, không animate marker kéo ghim, không chuyển native select sang combobox thư viện, không animate bảng số liệu/breadcrumb/page/header, không hiệu ứng nền/scroll reveal hàng loạt, không thay icon library, không cài Tailwind/shadcn. Không biến Admin prototype thành backend feature trong tác vụ motion. Các screen ít tương tác chỉ thừa hưởng CSS controls/reduced motion; không cố ép hiệu ứng vào mọi khối.

## 11. File và cách chạy lại

File mới chính: `frontend/src/components/motion/MotionUI.jsx`, `frontend/src/styles/motion.css`, `frontend/scripts/check-motion.cjs`, `frontend/scripts/check-motion-portals.cjs`, `frontend/tests/fixtures/motion-harness.html`, `frontend/tests/fixtures/motion-harness.jsx`, `.agents/skills/animate-ui/`, `skills-lock.json`, thư mục báo cáo này.

Các file đang chỉnh trong frontend được liệt kê dưới đây. Bao gồm một số thay đổi staff có sẵn trước tác vụ; báo cáo không nhận các thay đổi đó là công việc Animate UI mới.

- `frontend/package.json`
- `frontend/pnpm-lock.yaml`
- `frontend/scripts/check-registration-file-focus.cjs`
- `frontend/scripts/check-staff-host-applications.cjs`
- `frontend/scripts/check-staff-workspace.cjs`
- `frontend/scripts/check-supplement-modal.cjs`
- `frontend/scripts/check-verification-detail-design.cjs`
- `frontend/src/components/PortalUI.jsx`
- `frontend/src/components/PublicPropertyCard.jsx`
- `frontend/src/components/RoomBatchSetup.jsx`
- `frontend/src/components/RoomEditorModal.jsx`
- `frontend/src/components/RoomTypeCreateModal.jsx`
- `frontend/src/components/RoomTypeDetailModal.jsx`
- `frontend/src/components/RoomTypeExcelImportModal.jsx`
- `frontend/src/components/common/KpiCard.jsx`
- `frontend/src/components/common/Modal.jsx`
- `frontend/src/layouts/PortalLayout.jsx`
- `frontend/src/main.jsx`
- `frontend/src/pages/AuthPage.jsx`
- `frontend/src/pages/BecomeHostPage.jsx`
- `frontend/src/pages/BecomeHostPrototype.jsx`
- `frontend/src/pages/ProfilePage.jsx`
- `frontend/src/pages/ProfilePrototype.jsx`
- `frontend/src/pages/admin/AdminDashboardPage.jsx`
- `frontend/src/pages/host/HostDashboardPage.jsx`
- `frontend/src/pages/host/HostNotificationsPage.jsx`
- `frontend/src/pages/host/HostPropertyCreatePage.jsx`
- `frontend/src/pages/host/HostPropertyEditForm.jsx`
- `frontend/src/pages/host/HostPropertyPage.jsx`
- `frontend/src/pages/host/HostRoomTypesPage.jsx`
- `frontend/src/pages/host/HostRoomsPage.jsx`
- `frontend/src/pages/host/HostSupportPage.jsx`
- `frontend/src/pages/host/HostViewingRequestsPage.jsx`
- `frontend/src/pages/public/BookingsPage.jsx`
- `frontend/src/pages/public/CommunityPage.jsx`
- `frontend/src/pages/public/DetailPage.jsx`
- `frontend/src/pages/public/HomePrototype.jsx`
- `frontend/src/pages/public/MapSearchPage.jsx`
- `frontend/src/pages/public/ServiceDetailPage.jsx`
- `frontend/src/pages/public/ServicesPage.jsx`
- `frontend/src/pages/staff/StaffAssistanceRequestDetailPage.jsx`
- `frontend/src/pages/staff/StaffAssistanceRequestsPage.jsx`
- `frontend/src/pages/staff/StaffCommunityModerationDetailPage.jsx`
- `frontend/src/pages/staff/StaffCommunityModerationPage.jsx`
- `frontend/src/pages/staff/StaffDashboardPage.jsx`
- `frontend/src/pages/staff/StaffHostDetailTemplate.jsx`
- `frontend/src/pages/staff/StaffHostListTemplate.jsx`
- `frontend/src/pages/staff/StaffHostModalTemplate.jsx`
- `frontend/src/pages/staff/StaffHostRegistrationDetailPage.jsx`
- `frontend/src/pages/staff/StaffHostRegistrationsPage.jsx`
- `frontend/src/pages/staff/StaffHostShell.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationDetailPage.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationsPage.jsx`
- `frontend/src/routing/screens.js`
- `frontend/src/styles/admin-dashboard.css`
- `frontend/src/styles/auth.css`
- `frontend/src/styles/become-host-prototype.css`
- `frontend/src/styles/bookings.css`
- `frontend/src/styles/community.css`
- `frontend/src/styles/detail.css`
- `frontend/src/styles/favorites.css`
- `frontend/src/styles/home-landing.css`
- `frontend/src/styles/home-prototype-integration.css`
- `frontend/src/styles/home-prototype.css`
- `frontend/src/styles/home.css`
- `frontend/src/styles/host-dashboard.css`
- `frontend/src/styles/host-notifications.css`
- `frontend/src/styles/host-property-create.css`
- `frontend/src/styles/host-property.css`
- `frontend/src/styles/host-room-availability.css`
- `frontend/src/styles/host-room-types.css`
- `frontend/src/styles/host-rooms.css`
- `frontend/src/styles/host-support.css`
- `frontend/src/styles/host-viewing-requests.css`
- `frontend/src/styles/map-search.css`
- `frontend/src/styles/notifications.css`
- `frontend/src/styles/portal.css`
- `frontend/src/styles/profile-prototype.css`
- `frontend/src/styles/profile.css`
- `frontend/src/styles/search.css`
- `frontend/src/styles/service-detail.css`
- `frontend/src/styles/services.css`
- `frontend/src/styles/staff-dashboard.css`
- `frontend/src/styles/staff-host-integration.css`
- `frontend/src/styles/staff-host-prototype.css`
- `frontend/src/styles/styles.css`

Chạy từ frontend:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm --package=@animate-ui/cli dlx animate-ui audit src --json
# Trình duyệt: cần Playwright và Edge; PLAYWRIGHT_MODULE có thể trỏ module runtime đã có.
node scripts/check-motion.cjs
node scripts/check-motion-portals.cjs
```

Không commit/push, sửa secret, hoặc đổi database trong tác vụ này. Skill dùng được từ thư mục project đã cài; phiên Codex mới có thể tự nhận catalog skill, còn phiên hiện tại đã đọc và áp dụng trực tiếp.
