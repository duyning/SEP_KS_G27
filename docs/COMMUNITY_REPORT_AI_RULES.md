# AI hỗ trợ admin xử lý báo cáo Community

Phiên bản: **REPORT_ASSIST_V1**. Nguồn rule thực thi: `CommunityReportAiPolicy`.
Danh mục này cũng được API trả về để admin xem ngay trong màn hình xử lý report.

## 1. Phạm vi và thẩm quyền

- AI là trợ lý phân tích, không phải người xét duyệt report.
- AI không gọi luồng giữ/ẩn bài, không đóng báo cáo, không thay đổi quyền tài khoản và không gửi kết luận cho người report.
- Admin có thể xử lý thủ công ngay cả khi AI đang chạy, bị tắt, hết hạn mức hoặc gặp lỗi.
- Một quyết định của admin vẫn áp dụng cho tất cả report đang mở của bài, theo luồng hiện có.
- Bài đã được staff/AI duyệt trước đây không đồng nghĩa bài không thể vi phạm sau đăng. Kết quả duyệt cũ không dùng để bác bỏ report.
- Số report chỉ phục vụ thống kê/tổng hợp, không phải bằng chứng vi phạm. Không có ngưỡng “đủ N report thì ẩn”.

## 2. Dữ liệu AI thực sự được xem

Mỗi report được phân tích riêng, gồm:

1. Chuyên mục, tiêu đề, mô tả, khu vực và giá/thỏa thuận của bài.
2. Loại lý do report và mô tả do người report nhập.
3. Từng ảnh/video gốc của bài.
4. Một ảnh bằng chứng riêng của lượt report, nếu có.

Các tệp được kiểm tra lần lượt; mỗi yêu cầu gửi tối đa một tệp. Bối cảnh bài/report
được gửi kèm mỗi lần. Video dùng cơ chế upload/xử lý/xóa tệp Gemini đã có; ảnh dùng
dữ liệu nhị phân gốc. Không tải thêm URL do người dùng nhập và không tra cứu Internet.
Tên người dùng, email, tên người report và thông tin đăng nhập không được thêm vào
bối cảnh AI. Tuy nhiên, nội dung/ảnh do người dùng nhập có thể chứa thông tin cá nhân.

Ảnh bằng chứng là dữ liệu riêng, chỉ admin được xem qua API hiện có. AI không coi
ảnh này là ảnh mà tác giả đã đăng. Ảnh chụp hội thoại có thể bị chỉnh sửa; không
khẳng định được danh tính, nguồn gốc hay tính xác thực của giao dịch chỉ từ ảnh.

## 3. Rule nội dung cụ thể

| Mã | Điều kiện cần kiểm tra | Cách xử lý |
| --- | --- | --- |
| EXPLICIT_SEXUAL | Hành vi tình dục, bộ phận sinh dục hoặc khỏa thân mang tính tình dục rõ ràng trong bài/tệp của bài. | Có thể đề xuất admin xem xét ẩn nếu thấy rõ. Bikini, vai trần, bán thân hoặc trang phục thông thường không tự động vi phạm. Không rõ thì cần xác minh. |
| THREATS_HARASSMENT | Đe dọa gây hại, quấy rối nhắm vào một đối tượng, miệt thị rõ ràng. | Phải chỉ được nội dung/tệp làm căn cứ; không suy đoán ý định khi ngữ cảnh mơ hồ. |
| GRAPHIC_VIOLENCE | Bạo lực đẫm máu hoặc thương tích nghiêm trọng rõ ràng. | Không đánh đồng cảnh sinh hoạt/sửa chữa thông thường với bạo lực. Không mô tả chi tiết phản cảm trong giải thích. |
| ILLEGAL_TRADE | Nội dung chào bán hàng hóa/dịch vụ bị cấm rõ ràng. | Không gán tính bất hợp pháp chỉ từ tên một đồ vật thông thường; không chắc thì chuyển admin. |
| EXPLICIT_SCAM | Thủ đoạn gian dối thể hiện trực tiếp trong dữ liệu bài. | Giá thấp hoặc yêu cầu cọc đơn lẻ không chứng minh lừa đảo. Cáo buộc về một giao dịch bên ngoài cần admin kiểm tra. |
| SPAM | Quảng cáo rác hoặc lặp vô nghĩa rõ ràng trong chính bài. | Không tự kết luận đăng trùng vì chưa so sánh bài khác; liên hệ Facebook/Zalo/số điện thoại hợp lệ không tự động là spam. |
| DIRECT_CONTRADICTION | Hai thông tin cụ thể trong bài mâu thuẫn trực tiếp. | AI phải trích riêng hai đoạn khác nhau và backend kiểm tra chúng có thật trong bài. Không có giá/để thỏa thuận không phải mâu thuẫn. |
| OFF_TOPIC | Ảnh/video gốc rõ ràng không liên quan chuyên mục, tiêu đề và mô tả. | Chỉ áp dụng khi thực sự xem được tệp của bài. Bản đồ, lối vào, hóa đơn và bối cảnh hỗ trợ có thể liên quan. Không bắt lỗi chỉ vì chi tiết nền. |
| UNVERIFIABLE_CLAIM | Nhận cọc rồi chặn, đồ/phòng khác thực tế, mạo danh, quyền sở hữu, đăng trùng, tranh chấp ngoài hệ thống. | Cần admin xác minh. AI không được suy từ vẻ bình thường của bài rằng report là sai. |
| INSUFFICIENT_EVIDENCE | Cáo buộc chưa cụ thể, ảnh mờ/không đọc được, không rõ ngữ cảnh, bằng chứng không liên quan hoặc đánh giá không chắc chắn. | Cần admin xem xét; không mặc định giữ hay ẩn bài. |
| NO_VISIBLE_VIOLATION | Chưa thấy vi phạm trong phần dữ liệu đã được kiểm tra. | Chỉ là nhận xét có giới hạn, không chứng minh người đăng uy tín, giao dịch an toàn hoặc report sai. |

