# Đồng bộ tài liệu với source ngày 2026-11-28

Phạm vi: các điểm đã phát hiện trong lượt review SRS và tài liệu dự án. Đối chiếu working tree hiện tại, bao gồm các thay đổi chưa commit. Không thay đổi code ứng dụng, không chạy migration hay truy vấn database live. Các yêu cầu của module khác chưa được kiểm toán lại toàn bộ.

## Bản SRS

Bản gốc được giữ nguyên tại `D:/Download/Report-3_Software Requirement Specification (1).docx`. Bản đã sửa: [Report-3_SRS_Source-Synchronized.docx](../outputs/doc-sync-20261128/Report-3_SRS_Source-Synchronized.docx).

| Vị trí | Nội dung đã sửa | Căn cứ nguồn |
| --- | --- | --- |
| 3.3 Data Business Rules | Bỏ bảng quy tắc tuyển dụng lẫn từ template: Candidate, Job Posting, Interviewer, CV, Internal Notes và quy tắc username không phù hợp. Giữ bảng quy tắc HL-RCS. | Entity/API hiện tại không dùng mô hình tuyển dụng này. |
| 3.3 và danh sách use case dịch vụ | Đổi kiểm tra tên trùng thành không phân biệt hoa/thường; phân biệt thêm dịch vụ, proposal cập nhật và gỡ trực tiếp. | `ServiceRegistrationService.submit/change/remove` |
| UC-7.1 E4.2; BR-34 | Phân biệt onboarding chưa có capability với chủ dịch vụ đã có capability ACTIVE được đăng ký nhiều dịch vụ. PENDING/NEEDS_SUPPLEMENT chặn onboarding; hồ sơ đã APPROVED nhưng capability không ACTIVE cũng không tự mở onboarding mới. | `ServiceRegistrationService.restriction/submit` |
| UC-7.2 | CREATE/UPDATE lưu proposal; UPDATE không đổi snapshot công khai trước duyệt. Bổ sung ownership, capability, revision, tên trùng và hồ sơ đang xử lý. | `ServiceRegistrationService.change`; `StaffService` |
| UC-7.3; BR-36 | Đổi Deactivate thành Remove: xác nhận một lần, không lý do, không chờ duyệt; DELETED, tăng revision và OWNER_REMOVED trong transaction. Giữ dữ liệu/lịch sử/capability và dịch vụ khác. Ghi rõ DELETE proposal là luồng tương thích cũ. | `ServiceRegistrationController.remove`; `ServiceRegistrationService.remove` |
| UC-7.3 và ma trận quyền | Ghi rõ 404 khi không tồn tại/không sở hữu; 409 khi revision cũ, đã DELETED, thiếu hồ sơ gốc hoặc có thay đổi đang xử lý. Phân biệt backend không kiểm tra capability ACTIVE với web vẫn khóa nút Gỡ nếu capability không ACTIVE. | `ServiceRegistrationService.remove`; `ServiceManagement.jsx` |
| BR-34; BR-38 và tóm tắt đăng ký | Tài liệu xác minh tùy chọn, tối đa 5 nếu gửi; đăng ký mới bắt buộc 1–5 ảnh JPG/PNG/WebP, mỗi ảnh tối đa 5 MB. Cập nhật/bổ sung giữ ảnh cũ nếu không gửi bộ ảnh mới. | `submit`, `saveImages`, `validateImage`, `resubmit` |
| BR-45; MSG60; luồng 2.5 | Xác nhận yêu cầu dịch vụ đã được lưu thật: PENDING → ACCEPTED/REJECTED, quyền khách/chủ dịch vụ, thời gian tương lai, lý do từ chối, revision và lịch sử xử lý. Không khẳng định có payment/completion/cancellation/notification delivery. | `ServiceRequestController`; `ServiceRequestService` |
| Ma trận quyền dịch vụ | Bỏ N/I ở yêu cầu dịch vụ; dùng điều kiện ownership thay cho từ chối mọi role. Tách gỡ trực tiếp khỏi toggle active; sửa tham chiếu footnote sai ở các hàng dịch vụ. | Các controller/service trên; kiểm tra quyền từ principal |
| MSG09 | Google sign-in đã có backend; không còn mô tả là chưa triển khai. | `AuthController.googleLogin`; `AuthServiceImpl`; `GoogleTokenVerifier` |
| Bìa, Change Log, mục lục | Cập nhật tháng/năm và ghi lịch sử sửa; cập nhật TOC từ headings thật, loại placeholder cũ và tên JOB không còn khớp; sửa paragraph chứa ảnh bị gán Heading làm ảnh xuất hiện trong TOC. | Headings thực tế của chính bản Word |

## Tài liệu repository

| File | Nội dung đã sửa |
| --- | --- |
| [ENTITY_CATALOG.md](ENTITY_CATALOG.md) | Dựng lại từ source: 53 entity, 2 embeddable, 12 enum độc lập và 6 enum lồng trong entity. Liệt kê tất cả field, kiểu, cột, annotation mapping, index/unique và các khác biệt tên bảng/cột so với SQL tham khảo. Bổ sung đầy đủ các trường User và module mới. |
| [ERD.md](ERD.md) | Dựng lại sáu nhóm sơ đồ từ quan hệ JPA hiện tại, bao phủ 53 entity và bảng element collection; 77 cạnh quan hệ/collection. Không biến ID scalar thành FK và không suy diễn cascade. |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Cập nhật số lượng mapping, SQL tham khảo có 31 bảng; xác nhận Google sign-in và yêu cầu dịch vụ đã có code; đánh dấu phần mô tả tích hợp frontend cũ là snapshot lịch sử. |
| [SERVICE_MANAGEMENT.md](SERVICE_MANAGEMENT.md) | Thống nhất gỡ trực tiếp và DELETE legacy; tài liệu tùy chọn/ảnh bắt buộc; điều kiện endpoint khác nút web; API danh sách chủ sở hữu có thể trả DELETED nhưng web lọc khỏi card. Giữ các cập nhật có sẵn trước lượt sửa này. |
| [SERVICE_REQUESTS.md](SERVICE_REQUESTS.md) | Thay mô tả xóa phải chờ duyệt bằng luồng gỡ hiện hành; sửa mô tả endpoint danh sách; giữ kết quả test cũ dưới nhãn lịch sử. |

## Kiểm tra

- So sánh số entity và field với khai báo Java; kiểm tra đủ node entity trong ERD, enum độc lập và enum lồng.
- Kiểm tra tên bảng/cột với `sql/schema.sql`; đây chỉ là so sánh nguồn, không xác minh schema đang chạy.
- Bản Word được mở/lưu bằng Microsoft Word để cập nhật mục lục và xuất PDF phục vụ kiểm tra. Công cụ `render_docx.py` không chạy được do môi trường Windows không có LibreOffice; dùng Word và PDFium thay thế.
- Không chạy lại test backend/frontend vì chỉ sửa tài liệu. Số test trong các mục lịch sử không phải kết quả kiểm thử mới.
