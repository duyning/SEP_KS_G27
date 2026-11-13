# Cập nhật giao diện dịch vụ — 2026-11-14

Nhánh DungDT. Giữ stack, API, route, tông teal và component chung.

Tên dịch vụ là H1 trong cột thông tin; mô tả chuyển xuống dưới. Hai nút liên hệ/gửi yêu cầu đặt cùng khối đầu; trên mobile khối thông tin đứng trước ảnh. Ảnh chính 4:3 contain; card 16:10 cover; thumbnail 88×70, viền teal. Upload giữ preview và xóa từng ảnh mới; thay bộ ảnh khi gửi vẫn theo API hiện có.

Form hiển thị lỗi khi blur/submit, thống nhất dấu bắt buộc và thông báo thành công. Lịch dùng date và hai select giờ/phút 24h theo UTC+7, giới hạn ngày/giờ đã qua và kiểm tra lại lúc submit. Khu vực dùng nguồn chung gồm khu vực sẵn có của dự án và khu vực lấy từ dịch vụ public, giữ lựa chọn cũ khi sửa; payload vẫn là chuỗi.

Modal yêu cầu có nút icon tải lại, khoảng cách dưới tab, trạng thái rỗng có hướng dẫn và link. Quản lý dịch vụ dùng badge, bỏ mã hồ sơ trong danh sách chính, xác nhận Gỡ dịch vụ. Gỡ vẫn là đề nghị DELETE chờ nhân viên duyệt, không thay đổi nghiệp vụ API.

Không chạy test hoặc kiểm tra trình duyệt theo yêu cầu. Production build thành công; còn cảnh báo bundle >500kB.

## 1. Chi tiết dịch vụ

- [frontend/src/components/ServicesCatalog.jsx](../../frontend/src/components/ServicesCatalog.jsx)
- [frontend/src/styles/service-catalog.css](../../frontend/src/styles/service-catalog.css)

## 2. Ảnh và upload

- [frontend/src/components/ServiceRegistrationModal.jsx](../../frontend/src/components/ServiceRegistrationModal.jsx)
- [frontend/src/styles/service-catalog.css](../../frontend/src/styles/service-catalog.css)

## 3. Hai form

- [frontend/src/components/ServiceRequests.jsx](../../frontend/src/components/ServiceRequests.jsx)
- [frontend/src/components/ServiceRegistrationModal.jsx](../../frontend/src/components/ServiceRegistrationModal.jsx)
- [frontend/src/components/ServiceMoneyInput.jsx](../../frontend/src/components/ServiceMoneyInput.jsx)
- [frontend/src/styles/service-requests.css](../../frontend/src/styles/service-requests.css)
- [frontend/src/styles/service-registration-form.css](../../frontend/src/styles/service-registration-form.css)

## 4. Multi-select khu vực

- [frontend/src/components/ServiceAreaSelect.jsx](../../frontend/src/components/ServiceAreaSelect.jsx)
- [frontend/src/services/service-catalog.js](../../frontend/src/services/service-catalog.js)
- [frontend/src/components/ServicesCatalog.jsx](../../frontend/src/components/ServicesCatalog.jsx)
- [frontend/src/components/ServiceRegistrationModal.jsx](../../frontend/src/components/ServiceRegistrationModal.jsx)
- [frontend/src/styles/service-registration-form.css](../../frontend/src/styles/service-registration-form.css)

## 5. Modal yêu cầu

- [frontend/src/components/ServiceRequests.jsx](../../frontend/src/components/ServiceRequests.jsx)
- [frontend/src/styles/service-requests.css](../../frontend/src/styles/service-requests.css)

## 6. Quản lý dịch vụ

- [frontend/src/components/ServiceManagement.jsx](../../frontend/src/components/ServiceManagement.jsx)
- [frontend/src/styles/service-catalog.css](../../frontend/src/styles/service-catalog.css)

## Nhãn Staff → nhân viên

- [frontend/src/components/common/Breadcrumb.jsx](../../frontend/src/components/common/Breadcrumb.jsx)
- [frontend/src/components/layout/HostSidebar.jsx](../../frontend/src/components/layout/HostSidebar.jsx)
- [frontend/src/components/ServiceManagement.jsx](../../frontend/src/components/ServiceManagement.jsx)
- [frontend/src/components/ServiceRegistrationModal.jsx](../../frontend/src/components/ServiceRegistrationModal.jsx)
- [frontend/src/fixtures/mockHostData.js](../../frontend/src/fixtures/mockHostData.js)
- [frontend/src/fixtures/mockStaffData.js](../../frontend/src/fixtures/mockStaffData.js)
- [frontend/src/layouts/PortalLayout.jsx](../../frontend/src/layouts/PortalLayout.jsx)
- [frontend/src/pages/admin/AdminDashboardPage.jsx](../../frontend/src/pages/admin/AdminDashboardPage.jsx)
- [frontend/src/pages/AuthPage.jsx](../../frontend/src/pages/AuthPage.jsx)
- [frontend/src/pages/host/HostDashboardPage.jsx](../../frontend/src/pages/host/HostDashboardPage.jsx)
- [frontend/src/pages/host/HostNotificationsPage.jsx](../../frontend/src/pages/host/HostNotificationsPage.jsx)
- [frontend/src/pages/host/HostPropertyCreatePage.jsx](../../frontend/src/pages/host/HostPropertyCreatePage.jsx)
- [frontend/src/pages/host/HostPropertyPage.jsx](../../frontend/src/pages/host/HostPropertyPage.jsx)
- [frontend/src/pages/host/HostSupportPage.jsx](../../frontend/src/pages/host/HostSupportPage.jsx)
- [frontend/src/pages/PortalScreens.jsx](../../frontend/src/pages/PortalScreens.jsx)
- [frontend/src/pages/public/CommunityPage.jsx](../../frontend/src/pages/public/CommunityPage.jsx)
- [frontend/src/pages/public/NotificationsPage.jsx](../../frontend/src/pages/public/NotificationsPage.jsx)
- [frontend/src/pages/staff/StaffAssistanceRequestDetailPage.jsx](../../frontend/src/pages/staff/StaffAssistanceRequestDetailPage.jsx)
- [frontend/src/pages/staff/StaffCommunityModerationDetailPage.jsx](../../frontend/src/pages/staff/StaffCommunityModerationDetailPage.jsx)
- [frontend/src/pages/staff/StaffServiceApplicationsPage.jsx](../../frontend/src/pages/staff/StaffServiceApplicationsPage.jsx)
- [frontend/src/routing/screens.js](../../frontend/src/routing/screens.js)
