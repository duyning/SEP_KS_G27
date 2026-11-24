# Tìm trọ theo vị trí và gợi ý AI

## Hợp đồng API vị trí

`GET /api/properties/search?originLat=21.01354&originLng=105.52522&radiusKm=1&sort=nearest&availableOnly=true&page=0&size=6`

- Gửi cả hai tọa độ hoặc bỏ cả hai. Vĩ độ thuộc [-90, 90], kinh độ thuộc [-180, 180]. Bán kính tính bằng km, thuộc (0, 50] và yêu cầu có điểm gốc. `sort=nearest` cũng yêu cầu điểm gốc. Giá trị sai trả HTTP 400.
- Khoảng cách đường thẳng Haversine tính từ hồ sơ đã duyệt. Bán kính bao gồm ranh giới. Sắp gần nhất đưa phòng thiếu tọa độ xuống cuối, rồi dùng `roomTypeId` tăng dần khi bằng khoảng cách. Khi lọc bán kính, các phòng thiếu tọa độ bị loại trước khi đếm và phân trang.
- `distanceKm` bằng `null` khi thiếu điểm gốc hoặc tọa độ nhà trọ. Hai endpoint chi tiết `/api/properties/{propertyId}/room-types/{roomTypeId}` và `.../details` nhận cùng cặp tọa độ. Chi tiết đầy đủ trả giá trị trong `data.summary.distanceKm`. UI định dạng tối đa hai chữ số thập phân.
- `availabilityStale` chỉ bật khi lần xác nhận tình trạng của cả loại phòng đã quá bảy ngày. API cũng trả mốc UTC `availabilityConfirmedAt` và trạng thái `availabilityConfirmationStatus` theo hợp đồng của Ninh. Nhà trọ có `properties.reverification_required=true` bị loại khỏi API công khai. Hồ sơ cũ chưa có cờ được xem như `false`.

Ví dụ JSON cho một kết quả ở điểm gốc:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "propertyId": 12,
        "roomTypeId": 34,
        "propertyName": "Nhà trọ DEMO",
        "roomTypeName": "Studio",
        "address": "Tân Xã, Hòa Lạc",
        "imageUrl": null,
        "price": 2200000,
        "areaSqm": 25,
        "verificationStatus": "APPROVED",
        "availableRooms": 2,
        "capacity": 2,
        "amenities": ["airConditioner"],
        "electricityPrice": null,
        "waterPrice": null,
        "latitude": 21.01354,
        "longitude": 105.52522,
        "distanceKm": 0,
        "availabilityConfirmedAt": null,
        "availabilityConfirmationStatus": "UNCONFIRMED",
        "availabilityStale": false
      }
    ],
    "page": 0,
    "size": 6,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

| Điểm kiểm thử | Vĩ độ | Kinh độ | Kết quả với bán kính 1 km |
|---|---:|---:|---|
| Tại điểm gốc | 21.01354 | 105.52522 | 0 km |
| Trong bán kính | 21.01854 | 105.52522 | Khoảng 0,56 km |
| Đúng biên | 21.022533216059187 | 105.52522 | 1 km |
| Ngoài bán kính | 21.04354 | 105.52522 | Bị loại |
| Thiếu tọa độ | null | null | Bị loại |

## Gợi ý phòng

`POST /api/properties/recommendations` yêu cầu đăng nhập. Body gồm `description` và `clarification` tùy chọn, mỗi trường tối đa 1.200 ký tự. Với mô tả gồm mức giá tối đa hoặc tiện nghi phổ biến và mọi tiêu chí đều nhận diện được, backend tìm phòng trực tiếp. Trao đổi có câu trả lời bổ sung hoặc mô tả ngoài phạm vi này được gửi tới Gemini để chuẩn hóa ngân sách/tháng, khu vực, loại phòng, sức chứa tối thiểu, diện tích tối thiểu và tiện nghi. API trả `CLARIFY` kèm `question`, `EMPTY` hoặc `RESULTS`.

Server đối chiếu tiêu chí với dữ liệu các loại phòng công khai còn chỗ. Mỗi tiêu chí có trọng số bằng nhau. Điểm bằng số tiêu chí khớp chia cho tổng số tiêu chí, nhân 10 và làm tròn một chữ số thập phân. Ví dụ, phòng khớp 3/4 tiêu chí đạt 7,5/10. API trả tối đa 6 loại phòng khớp ít nhất một tiêu chí, ưu tiên điểm cao, xác nhận còn trống gần đây, giá thuê thấp hơn và ID nhỏ hơn khi các điều kiện trước bằng nhau. Mỗi kết quả có thêm `match.score`, `match.matchedCriteria` và `match.unmatchedCriteria`. Nếu lần gọi Gemini cuối cùng hết thời gian chờ, API trả 504 để giao diện hiện nút thử lại và mở bộ lọc.

