// Roles mirror SecurityConfig, including ADMIN access to host/staff areas.
export const roleLabels = { USER: 'Người thuê', ROOM_HOST: 'Chủ trọ', STAFF: 'Nhân viên vận hành', ADMIN: 'Quản trị viên' };
export const portalRoles = { public: null, favorites: ['USER', 'ROOM_HOST'], member: ['USER', 'ROOM_HOST', 'STAFF', 'ADMIN'], host: ['ROOM_HOST', 'ADMIN'], staff: ['STAFF', 'ADMIN'], admin: ['ADMIN'] };
export function canAccess(portal, user) {
  if (!Object.hasOwn(portalRoles, portal)) return false;
  return portalRoles[portal] === null || !!user && portalRoles[portal].includes(user.role);
}
export function landingFor(user) { return ({ ROOM_HOST: '/host', STAFF: '/staff', ADMIN: '/admin' })[user?.role] || '/'; }

const screen = (source, path, portal, title, kind, extra = {}) => ({ source, path, portal, title, kind, integration: 'blocked', ...extra });
export const screens = [
  screen('index.html', '/', 'public', 'Tìm phòng trọ tại Hòa Lạc', 'home'),
  screen('home.html', '/home', 'public', 'Trang chủ', 'redirect', { to: '/' }),
  screen('login.html', '/login', 'public', 'Đăng nhập', 'auth', { integration: 'connected' }),
  screen('register.html', '/register', 'public', 'Đăng ký', 'auth', { integration: 'connected' }),
  screen('search.html', '/search', 'public', 'Khám phá nhà trọ & Căn hộ tại Hòa Lạc', 'search'),
  screen('map-search.html', '/map', 'public', 'Bản đồ tìm nhà trọ Hòa Lạc', 'map'),
  screen('detail.html', '/properties/detail', 'public', 'Chi tiết nhà trọ', 'detail', { sections: ['Hình ảnh nhà trọ', 'Thông tin & tiện ích', 'Loại phòng & giá thuê', 'Vị trí', 'Đánh giá người thuê'], actions: ['Lưu nhà trọ', 'Đặt lịch xem phòng', 'Báo cáo tin đăng'] }),
  screen('favorites.html', '/favorites', 'favorites', 'Danh sách nhà trọ đã lưu', 'list', { integration:'connected', columns: ['Loại phòng', 'Khu vực', 'Giá thuê', 'Tình trạng'] }),
  screen(null, '/favorites/compare', 'favorites', 'So sánh phòng đã lưu', 'comparison', {integration:'connected'}),
  screen('bookings.html', '/bookings', 'member', 'Lịch xem phòng', 'list', { columns: ['Nhà trọ', 'Chủ trọ', 'Lịch hẹn', 'Trạng thái'], filters: ['Tất cả lịch hẹn', 'Chờ xác nhận', 'Đã xác nhận', 'Đã hoàn thành', 'Đã hủy'] }),
  screen('community.html', '/community', 'public', 'Cộng đồng Cư dân & Sinh viên Hòa Lạc', 'community'),
  screen('services.html', '/services', 'public', 'Dịch vụ quanh trọ', 'services'),
  screen('service-detail.html', '/services/detail', 'public', 'Chi tiết dịch vụ', 'detail', { sections: ['Thông tin dịch vụ', 'Loại dịch vụ', 'Khu vực phục vụ', 'Nhà cung cấp'], actions: ['Liên hệ nhà cung cấp'] }),
  screen('notifications.html', '/notifications', 'member', 'Thông báo của bạn', 'notifications'),
  screen('become-host.html', '/become-host', 'member', 'Đăng ký làm chủ trọ', 'becomeHost', { integration: 'connected' }),
  screen('profile.html', '/profile', 'member', 'Hồ sơ cá nhân', 'profile', { integration: 'partial' }),
  screen('host-dashboard.html', '/host', 'host', 'Bảng điều khiển', 'dashboard', { metrics: ['Nhà trọ của tôi', 'Loại phòng', 'Phòng còn trống', 'Yêu cầu xem phòng'], sections: ['Tình trạng nhà trọ', 'Yêu cầu xem phòng gần đây', 'Thông báo vận hành'] }),
  screen('host-property.html', '/host/property', 'host', 'Nhà trọ của tôi', 'detail', { sections: ['Thông tin nhà trọ', 'Hồ sơ xác minh', 'Loại phòng & giá thuê', 'Vị trí & liên hệ'], links: [['Đăng ký nhà trọ', '/host/property/new'], ['Cập nhật thông tin', '/host/property/edit']] }),
  screen('host-property-create.html', '/host/property/new', 'host', 'Đăng ký nhà trọ', 'propertyForm'),
  screen('host-property-edit.html', '/host/property/edit', 'host', 'Cập nhật thông tin nhà trọ', 'propertyForm'),
  screen('host-room-types.html', '/host/room-types', 'host', 'Quản lý loại phòng', 'list', { columns: ['Loại phòng', 'Diện tích', 'Giá thuê / tháng', 'Phí dịch vụ', 'Phòng trống', 'Thao tác'], actions: ['Thêm loại phòng'] }),
  screen('host-rooms.html', '/host/rooms', 'host', 'Danh sách phòng', 'list', { columns: ['Số phòng', 'Loại phòng', 'Tầng', 'Tình trạng', 'Cập nhật lần cuối', 'Thao tác'], actions: ['Thêm phòng', 'Xác nhận phòng trống'], filters: ['Tất cả tình trạng', 'Còn trống', 'Đã có người thuê'] }),
  screen('host-room-availability.html', '/host/availability', 'host', 'Tình trạng phòng', 'redirect', { to: '/host/rooms', integration: 'merged' }),
  screen('host-viewing-requests.html', '/host/viewings', 'host', 'Yêu cầu xem phòng', 'list', { columns: ['Người thuê', 'Phòng quan tâm', 'Ngày xem', 'Số điện thoại', 'Trạng thái'], filters: ['Tất cả yêu cầu', 'Chờ xác nhận', 'Đã xác nhận', 'Đã hoàn thành', 'Đã hủy'] }),
  screen('host-support.html', '/host/support', 'host', 'Yêu cầu hỗ trợ', 'list', { columns: ['Mã yêu cầu', 'Nội dung', 'Nhà trọ', 'Ngày gửi', 'Trạng thái'], actions: ['Tạo yêu cầu hỗ trợ'] }),
  screen('host-notifications.html', '/host/notifications', 'host', 'Trung tâm thông báo', 'notifications'),
  screen('staff-dashboard.html', '/staff', 'staff', 'Bảng điều khiển vận hành', 'dashboard', { metrics: ['Chờ xác minh nhà trọ', 'Báo cáo tin đăng', 'Đánh giá cần xác minh', 'Yêu cầu hỗ trợ'], sections: ['Công việc cần xử lý', 'Công việc gần đây', 'Nhật ký hoạt động'] }),
  screen('staff-host-registrations.html', '/staff/host-registrations', 'staff', 'Xác minh đăng ký chủ trọ', 'hostApplications', { integration: 'connected' }),
  screen('staff-host-registration-detail.html', '/staff/host-registrations/detail', 'staff', 'Chi tiết đăng ký làm chủ trọ', 'hostApplicationDetail', { integration: 'connected' }),

  screen(null, '/staff/service-applications', 'staff', 'Xét duyệt hồ sơ dịch vụ', 'list', { integration: 'connected' }),
  screen('staff-property-verifications.html', '/staff/verifications', 'staff', 'Hồ sơ xác minh nhà trọ', 'list', { metrics: ['Tổng hồ sơ', 'Chờ xác minh', 'Cần bổ sung', 'Đã xử lý'], columns: ['Nhà trọ & mã hồ sơ', 'Chủ trọ / đại diện', 'Ngày gửi', 'Trạng thái', 'Cập nhật gần nhất', 'Thao tác'], filters: ['Tất cả trạng thái', 'Chờ xác minh', 'Cần bổ sung', 'Đã xác minh', 'Từ chối'] }),
  screen('staff-property-verification-detail.html', '/staff/verifications/detail', 'staff', 'Thẩm định hồ sơ xác minh', 'detail', { sections: ['Thông tin nhà trọ', 'Chủ trọ / Đại diện', 'Tài liệu xác minh', 'Lịch sử thẩm định'], actions: ['Yêu cầu bổ sung', 'Từ chối hồ sơ', 'Xác minh nhà trọ'] }),
  screen('staff-community-moderation.html', '/staff/community', 'staff', 'Kiểm duyệt cộng đồng', 'list', { metrics: ['Tổng bài viết', 'Chờ kiểm duyệt', 'Cần chỉnh sửa', 'Đã xử lý'], columns: ['Bài viết', 'Loại', 'Tác giả', 'Ngày gửi', 'Trạng thái', 'Thao tác'], filters: ['Tất cả trạng thái', 'Chờ kiểm duyệt', 'Cần chỉnh sửa', 'Đã duyệt', 'Từ chối'] }),
  screen('staff-community-moderation-detail.html', '/staff/community/detail', 'staff', 'Chi tiết thẩm định bài viết', 'detail', { sections: ['Nội dung bài viết', 'Tác giả & thông tin liên quan', 'Lịch sử kiểm duyệt'], actions: ['Yêu cầu chỉnh sửa', 'Từ chối bài viết', 'Duyệt bài viết'] }),
  screen('staff-assistance-requests.html', '/staff/assistance', 'staff', 'Yêu cầu hỗ trợ từ đối tác', 'list', { metrics: ['Tổng yêu cầu', 'Chờ xử lý', 'Đang xử lý', 'Đã hoàn tất'], columns: ['Mã yêu cầu & nội dung', 'Chủ trọ', 'Vấn đề', 'Ngày gửi', 'Trạng thái', 'Thao tác'], filters: ['Tất cả trạng thái', 'Chờ xử lý', 'Đang xử lý', 'Chờ chủ trọ bổ sung', 'Đã giải quyết'] }),
  screen('staff-assistance-request-detail.html', '/staff/assistance/detail', 'staff', 'Chi tiết yêu cầu hỗ trợ', 'supportDetail', { sections: ['Nội dung yêu cầu từ Chủ trọ', 'Thông tin liên quan (Nhà trọ)', 'Lịch sử xử lý & Nhật ký nghiệp vụ'] }),
  screen('admin-dashboard.html', '/admin', 'admin', 'Bảng điều khiển quản trị', 'admin', { metrics: ['Tài khoản hệ thống', 'Hồ sơ chờ xác minh', 'Bài viết chờ duyệt', 'Công việc cần xử lý'] }),
];
export const findScreen = pathname => screens.find(item => item.path === pathname);
export const legacyTarget = filename => screens.find(item => item.source === filename)?.path;
