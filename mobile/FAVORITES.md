# Phòng đã lưu

Route `/favorites`, mở từ Hồ sơ → Phòng đã lưu. Favorites không tạo tab riêng; truy cập từ tab Cá nhân. Giữ nguyên auth flow. Backend lưu theo **roomTypeId**, xóa bằng **favoriteId**, quyền USER/ROOM_HOST.

## API và đồng bộ
- GET `/api/favorites?page=0&size=15`: tổng từ totalElements, FlatList phân trang.
- GET `/api/favorites/state?roomTypeIds=...`: chia tối đa 50 ID.
- POST `/api/favorites` body `{roomTypeId}`; DELETE `/api/favorites/{favoriteId}`.
- Dùng bearer JWT của auth hiện tại, không dùng cookie hay dữ liệu giả ở runtime.
- FavoritesProvider giữ một FavoritesStore cho mỗi tài khoản/role. Home, Explore, Detail và Wishlist dùng chung trạng thái, pending lock và rollback. Logout/đổi tài khoản hủy request cũ, bỏ cache riêng. Không lưu Wishlist xuống disk.
- Xóa làm lệch offset: revalidate những trang đã tải trước khi tải thêm. Response cũ khi mutation đang chạy không được ghi đè trạng thái mới.
- available=false là không còn công khai: giữ tham chiếu và nút bỏ lưu, không mở Detail. availableRooms=0 là hết phòng của đúng loại phòng, vẫn giữ thông tin công khai.

## Giao diện
Tái sử dụng RoomCard compact, ProfileHeader, PrimaryButton, InlineError và CompactRoomSkeleton. Heart teal ở góc phải, pending indicator, press scale 0.98, heart spring 1.15, layout transition 220ms và Reduce Motion. Route Stack có SafeArea riêng, không có tab bar đè nội dung. Có guest, forbidden, loading, empty, lỗi, retry, pull-to-refresh và load-more.

Không thêm thư viện. Không tìm thấy skill animate-ui/expo-animation phù hợp được cài; dùng Reanimated hiện có. Không thêm Undo, collection hoặc sharing ngoài contract backend. Auth hiện có đưa người dùng về Home sau login; chưa thêm intended-action tự lưu.

## File trong phạm vi
Mới: src/app/favorites.tsx; src/context/favorites-context.tsx; src/services/favorites.ts; src/services/favorites-store.ts; tests/favorites.test.ts; scripts/check-favorites.cjs; FAVORITES.md.
Sửa: src/app/_layout.tsx; src/app/(main)/account.tsx; src/app/(main)/home.tsx; src/app/(main)/explore.tsx; src/app/rooms/[roomTypeId].tsx; src/hooks/use-listing-favorites.ts; src/services/accommodations.ts; src/components/home/room-card.tsx; src/components/home/featured-section.tsx; package.json; PROFILE.md.
Không sửa backend/database hoặc Bottom Navigation. Giữ các thay đổi frontend không liên quan có sẵn.

## Kiểm tra
Typecheck và lint đạt. 53 test đạt: Favorites 13, auth/profile 29, Google 4, accommodations 7.
Browser fixture đạt ở 320/360/390/430px: guest/login; card/detail/back; xóa không mở nhầm Detail; rollback; hidden reference; empty/explore; sync heart; pagination 18 items và item cuối nhìn đầy đủ; logout/đổi tài khoản; lỗi refresh giữ cache và retry. Không có page error. Fixture chỉ trong script kiểm thử.
Lần thử backend thật ngày 2026-11-12 thất bại kết nối (fetch failed); chưa xác minh Favorites trên backend đang chạy. Không gọi mutation lên database thật.
Chưa kiểm thử thiết bị iOS/Android, Dynamic Island/Home Indicator, Android gesture/3-button, font scaling hệ điều hành, pull gesture native và ảnh lỗi trên thiết bị. Viewport browser không thay thế kiểm thử thiết bị.

## Chạy lại
Trong thư mục mobile:
```powershell
npm run typecheck
npm run lint
npm run test:favorites
npm run test:auth
npm run test:google
npm run test:listings
npx expo start --clear --port 8082
```
Đảm bảo EXPO_PUBLIC_API_URL trong .env.local trỏ tới backend mà điện thoại truy cập được qua LAN. Mở Expo Go, đăng nhập rồi vào Hồ sơ → Phòng đã lưu.
Browser fixture: chạy Expo web cổng 8092, đặt PLAYWRIGHT_MODULE tới Playwright rồi chạy `node scripts/check-favorites.cjs`.

