# Quy ước UI/UX cho HL_RCS

Ngày lập: 28/10/2026. Phạm vi: web app React trong `frontend/`.

Đây là định hướng được biên soạn từ source hiện tại và việc đọc UI UX Pro Max.
Các đề xuất dưới đây dùng cho lần triển khai UI tiếp theo; chúng chưa tự thay đổi
CSS hoặc giao diện đang chạy. Đây không phải output của `search.py`.

## 1. Mục tiêu sản phẩm

Giúp người thuê tìm phòng phù hợp, hiểu chi phí và liên hệ chủ trọ; giúp chủ trọ
quản lý nhà/phòng; giúp staff xử lý hồ sơ; giúp admin theo dõi và điều phối.

Thứ tự quyết định: đúng dữ liệu/nghiệp vụ → thao tác hoàn thành được → truy cập
được → dễ đọc trên thiết bị phù hợp → nhất quán → hiệu ứng trang trí.

Người dùng sinh viên và người thuê quanh Hòa Lạc là bối cảnh sản phẩm trong
README. Tỷ lệ dùng mobile, chất lượng mạng và nhu cầu cụ thể vẫn là giả định cần
xác nhận bằng quan sát hoặc thử nghiệm người dùng.

## 2. Nền tảng giữ lại

- React 19, Vite, React Router, CSS thuần và `lucide-react` trong package hiện tại.
- Hệ màu teal/slate; nền sáng và card trắng; đường viền nhẹ, góc bo vừa phải.
- Plus Jakarta Sans đã được khai báo và tải trong `frontend/index.html`, kèm
  system font fallback. Kiểm tra dấu tiếng Việt và việc xuống dòng khi font lỗi.
- Tận dụng `AccommodationCard`, `AccommodationResults`, `FormField`, pagination,
  trạng thái dữ liệu và các component portal hiện có sau khi kiểm tra hợp đồng.

Không cần thêm Tailwind, Shadcn, GSAP hoặc font thứ hai chỉ để áp dụng tài liệu
này. Chọn thư viện khi một yêu cầu thực tế chứng minh được lợi ích.

## 3. Màu theo vai trò

Các tên token sau là đề xuất để bổ sung dần, chưa phải biến đã tồn tại trong CSS.
Giữ tương thích với `--primary`, `--auth-primary`, `--p-primary` khi chuyển đổi;
không thay toàn bộ màu bằng thao tác tìm/thay vì mỗi màu có vai trò khác nhau.

| Vai trò | Giá trị đề xuất | Cách dùng |
| --- | --- | --- |
| Brand | `#0d9488` | Nhấn thương hiệu, trang trí; cân nhắc nền/chữ đi kèm |
| Action | `#0f766e` | Nền CTA có chữ trắng hoặc link trên nền trắng |
| Action hover/pressed | `#115e59` | Phản hồi thao tác trên CTA |
| On action / surface | `#ffffff` | Chữ trên action / bề mặt card |
| Background | `#f8fafc` | Nền trang |
| Text | `#0f172a` | Nội dung chính |
| Text secondary | `#475569` | Mô tả, nội dung hỗ trợ |
| Text muted | `#64748b` | Metadata trên trắng; kiểm tra lại khi đổi nền |
| Border subtle | `#e2e8f0` | Phân nhóm trang trí, không dùng làm dấu hiệu duy nhất của control |
| Success text / background | `#065f46` / `#ecfdf5` | Thành công kèm nhãn |
| Error text / background | `#991b1b` / `#fef2f2` | Lỗi kèm lý do và hướng khắc phục |
| Focus candidate | `#0f766e` | Outline ở nền sáng; đo lại trên nền cụ thể |

