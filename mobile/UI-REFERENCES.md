# UI/UX references — HL_RCS

Ngày 2026-11-13. Phạm vi áp dụng đầu tiên: Search/Filter hiện có. Giữ màu teal #086B62, nền #FAFAF7, text #142D29, surface trắng và accent #DDECE6. Không đổi tab, API hoặc chức năng nghiệp vụ.

## Nguồn truy cập thực tế
- https://mobbin.com/discover/apps/ios/top — truy cập được trang shell/login; không đọc được screen/flow Airbnb, Booking hoặc Zillow. Không có Mobbin MCP trong danh sách tool kết nối. Không tuyên bố đã nghiên cứu flow trên Mobbin.
- https://payhip.com/DailyFlutterUI và https://payhip.com/b/n4ZFb — đọc được danh mục/trang giới thiệu Airbnb Clone App UI. Không mua/tải/source code hoặc phân tích flow trả phí. Không dùng tài nguyên thương mại làm asset của app; không coi mô tả sản phẩm là kiểm chứng UX thực tế.
- https://www.airbnb.com/help/article/479 — tài liệu công khai về dùng search filters; cơ sở tham khảo cách thu hẹp theo các nhóm tiêu chí. Không chứng minh typography/spacing/animation hiện tại của app.
- https://www.zillow.com/learn/zillow-advanced-search/ — tài liệu chính thức về search, narrowing, lưu và xem lại listing. Đọc mô tả nhiều bước, không trực tiếp thao tác toàn bộ app Zillow. Không đưa saved-search/map/ranking của Zillow vào HL_RCS khi API không có.
- Chưa phân tích Booking: không có flow truy cập được trong lượt này. Chưa nghiên cứu forms/account flow từ các nguồn trên.

## Audit và lựa chọn
Đọc Explore, HomeSearchBar, FilterBottomSheet và báo cáo SEARCH.md; đối chiếu các screenshot kiểm thử nội bộ320/430. Luồng HL_RCS kiểm thử được: Home search/category → Explore → draft filter → Close hoặc Apply → sort → Room Detail → Back → pagination/empty/error. Đây là luồng của HL_RCS, không phải tuyên bố đã thử app tham khảo.

Ba pattern được chọn (suy luận thiết kế cho HL_RCS từ tài liệu và audit):
1. Search-first + progressive filtering: ô tìm kiếm rồi quick type chips, các tiêu chí sâu ở sheet. Giữ single source of truth và draft/apply. Không mở thêm trang search hoặc nhét mọi field vào màn kết quả.
2. Tách mức ưu tiên: kết quả thật ngoài sheet, số nhóm lựa chọn trong header sheet, CTA chỉ nói hành động. Trước đây Xem kết quả (3) có thể bị hiểu nhầm3 kết quả trong khi đó là3 nhóm filter; nay chuyển thành3 nhóm tiêu chí đã chọn ở header.
3. Results → Detail → Back giữ ngữ cảnh: giữ search/filter/sort và Favorites; không thay đổi navigation/API để bắt chước app khác.

Spacing/typography/cards/empty states được giữ theo tokens và component HL_RCS đã kiểm thử; không gán thông số16/20/24 hoặc animation280ms cho Mobbin/Airbnb khi chưa đo được. Native motion hiện có (sheet slide, press feedback, Reduce Motion) được giữ. Cards vẫn ưu tiên ảnh, giá, diện tích và availability thật. Không chép logo, screenshot hoặc source thương mại.

## Thay đổi lượt này
- src/components/home/filter-bottom-sheet.tsx: đưa số nhóm lọc lên header có live region; CTA Xem kết quả không mang count mơ hồ; xóa hai dòng mô tả kỹ thuật dư thừa; thay VACANT bằng mô tả tiếng Việt cho người dùng. Nội dung sheet ngắn hơn, footer/safe area giữ nguyên.
- src/app/(main)/explore.tsx: thêm checkmark vào quick type chip đang chọn, hỗ trợ nhận biết ngoài màu sắc. Active state vẫn theo applied filter.
- UI-REFERENCES.md: ghi nguồn, giới hạn, quyết định và cách áp dụng cho các lượt thiết kế sau.

## Quy trình tiếp theo
Trước mỗi màn hình: audit code và contract; tìm2–3 pattern phù hợp, kiểm tra nguồn nào đọc được; ghi rõ quan sát so với suy luận; triển khai bằng component native và brand tokens; kiểm tra cả flow lẫn loading/empty/error; typecheck/lint/test; không tuyên bố kiểm thử thiết bị khi chỉ có browser. Tài liệu này là tham chiếu trong repo, không cài MCP/skill mới hay thay quyền truy cập Mobbin.

## Validation
Chạy lại typecheck, lint và5 nhóm test hiện có (58 test). Kiểm tra Search UI fixture ở320/360/390/430, sheet320/430 và Detail/Back; đã đạt, không có pageerror. Không có thiết bị iOS/Android để kiểm tra keyboard, OS font scaling, VoiceOver/TalkBack và Safe Area native. Bộ lọc là preset, đóng bàn phím trước khi mở sheet; không có numeric input mới.