Các trường **không được lấy làm lỗi**: để giá thỏa thuận; không có ảnh/video vì
đây là phần tùy chọn; thiếu Facebook/Zalo; người report không đồng ý về giá.

## 4. Ràng buộc backend, ngoài prompt

- Chỉ chấp nhận các assessment/rule trong danh mục, giới hạn chiều dài các chuỗi kết quả.
- Trích dẫn bài/report phải là đoạn có thật trong dữ liệu đã gửi. Trích dẫn không khớp nguyên văn bị hạ thành cần admin xem xét; ý nghĩa/ngữ cảnh vẫn cần admin kiểm tra.
- Với vi phạm trong chữ bài, phải có trích dẫn bài; với tự mâu thuẫn phải có hai trích dẫn khác nhau.
- OFF_TOPIC không được kết luận chỉ từ nội dung chữ hoặc ảnh bằng chứng của reporter.
- Vi phạm chỉ xuất hiện trong ảnh bằng chứng không đủ để gán vi phạm cho bài; backend hạ về cần admin xác minh.
- Safety block/refusal của nhà cung cấp được xem là thiếu dữ liệu, không phải bằng chứng nội dung chắc chắn vi phạm.
- Lý do FRAUD, MISLEADING hoặc SPAM mà không tìm được vi phạm trực tiếp sẽ được giữ ở mức cần admin xác minh, kể cả model trả lời rằng bài trông bình thường.
- Nội dung bài/report/tệp/tên tệp đều là dữ liệu không đáng tin cậy. Prompt yêu cầu bỏ qua mọi chỉ dẫn trong đó; model không được cấp công cụ hay quyền thực hiện hành động.

Các ràng buộc này hạn chế kết luận thiếu căn cứ; chúng **không bảo đảm AI luôn
nhận diện đúng**. Ngữ nghĩa, nguồn gốc bằng chứng và sự thật ngoài hệ thống vẫn cần người kiểm tra.

## 5. Cách tạo đề xuất

Mỗi bước trả một assessment:

- `VIOLATION`: nhận diện một vấn đề rõ ràng theo rule trực tiếp.
- `NEEDS_REVIEW`: cần người xác minh hoặc dữ liệu chưa đủ.
- `NO_VISIBLE_VIOLATION`: chưa thấy vi phạm trong phần dữ liệu đó.

Một lượt report chỉ có đề xuất còn hiệu lực khi tất cả bước của lượt đó hoàn tất:

- `SUGGEST_HIDE`: có ít nhất một vi phạm trực tiếp đủ điều kiện từ **bài/tệp của bài**.
- `ADMIN_REVIEW`: không có vi phạm trực tiếp đủ điều kiện, nhưng còn điểm cần xác minh.
- `SUGGEST_KEEP`: các bước đều chưa thấy vi phạm và không vướng ràng buộc cần xác minh nêu trên.

Tổng hợp theo bài chỉ trình bày đề xuất đầy đủ khi **mọi report đang mở** đều có
kết quả còn hiệu lực. Nếu chưa đủ, trả `INCOMPLETE`, kèm số lượt đã xong/tổng số
lượt đang mở. Khi đã đủ: ưu tiên đề xuất xem xét ẩn nếu có vi phạm trực tiếp;
nếu không có nhưng còn điểm chưa rõ thì cần admin xác minh; chỉ khi còn lại đều
chưa thấy vi phạm mới đề xuất giữ. Đây không phải cơ chế bỏ phiếu theo số report.

Admin phải chọn giữ/ẩn và nhập/chọn lý do như trước; UI không tự chọn hành động
hoặc lý do theo AI. Kết quả AI không bao giờ được dùng để tự động đóng report.

