# Phân tích UI UX Pro Max và hướng áp dụng vào HL_RCS

Ngày đọc: 28/10/2026. Nguồn: nhánh `main` của
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
Nhánh có thể thay đổi; lần đọc này chưa xác minh được commit SHA để khóa phiên bản.

## 1. Phạm vi và kết quả

Đã đối chiếu tài liệu/quy trình upstream, thuật toán tìm kiếm, bộ ghép design
system và hướng dẫn React với cấu trúc frontend HL_RCS. Kết quả được lưu thành:

- [`design-system/hl-rcs/MASTER.md`](../design-system/hl-rcs/MASTER.md): quyết định
  theo sản phẩm, vai trò màu, pattern theo khu vực và tiêu chí kiểm tra.
- [`frontend/AGENTS.md`](../frontend/AGENTS.md): hướng dẫn cho các lần sửa frontend
  tiếp theo để quy tắc không chỉ nằm trong lịch sử chat.

Đây là review source tĩnh, không phải audit toàn bộ màn hình bằng trình duyệt.
Chưa chạy generator, chưa cài skill upstream, chưa chỉnh runtime UI. Việc tải
source trực tiếp không thành công trong môi trường hiện tại; các file upstream
dưới đây được đọc qua web. Không tuyên bố đã đọc mọi CSV hoặc chạy test upstream.

## 2. Source upstream hoạt động thế nào

| Thành phần đã đọc | Vai trò | Cách vận dụng |
| --- | --- | --- |
| [SKILL.md](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md) | Chọn workflow, domain và stack | Xác định bối cảnh trước, tra cứu có mục đích |
| [search.py](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/scripts/search.py) | CLI chọn domain/stack, format và persistence | Công cụ tham khảo khi cần, không phải dependency của web |
| [core.py](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/scripts/core.py) | Đọc CSV, chuẩn hóa token, xếp hạng BM25 | Kết quả khớp từ khóa cần được kiểm tra về ngữ cảnh |
| [design_system.py](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/scripts/design_system.py) | Ghép product/style/color/typography/landing với luật | Học cách tổng hợp quyết định thành tài liệu chung |
| [reasoning_contract.py](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/scripts/reasoning_contract.py) | Parse/validate luật JSON và tín hiệu điều kiện | Phân biệt luật thiết kế với suy luận đã kiểm chứng |
| [quick-reference.md](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/references/quick-reference.md) | Danh mục kiểm tra UX | Dùng từng tiêu chí phù hợp web |
| [pro-rules.md](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/references/pro-rules.md) | Quy tắc có phạm vi native/mobile | Không chuyển nguyên đơn vị/kết luận native sang web |
| [stacks/react.csv](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/data/stacks/react.csv) | Hướng dẫn triển khai React | Đối chiếu phiên bản và vấn đề thực tế |

Luồng cốt lõi là query → dữ liệu CSV → xếp hạng → luật lựa chọn → đề xuất.
Phần Python đã đọc không tự huấn luyện mô hình hoặc tự chứng minh hiệu quả UX.

## 3. Những điểm cần tư duy phản biện

1. **Kết quả tìm kiếm không phải kết quả nghiên cứu người dùng.** BM25 xếp hạng
   độ liên quan từ vựng; gợi ý đẹp hoặc đúng ngành chưa chứng minh người dùng
   tìm phòng nhanh hơn hay staff duyệt hồ sơ ít lỗi hơn.
2. **Không gộp toàn bộ app vào một nhóm sản phẩm.** HL_RCS có discovery, form và
   công việc vận hành. Một prompt rộng dễ tạo hướng thiết kế hợp landing page
   nhưng kém hiệu quả cho bảng quản lý hoặc quy trình duyệt hồ sơ.
3. **Phải kiểm tra phạm vi của hướng dẫn.** Upstream có cả web và native; tên
   domain không đủ để kết luận mọi kết quả phù hợp browser. Đơn vị pt/dp và
   gesture native không chuyển trực tiếp thành yêu cầu CSS.
4. **Màu gợi ý không đảm bảo tương phản.** Phải đo cặp foreground/background,
   opacity và trạng thái. Bảng màu có nhãn accessibility vẫn cần kiểm tra UI thật.
5. **Không tối ưu React theo công thức.** Không tự thêm memo/useMemo/useCallback
   vào mọi component hoặc kết luận inline style là nút thắt hiệu năng khi chưa đo.
6. **“Học” phải được lưu có chủ đích.** Tài liệu trong repo giúp tái sử dụng quyết
   định; không đồng nghĩa trọng số mô hình đã thay đổi hay skill đã được cài.

## 4. Nền tảng hiện tại đáng giữ

- Stack được xác nhận từ [`frontend/package.json`](../frontend/package.json):
  React/Vite, React Router, CSS thuần, Lucide và Leaflet.
- [`frontend/index.html`](../frontend/index.html) đã khai báo tiếng Việt, viewport
  và tải Plus Jakarta Sans. Không có cơ sở đổi font chỉ vì một palette gợi ý.
- [`AccommodationResults`](../frontend/src/components/AccommodationResults.jsx)
  đã phân biệt loading/error/empty và có retry; card có ảnh lỗi/fallback.
- [`useAccommodations`](../frontend/src/hooks/useAccommodations.js) đã debounce
  200ms, abort request và tránh trả dữ liệu của query cũ. Search giữ bộ lọc trên URL.