Tính trên cặp màu đặc: trắng/brand ≈ **3.74:1**, trắng/action ≈ **5.47:1**.
Với chữ thường, dùng ngưỡng 4.5:1; chữ lớn có ngưỡng 3:1 theo
[W3C SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Kết quả trên chưa tính opacity, ảnh nền, hover hoặc CSS ghi đè. Cần kiểm tra màu
computed trên màn hình cuối cùng; chọn token không thay thế kiểm tra thực tế.

## 4. Chữ, khoảng cách, icon và motion

- Body/form mới: ưu tiên 16px, line-height khoảng 1.5–1.6. Metadata có thể 13–14px
  nếu vẫn rõ. Tránh ép nội dung quan trọng thành nhãn rất nhỏ để vừa bố cục.
- Dùng `rem` cho chữ khi chỉnh cấu trúc; không khóa chiều cao vùng có văn bản dài.
  Tên nhà trọ, địa chỉ và trạng thái tiếng Việt phải xuống dòng hợp lý.
- Thang khoảng cách nền: 4, 8, 12, 16, 24, 32, 48px; ưu tiên nhịp nhất quán
  trong component thay vì áp cùng một độ giãn cho mọi màn hình.
- Tái dùng radius/shadow hiện có; bóng nhẹ cho card, mạnh hơn cho lớp nổi.
- Lucide outline cùng nét; icon nhỏ hơn vùng bấm. Icon cạnh chữ thường là trang
  trí; nút chỉ có icon phải có tên truy cập và trạng thái phù hợp.
- Transition ngắn cho hover/focus; chuyển cảnh theo khoảng cách và mục đích.
  Tôn trọng `prefers-reduced-motion`, bao gồm animation lặp và smooth scrolling.
  Loading vẫn cần thông báo bằng chữ khi giảm motion.

## 5. Quy tắc theo khu vực

| Khu vực | Bố cục và thông tin ưu tiên | Điều kiện hoàn thành |
| --- | --- | --- |
| Home | Tìm phòng dễ thấy, phòng mới từ API, cách hoạt động ngắn gọn | Bộ lọc chuyển đúng sang search; nội dung quảng bá có căn cứ |
| Search | Bộ lọc + kết quả; card có ảnh, giá/tháng, diện tích, địa chỉ, phòng trống | URL giữ bộ lọc; loading/error/empty rõ; quay lại không mất ngữ cảnh |
| Chi tiết | Gallery, thông tin/chi phí, quy định, địa chỉ, liên hệ | Không suy phí thiếu; CTA phản ánh đúng liên hệ hay đặt lịch thật |
| Auth/profile | Form đọc dễ, label/lỗi cạnh trường, giữ dữ liệu khi lỗi | Keyboard/password manager dùng được; báo thành công sau response |
| Host | Điều hướng ổn định, danh sách/bộ lọc, form theo tác vụ | Lưu/validation/quyền đúng API; không ép lại thông tin đã có |
| Staff | Hàng chờ, trạng thái, chứng cứ hồ sơ và hành động xử lý | Biết đã xử lý gì, vì sao, việc tiếp theo; lỗi không làm mất nội dung |
| Admin | Tổng quan và điều phối dựa trên chỉ số có thật | Có kỳ thống kê/đơn vị khi API hỗ trợ; thiếu dữ liệu không biến thành số 0 |

Public cần dễ khám phá; portal có thể dày thông tin hơn. Dùng cùng nền tảng
thương hiệu, nhưng không sao chép hero quảng bá vào dashboard hoặc ép dashboard
thành lưới card lớn nếu tác vụ cần bảng.

## 6. Hợp đồng tương tác

- Link dùng điều hướng, button dùng hành động. Trạng thái disabled có ngữ nghĩa
  và lý do gần thao tác khi người dùng cần biết cách tiếp tục.
- Mỗi màn hình có hành động chính rõ. Thao tác phá hủy dữ liệu cần nêu đối tượng
  và hậu quả; chọn xác nhận/hoàn tác theo nghiệp vụ và API thực có.
- Đối thoại phải quản lý focus, đóng bằng Escape khi phù hợp và trả focus về
  điểm mở. Ưu tiên component hiện có đáp ứng yêu cầu; kiểm tra cả `common/Modal`
  và `PortalUI.Modal` vì chúng hiện là hai triển khai khác nhau.
- Vùng bấm thao tác chính trên mobile hướng tới 44×44 CSS px hoặc lớn hơn.
  Đây là mục tiêu usability của dự án. Web WCAG 2.2 AA quy định 24×24 CSS px
  với các ngoại lệ, không yêu cầu mọi nút phải 44px:
  [W3C SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Focus nhìn thấy được và không bị sticky header/sidebar che. Không dùng
  `outline: none` nếu không có tín hiệu focus thay thế đạt yêu cầu.
- Giữ URL/deep link, Back và phân trang; đổi bộ lọc về trang đầu. Khi tìm kiếm
  nhanh, hủy response cũ và tận dụng debounce hiện có.

## 7. Dữ liệu và niềm tin

Giữ riêng: đang tải, không có kết quả, lỗi, chưa hỗ trợ và thành công. Empty là
kết quả hợp lệ; lỗi mạng không phải “không có phòng”. Đưa ra bước tiếp theo phù
hợp như thử lại, đặt lại bộ lọc hoặc quay về danh sách.

Không tự tạo điểm sao, lượt thuê, tổng phí, tọa độ, khoảng cách hay cam kết xác
thực. Chỉ gắn badge theo trạng thái backend và giải thích đúng phạm vi. Không
suy “đã duyệt hồ sơ” thành “đảm bảo mọi ảnh/giá luôn chính xác”.

Map và services hiện có fixture được gắn thông báo demo; không xóa thông báo
để làm màn hình trông hoàn thiện hơn. Chức năng thiếu API phải nói rõ trạng thái,
không báo lưu/đặt lịch thành công giả. Tham khảo chính sách chi tiết tại
[`docs/accommodations.md`](../../docs/accommodations.md).

## 8. Quy trình áp dụng cho một task UI

1. Đọc màn hình, route, component dùng chung và API liên quan. Xác định tác vụ
   chính, vai trò người dùng, dữ liệu còn thiếu và phạm vi thay đổi.
2. Đọc tài liệu này, chọn pattern phù hợp khu vực. Khi có công cụ tra cứu upstream,
   dùng query hẹp đúng mục đích và `--stack react`; kiểm tra kết quả trước khi dùng.
3. Triển khai theo component/token hiện có. Lưu ngoại lệ theo màn hình trong
   `design-system/hl-rcs/pages/<screen>.md` nếu thực sự cần; nêu lý do và phạm vi.
4. Kiểm tra UI thật: 375/768/1024/1440px theo route liên quan, 200% zoom, bàn phím,
   nhãn dài, dữ liệu rỗng/lỗi, ảnh lỗi, reduced motion và màu ở các trạng thái.
5. Chạy test hiện có liên quan và build khi thay runtime code. Ghi rõ kiểm tra
   nào chưa chạy vì môi trường; không gọi build thành công là xác nhận UX đạt.

Ưu tiên sửa đầu tiên nằm trong [`docs/ui-ux-review.md`](../../docs/ui-ux-review.md).
