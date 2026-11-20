# Advanced Search — HL_RCS Mobile

## Contract đã đối chiếu
GET /api/properties/search (public) trả AccommodationPage gồm items (Room Type), page, size, totalElements, totalPages. Dùng roomTypeId làm key và propertyId + roomTypeId cho Detail; không gộp Room Type thành Property.

Parameters thực tế:
- q: tối đa 200 ký tự, trim, giữ tiếng Việt; backend tìm roomType + property.name + property.address, escape LIKE. Không tự bỏ dấu; tìm không dấu phụ thuộc collation database.
- price: all; under-15 (<1.500.000); 15-25 ([1.500.000,2.500.000]); 25-35 ((2.500.000,3.500.000]); above-35 (>3.500.000). Dùng preset đúng contract, không slider/min/max giả.
- type: all / khep-kin / gac-lung / chung-cu-mini. Single-select; backend so khớp tên loại phòng.
- location: all / tan-xa / thach-hoa / binh-yen / cnc. Đây là mã tìm chuỗi địa chỉ của backend hiện tại, không phải danh mục hành chính live.
- amenities: CSV 12 key hợp lệ: airConditioner,waterHeater,washingMachine,balcony,refrigerator,kitchen,elevator,fingerprint,camera,flexibleHours,fireSafety,separateOwner. AND giữa các lựa chọn. Tiện ích có thể ở cấp Room Type hoặc tài sản chung theo backend; washingMachine cũng khớp laundry chung. Không gửi laundry trực tiếp.
- availableOnly: true/false, kiểm tra Room VACANT thuộc đúng Room Type.
- sort UI: newest / price-asc / price-desc / area-desc, sắp xếp server toàn bộ dữ liệu. Backend còn có recommended (alias newest), rating-desc (đánh giá cấp Property); UI này không thêm ranking/rating mới.
- page từ 0, size=15 (backend giới hạn 1..50).

## State và luồng
RoomSearchProvider bọc navigator ba tab hiện có. Query input, keyword debounce350ms và applied filters chung cho Home/Explore. Keyword chỉ trim, không đổi tên hoặc bỏ dấu. Sheet dùng bản sao draft, Close/backdrop/Android Back không apply. Reset trong sheet chỉ reset draft; advanced reset giữ sort và keyword do được điều khiển riêng. Sort sheet thay đúng sort và giữ các tiêu chí khác.

Badge đếm nhóm price/type/location/amenities/availability, không đếm từng tiện ích, keyword hoặc sort. Active chips xóa riêng điều kiện. Tất cả ở quick type chỉ xóa type. Home Search submit chuyển tab Explore; Home Category áp dụng đúng type hoặc availability rồi chuyển tab. Home Filter dùng chung sheet và apply chuyển Explore. Xem tất cả xóa keyword/filter/sort rồi mở toàn bộ phòng; không tự thêm featured filter. Home feed vẫn là discovery feed newest, không lọc một trang Home làm toàn bộ kết quả tìm kiếm.

useListings dùng canonical query key, AbortController và generation để bỏ response cũ, khóa load-more đồng bộ, reset pagination khi tiêu chí đổi, dedupe theo roomTypeId. Refresh cùng tiêu chí giữ cache và hiển thị lỗi rõ nếu thất bại. Đổi tiêu chí không gắn cache cũ thành kết quả mới. FlatList không lồng ScrollView dọc. Có skeleton, error/retry, empty, load-more/retry, hết kết quả và pull-to-refresh.

## UI / motion / safe area
Tái dùng HomeSearchBar, RoomCard compact, CompactRoomSkeleton, AnimatedPressable, theme và Favorites chung. Search focus border teal, clear target44, badge số nhóm. Sheet nền sáng, bo24, header/close, nội dung cuộn và footer cố định có safe bottom; mở sheet đóng keyboard trước, các tiêu chí preset không cần numeric keyboard. Sheet slide280ms, overlay fade, chip scale0.97 và haptic hiện có; Reduced Motion được tôn trọng. Bỏ entrance SearchBar để không replay khi Back. Không thêm dependencies. Không có skill animate-ui/expo-animation phù hợp đã cài, không dùng skill hoặc DOM animation.

Giữ nguyên Bottom Navigation ba tab và safe area của NativeTabs. Không cộng inset/tab height lần hai. Web tab list ngoài vùng cuộn. Sheet có Close/backdrop; chưa thêm kéo đóng bằng gesture vào Modal hiện tại.

## API còn thiếu (không tự sửa backend)
Không có minPrice/maxPrice hoặc giá tùy nhập; minArea/maxArea; area-asc; Studio enum; danh mục khu vực/tiện ích public dành cho search; geospatial radius/near-me search. Không thêm các field/UI giả này. Endpoint location/nearby dùng để gợi ý địa chỉ, không phải tìm phòng theo bán kính nên không dùng như near-me search.

## Files
Mới: src/services/room-search.ts; src/context/room-search-context.tsx; tests/room-search.test.ts; scripts/check-search.cjs; scripts/check-search-backend.cjs; SEARCH.md.
Sửa: src/app/(main)/_layout.tsx; src/app/(main)/explore.tsx; src/app/(main)/home.tsx; src/components/home/home-search-bar.tsx; src/components/home/home-categories.tsx; src/components/home/filter-bottom-sheet.tsx; src/hooks/use-listings.ts; package.json (test:search).
Không đổi auth, role, Profile, Bottom Navigation, Detail/Favorite API, backend, DB hay cổng chạy. Giữ các thay đổi chưa commit khác.

## Validation
- Typecheck/lint đạt. 58 test: search5 + auth29 + Google4 + listings7 + favorites13.
- Browser fixture 320/360/390/430: debounce và nhập dấu; tìm tên nhà trọ/loại phòng/địa chỉ; bỏ response chậm; clear; draft/close/reset/apply; kết hợp type/location/2 amenities; type All giữ các tiêu chí khác; sort; Detail/Back; pagination24 records; empty vs error; Home Search, Category và Xem tất cả reset toàn bộ tiêu chí. Footer sheet320/430 nhìn đầy đủ; không overflow ngang; không pageerror. Fixture chỉ trong scripts, không ở app runtime.
- Hồi quy UI Favorites/Detail đạt: save/remove/rollback, Account switching, pagination và Back.
- Backend thật8081: GET read-only đạt cho keyword theo dữ liệu hiện có, bốn price presets, type/location/combined amenities+availability, availability>0 và bốn sort UI. Database hiện có2 kết quả nên chưa xác minh trang2 bằng dữ liệu thật, hoặc khả năng từng tiện ích trả kết quả dương khi seed thiếu. Không ghi DB.
- Chưa kiểm thử thiết bị iPhone/Android, OS font scaling, VoiceOver/TalkBack, Home Indicator/Dynamic Island, gesture/3button hay pull gesture native. Viewport browser không thay kiểm thử thiết bị. Các filter thiếu API không được tuyên bố đã test.

## Chạy lại
Trong mobile: npm run dev (web API8080, app API8081, web5173, Expo8082).
Kiểm tra: npm run typecheck; npm run lint; npm run test:search; npm run test:auth; npm run test:google; npm run test:listings; npm run test:favorites.
Backend smoke: node scripts/check-search-backend.cjs, tùy chọn HLRCS_TEST_API_URL.
UI fixture: chạy Expo web8092 riêng; đặt PLAYWRIGHT_MODULE tới Playwright, chạy node scripts/check-search.cjs. Screenshot .expo/search-review được ignored.

