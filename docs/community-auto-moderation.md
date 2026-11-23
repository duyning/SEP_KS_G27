# Kiểm duyệt tự động bài viết Community

Đặt `GEMINI_API_KEY` trong biến môi trường của backend và đặt `COMMUNITY_AI_MODE=ASSIST`
để chạy thử trên bài mẫu. `COMMUNITY_AI_MODEL` mặc định là `gemini-3.1-flash-lite`.
Khóa chỉ nằm ở backend. Khi bật kiểm tra, tiêu đề, mô tả và tệp đính kèm được gửi đến
Gemini. Không gửi riêng các trường liên hệ. Video dùng Gemini Files API và được yêu cầu
xóa khỏi dịch vụ sau khi kiểm tra.

| Chế độ | Cách xử lý |
| --- | --- |
| `OFF` (mặc định) | Staff duyệt tay. Hàng đợi AI tạm dừng. |
| `ASSIST` | AI kiểm tra bài mới và các lần gửi lại. Staff xem kết quả và quyết định. |
| `AUTO` | Bài qua tất cả kiểm tra được duyệt. Nếu phát hiện ảnh rõ ràng không liên quan và các kiểm tra còn lại đều đạt, bài được yêu cầu chỉnh sửa. Cảnh báo an toàn, kết quả chưa rõ và lỗi vẫn do staff xử lý. |

Quản trị viên có thể đổi chế độ khi backend đang chạy. Gửi bearer token của tài khoản
admin vào `GET /api/staff/community/posts/auto-moderation` để xem cấu hình hiện tại, hoặc
`PUT` cùng đường dẫn với JSON `{"mode":"OFF"}`, `{"mode":"ASSIST"}` hay `{"mode":"AUTO"}`.
Công tắc áp dụng cho tiến trình backend hiện tại. Khi khởi động lại, ứng dụng đọc chế độ
từ biến môi trường. Nếu chạy nhiều instance, cần đồng bộ cấu hình trước khi bật tự duyệt.

Khi chuyển từ `OFF`/`ASSIST` sang `AUTO`, hoặc khởi động backend ở `AUTO`, hệ thống
đưa cả các bài cũ còn `PENDING` vào hàng đợi. Mỗi nhịp worker chuẩn bị tối đa 25 bài,
theo ID tăng dần; việc gọi Gemini vẫn xử lý lần lượt như trước. Bài chưa từng có tác vụ
được tạo tác vụ; bài từng quét trong ASSIST hoặc đã kết thúc quét được kiểm tra lại,
không dùng kết quả cũ để duyệt ngay. Tác vụ AUTO còn đang chờ được giữ nguyên, không tạo
trùng tác vụ cho cùng bài/phiên bản. Không động đến bài đã duyệt, bị ẩn, bị từ chối
hoặc đang yêu cầu chỉnh sửa. Trạng thái/phiên bản được kiểm tra lại dưới khóa trước
khi xếp hàng và trước khi quyết định, nên quyết định của staff không bị AI ghi đè.

Mỗi lần bật AUTO chỉ quét hàng đợi cũ một lượt; bấm AUTO lần nữa khi đã AUTO không
chạy lại toàn bộ. Kết quả lỗi/cảnh báo giữ bài chờ staff, không gọi AI lặp vô hạn.
Muốn thử lại những bài này có thể chuyển OFF rồi bật AUTO lại. Việc quét lại ảnh/video
vẫn sử dụng quota Gemini theo cấu hình hiện tại.

Tác vụ đang chạy khi đổi chế độ có thể lưu kết quả tham khảo nhưng không được chốt
quyết định. Bài đã qua duyệt tay vẫn giữ kết quả quét về sau trong chi tiết dành cho
staff. Staff có thể mở chi tiết để xem tệp bị đánh dấu và mốc video nếu AI xác định được.

Staff API trả `revision` trong chi tiết và nhận trường đó khi gửi quyết định. Client cũ
có thể bỏ qua cho lần gửi đầu (revision 0). Bản gửi lại cần gửi đúng revision. Máy chủ
trả `409` nếu bài đã được xử lý hoặc staff đang xem phiên bản cũ.

Khi chạy thử, so sánh kết quả AI với staff trên bài chữ, bài có ảnh hợp lệ, ảnh lệch
chủ đề, video, bài gửi lại và lỗi nhà cung cấp trước khi bật `AUTO`.