Backend đọc khóa theo thứ tự `ACCOMMODATION_AI_KEY`, `GEMINI_API_KEY`, rồi cấu hình `property.description.ai.key` dùng cho tạo mô tả nhà trọ. Model mặc định của Trọ Mây là `gemini-3.5-flash-lite` (`ACCOMMODATION_AI_MODEL`). Khi có model dự phòng, backend chờ model chính tối đa 7 giây. Nếu model chính hết thời gian chờ hoặc trả HTTP 502, 503, 504, backend tự thử một lần trong tối đa 5 giây với `gemini-3.1-flash-lite` (`ACCOMMODATION_AI_FALLBACK_MODEL`). Nếu tắt model dự phòng bằng giá trị rỗng, model chính có tối đa 12 giây.

## Smoke test demo

1. Dùng database dev đã khởi động qua Spring Boot và chạy `sql/seed-accommodations-demo.sql`. Dữ liệu DEMO có cả phòng trống, hết phòng, xác nhận cũ và nhà trọ ẩn hoặc chờ duyệt.
2. Vào `/map`, chọn **Trong 1 km từ ĐH FPT**, đổi sang danh sách, mở chi tiết. Kiểm tra cùng một khoảng cách và xóa điểm gốc để trở về tìm kiếm thông thường.
3. Đăng nhập Member, lưu hai loại phòng, chọn chúng tại trang tìm kiếm và mở **So sánh ngay**. Đối chiếu hàng khoảng cách với chi tiết.
4. Từ `/search`, mở **Tìm phòng bằng AI**. Thử nhu cầu rõ, thiếu thông tin, ngân sách không khớp và lỗi nhà cung cấp. Khi có khóa dev, kiểm tra ít nhất một phản hồi Gemini thật.
5. Chạy `mvn -Dtest=AccommodationTests test` và `pnpm build`. Dùng `frontend/tests/search-origin.test.js` để kiểm tra truyền tọa độ, reset trang và định dạng khoảng cách.
6. Để chạy tự động với fixture, mở Vite cổng 5174 bằng `npm run dev -- --port 5174 --strictPort`, đặt `VITE_MAP_PROVIDER=osm` nếu máy đang bật Google Maps, rồi chạy `node scripts/check-location-search-ai.cjs` từ `frontend`. Script dùng Playwright và Edge, có thể chỉ đường dẫn module qua `PLAYWRIGHT_MODULE`.

Fixture thời điểm xác nhận và tái xác minh đến từ `NingDD`. Seed có 24 nhà trọ demo, 48 loại phòng và 144 phòng vật lý. Chạy lại seed chỉ bổ sung bản ghi còn thiếu. Nếu đã nạp bộ demo cũ, dùng các tên dưới đây để kiểm tra vì chúng thuộc nhóm mới.

| Ca thử | Dữ liệu demo |
|---|---|
| 0 km và hai mức giá đúng biên | Cổng FPT, giá 1.500.000 và 2.500.000 đ |
| Hai nhà cùng tọa độ và phân trang gần nhất | Đường Tre Tân Xã và Ngõ Sấu Tân Xã |
| Đúng biên 1 km và vừa ngoài biên | Mốc Một Km và Sau Mốc Một Km |
| Thiếu cả cặp hoặc thiếu một tọa độ | Thiếu Tọa Độ và Tọa Độ Một Phần |
| Còn phòng, hết phòng và chờ tái xác minh | Cổng FPT, Đã Hết Phòng và Chờ Tái Xác Minh |
| AI tìm Tân Xã, tối đa 2,5 triệu, có điều hòa và ban công | Studio khép kín có ban công tại Cổng FPT là một ứng viên phù hợp |
| Giá, diện tích, sức chứa, tiền cọc và độ mới đa dạng | Lọc từ khóa `DEMO` rồi so sánh các loại phòng ở Tân Xã, Thạch Hòa, Bình Yên và Khu Công nghệ cao |

## Kết quả kiểm tra trên `MaiNTT`

| Ca | Kết quả |
|---|---|
| Chọn điểm gốc, lọc bán kính, đổi trang và mở chi tiết/so sánh | Pass trên Edge với fixture. Kiểm tra ở 375, 768, 1024 và 1440 px, bàn phím và zoom 200%. |
| API vị trí, phân trang, thiếu tọa độ, bằng khoảng cách và loại nhà đang tái xác minh | Pass trên Spring Boot + H2. |
| AI hỏi bổ sung, trả phòng hợp lệ, hết phòng và timeout | Pass với Gemini giả lập ở backend và fixture trên Edge. |
| Chủ trọ xác nhận tình trạng phòng, cảnh báo quá 7 ngày | Pass trên Spring Boot + H2 và Edge với fixture. |
| Nhà trọ chờ tái xác minh và màn xử lý của staff | Pass trên Spring Boot + H2 và Edge với fixture. |

Các bước nghiệm thu còn lại là nạp seed trên MySQL dev và chạy AI với khóa Gemini dev. Chủ trì kiểm tra phần tìm trọ và AI: Mai. Bộ test frontend toàn repo còn 4 lỗi có sẵn ở `host-logout.test.js` và `routing.test.js`.