## 6. Hàng đợi, dữ liệu cũ và lỗi

- Report mới tự tạo tác vụ `QUEUED` trong cùng transaction gửi report, khi chức năng bật và có khóa.
- Một worker riêng xử lý lần lượt; không giữ khóa database trong lúc gọi Gemini.
- `RUNNING` hiển thị tiến độ thực tế: 1 bước chữ + mỗi ảnh/video + ảnh bằng chứng.
- Thành công: `READY`. Lỗi mạng, quota hoặc JSON không hợp lệ: `FAILED`, không sinh kết luận tổng hợp.
- Chưa bật/chưa có key: `DISABLED`. Báo cáo cũ chưa có tác vụ: `NOT_ANALYZED`.
- Bài bị xóa/ẩn, report đóng hoặc dữ liệu đổi khi AI đang chạy: bỏ kết quả, `SKIPPED`; không ghi đè quyết định admin.
- Kết quả đã lưu nhưng dấu vân tay dữ liệu/rule/model không còn khớp: `STALE`, loại khỏi đề xuất tổng hợp.
- Báo cáo đã đóng: kết quả trước đó chỉ để tham khảo, không dùng cho quyết định mới.
- Tác vụ chạy quá 15 phút được đánh dấu lỗi. Admin có thể yêu cầu phân tích lại; mỗi report cách lần yêu cầu trước ít nhất 60 giây. Không xếp trùng tác vụ đang chờ/chạy.
- Tiến độ/kết quả được phát tới admin qua realtime Community; không phát nội dung AI/bằng chứng ra công khai hoặc tới người report.

Dấu vân tay gồm phiên bản rule/model, revision và nội dung bài, chuyên mục,
ID tệp bài, loại/mô tả report và việc có bằng chứng. Tệp và nội dung report là bất
biến trong các API hiện tại; thay tệp bài tạo ID mới. Không sử dụng kết quả của một snapshot cho snapshot khác.

## 7. Cấu hình và chi phí

- Dùng chung `community.ai.key` và `community.ai.model` với `GeminiCommunityScanner` hiện có.
- `community.report-ai.enabled` hoặc biến `COMMUNITY_REPORT_AI_ENABLED`: mặc định `true`.
- `community.report-ai.poll-ms`: mặc định 3000 ms; đây là thời gian kiểm tra hàng đợi server, không phải thời gian AI chắc chắn hoàn thành.
- Chức năng report độc lập `community.ai.mode`: dù duyệt bài đang OFF/ASSIST/AUTO, report vẫn chỉ hỗ trợ admin, không có AUTO xử lý report.
- Thiếu key/lỗi Gemini không cản gửi report hoặc xử lý thủ công. Sau khi bổ sung key/khởi động lại, admin dùng nút phân tích cho report cũ.
- Mỗi report cần 1 lần kiểm tra chữ + số tệp của bài + ảnh bằng chứng. Thời gian/quota/chi phí phụ thuộc số report, số tệp, video và cấu hình tài khoản Gemini; việc tái sử dụng key không có nghĩa không phát sinh lượt dùng API.
- Không log key, tệp bằng chứng, prompt hoặc toàn bộ phản hồi nhà cung cấp. Kiểm thử tự động dùng Gemini giả lập và H2, không gọi dịch vụ thật.

## 8. API và kiểm thử demo

Chỉ admin ACTIVE được dùng:

- GET `/api/admin/community/reports/{reportId}/ai`: rule, các kết quả của bài, tiến độ và đề xuất tổng hợp.
- POST cùng URL: xếp hàng phân tích lại các report còn mở, có cooldown.

Các case nghiệm thu:

1. Bài hợp lệ, report nội dung không phù hợp: xem nhận xét có giới hạn, bài/report không tự đổi trạng thái.
2. Report “chuyển cọc rồi bị chặn” nhưng bài bình thường: cần admin xác minh, không bác bỏ report.
3. Chỉ ảnh bằng chứng vi phạm: không gán vi phạm đó cho bài gốc.
4. Nhiều report, có tác vụ chưa xong: trạng thái chưa đủ kết quả tổng hợp.
5. Model bịa trích dẫn: hạ về cần xem xét, không đề xuất ẩn từ trích dẫn đó.
6. Gemini lỗi/quota hoặc chưa có key: admin vẫn giữ/ẩn bài và đóng report bình thường.
7. Admin ra quyết định khi AI đang chạy: kết quả trễ bị bỏ, quyết định admin giữ nguyên.
8. Bài đổi/xóa/ẩn hoặc report đã đóng: kết quả cũ không được dùng như kết quả hiện hành.
9. User/Staff gọi API AI hoặc mở bằng chứng bằng tài khoản khác: bị từ chối theo quyền hiện có.
