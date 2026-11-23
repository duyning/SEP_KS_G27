# Chuẩn hóa giao diện HL_RCS

Áp dụng trên DungDT, ngày 2026-11-14. Giữ React/Vite, tông teal, API và đường dẫn route.

## Các nhóm thay đổi để review

1. **Nền tảng:** `styles/design-system.css`, `Container`, `PortalLayout`, `main.jsx`. Container tối đa 1200px, gutter 24px hoặc 16px trên điện thoại; header, breadcrumb, nội dung, footer cùng lề. Các layout có sidebar dùng container trong vùng còn lại.
2. **Component:** `Button`, `Field`, `StatusBadge`, `Modal`. Call site vẫn giữ handler, tên class và thuộc tính native. `PortalUI` re-export component chung để tránh hai implementation modal/badge.
3. **Nội dung và điều hướng:** `Breadcrumb`, `routing/screens.js`, `ServicesCatalog`, các nhãn hiển thị và fixture. Chi tiết dịch vụ dùng tên trả về từ dữ liệu; breadcrumb chỉ liên kết các cấp cha, không thêm Trang chủ.
4. **Migrate màn hình:** thay button/label bằng component chung và đưa spacing chuẩn vào token. Giữ các class cũ để review theo từng màn hình. Prototype grid dùng biến `--grid-columns`, thu về một cột trên mobile; bảng dài cuộn trong vùng bảng.

Danh sách đầy đủ: [FILES_CHANGED.md](FILES_CHANGED.md); danh sách máy đọc: [migrated-components.json](migrated-components.json).

## Quy ước dùng tiếp

| Token | Giá trị |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--ui-primary` | #0f766e |
| `--ui-muted` | #475569 |

- Nhóm nút dùng `ui-actions`, khoảng cách 12px, cách card kế tiếp 16px. Các nhóm cũ có lớp tương thích trong stylesheet chung.
- Button mới truyền `variant="primary"`, `secondary` hoặc `destructive`; dùng `type="button"` cho hành động không gửi form. Suy luận variant từ class chỉ phục vụ các call site cũ.
- Field mới dùng `label`, `helper`, `error` cùng input/select/textarea làm con trực tiếp; tự liên kết label, mô tả và lỗi. Wrapper cũng hỗ trợ htmlFor/children để giữ layout cũ.
- Badge dùng status và label theo nghiệp vụ: xanh cho công khai/đã duyệt, vàng cho chờ, đỏ cho từ chối/lỗi, xám cho nháp/ngừng. `label` cho phép diễn đạt đúng ngữ cảnh (ví dụ yêu cầu PENDING là Chờ phản hồi).
- Modal dùng native dialog, showModal, Escape, trả focus và khóa cuộn nền. Không dựng overlay riêng.
- Focus-visible dùng outline 2px teal, offset 2px. Footer định nghĩa cả màu visited và hover; focus dùng quy tắc toàn cục.

## Kiểm tra

- `npm run build`: thành công; còn cảnh báo bundle lớn hơn 500kB.
- `npm test`: 72/72 qua.
- `scripts/check-design-system.cjs`: Edge headless với API fixture; 27 route × 2 viewport (375/1440px), không lỗi JavaScript hoặc tràn ngang toàn trang.
- Trang dịch vụ ở 375/768/1024/1440px: lề header/breadcrumb/heading/footer lần lượt 16/24/24/144px và bằng nhau trong từng viewport.
- Breadcrumb chi tiết có đường dẫn Dịch vụ và đúng tên dịch vụ từ fixture.
- Modal: Tab giữ focus bên trong, focus ring đúng 2px/2px/teal, Escape đóng và trả focus.
- Mẫu chữ phụ tại danh sách dịch vụ/footer/breadcrumb đạt tương phản >=4.5:1. Đây là kiểm tra mẫu computed style, không phải chứng nhận WCAG cho mọi dữ liệu và trạng thái của ứng dụng.
- `scripts/check-service-requests.cjs`: gửi yêu cầu, payload UTC+7, từ chối từ hàng đợi, hiển thị kết quả và modal ở bốn viewport đều qua sau khi migrate component.
- Bằng chứng: `frontend/migration/design-system-check/` và `frontend/migration/service-request-check/`.

Chạy kiểm tra trình duyệt với Vite tại 127.0.0.1:5176, Playwright có sẵn hoặc đặt `PLAYWRIGHT_MODULE` tới module đã cài, và Microsoft Edge. API ngoài fixture trả lỗi có kiểm soát; kiểm tra giao diện này không thay thế kiểm thử backend thật. Các phần vốn dùng prototype fixture vẫn giữ nguyên nguồn dữ liệu.