- [`FormField`](../frontend/src/components/FormField.jsx) đã liên kết label,
  `aria-invalid` và thông báo lỗi; nút hiện mật khẩu có tên và trạng thái.
- [`PortalUI.Modal`](../frontend/src/components/PortalUI.jsx) dùng native dialog;
  không nên quy tất cả modal thành cùng một lỗi chỉ vì tên component giống nhau.
- Map/services có thông báo fixture; chính sách dữ liệu phòng và chi phí được
  mô tả tại [`accommodations.md`](accommodations.md). Đây là nền tảng niềm tin cần giữ.

## 5. Điểm cải thiện theo mức ưu tiên

P1: ảnh hưởng khả năng đọc, thao tác hoặc niềm tin; P2: tính nhất quán và hiệu quả.
Các mục dưới đây là phát hiện/đề xuất, **chưa được sửa trong lần review này**.

| Mức | Bằng chứng trong source hiện tại | Tác động và hướng xử lý |
| --- | --- | --- |
| P1 | `auth.css` có `.primary-button` nền `#0d9488`, chữ trắng; `portal.css` có cặp tương tự ở `.p-button.primary` | Cặp màu đặc ≈3.74:1, không đủ 4.5:1 cho chữ thường. Đề xuất action `#0f766e` với trắng ≈5.47:1; kiểm tra cả state và cascade trước khi sửa |
| P1 | `HomePage.jsx` có “số 1”, “xác thực 100%”, “24/7” hardcode | Phần source đã đọc chưa cung cấp chứng cứ xếp hạng, phạm vi kiểm chứng hoặc cam kết trực hỗ trợ. Xác nhận chính sách hoặc viết đúng năng lực có thật; không suy từ hồ sơ APPROVED |
| P1 | `components/common/Modal.jsx` có Escape và scroll lock, chưa có logic đặt/giữ/trả focus | Người dùng bàn phím có nguy cơ thao tác vào nền. Kiểm tra các caller rồi bổ sung quản lý focus hoặc hợp nhất với dialog phù hợp; không sửa nhầm `PortalUI.Modal` đang được trang chi tiết dùng |
| P2 | Focus/reduced-motion có ở một số stylesheet nhưng theo phạm vi riêng; `portal.css` giảm transition nhưng không giảm toàn bộ animation | Kiểm tra computed style và các loader/motion thực dùng; bổ sung quy tắc ở đúng layer. Không khẳng định mọi control hiện thiếu focus vì một số vẫn có focus mặc định |
| P2 | Teal được khai báo ở `styles.css`, `auth.css`, `portal.css`, đồng thời có nhiều giá trị inline | Dễ lệch visual state; chuẩn hóa token theo vai trò và chuyển dần component liên quan. Đổi riêng một biến không xử lý hết các màu hardcode |
| P2 | `Pagination.jsx` dùng nút số 32×32 và chưa có `aria-current` | Bổ sung ngữ nghĩa trang hiện tại, cân nhắc vùng bấm mobile lớn hơn. 32px tự nó không chứng minh vi phạm WCAG AA 24px |
| P2 | `styles.css` có `form` và nhiều selector chung; nhiều CSS màn hình được import cùng app | Khi sửa cần kiểm tra xung đột selector/cascade, scope theo component. Không mặc định nguyên nhân mọi lỗi bố cục đều do một file global |

Các bằng chứng màu được tính bằng công thức relative luminance sRGB, làm tròn
hai chữ số; đây là kiểm tra toán học từ token, chưa phải kết quả browser audit.
Chuẩn tham chiếu:
[W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 6. Thứ tự triển khai được đề xuất

1. Sửa cặp màu chữ/CTA và nội dung cam kết thiếu căn cứ trong phạm vi màn hình
   được chọn; kiểm tra hover, focus, disabled và trạng thái mobile.
2. Xử lý khả năng dùng bàn phím của common modal và thống nhất component khi
   hợp đồng caller cho phép; kiểm tra Tab/Shift+Tab/Escape/trả focus thực tế.
3. Chuẩn hóa token và state dùng chung dần; giữ nguyên dữ liệu, route và vai trò.
4. Tinh chỉnh từng luồng: tìm phòng → chi tiết → liên hệ, rồi đến tác vụ host/staff.
   Chỉ làm UI cho hành động mà backend thực sự hỗ trợ.
5. Thử với người dùng đại diện. Ghi baseline rồi đo tỷ lệ hoàn thành tác vụ,
   thời gian tìm phòng phù hợp, hiểu đúng phí và lỗi khi xử lý hồ sơ. Chưa có
   baseline nên không đặt phần trăm cải thiện giả định làm thành tích.

## 7. Thông tin còn thiếu trước một đợt redesign lớn

- Màn hình/luồng ưu tiên và khó khăn người dùng đang gặp; không thể suy hết từ code.
- Yêu cầu thương hiệu bắt buộc, thiết bị thường dùng, và mục tiêu accessibility.
- Danh mục API thực có ở từng luồng, phạm vi dữ liệu demo và kế hoạch tích hợp.
- Chính sách xác minh, phí, liên hệ và hỗ trợ để viết nội dung chính xác.
- Quan sát sử dụng hoặc thử nghiệm người dùng để kiểm chứng đề xuất thiết kế.

Những thiếu hụt này không ngăn việc sửa các lỗi đã có bằng chứng; chúng giới hạn
độ chắc chắn của quyết định redesign toàn app.
