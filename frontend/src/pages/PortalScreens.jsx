import { lazy } from 'react';

// Public Pages (lazy-loaded per route)
const HomePage = lazy(() => import('./public/HomePage.jsx'));
const SearchPage = lazy(() => import('./public/SearchPage.jsx'));
const MapSearchPage = lazy(() => import('./public/MapSearchPage.jsx'));
const DetailPage = lazy(() => import('./public/DetailPage.jsx'));
const FavoritesPage = lazy(() => import('./public/FavoritesPage.jsx'));
const RoomComparisonPage = lazy(() => import('./public/RoomComparisonPage.jsx'));
const BookingsPage = lazy(() => import('./public/BookingsPage.jsx'));
const CommunityPage = lazy(() => import('./public/CommunityPage.jsx'));
const ServicesPage = lazy(() => import('./public/ServicesPage.jsx'));
const ServiceDetailPage = lazy(() => import('./public/ServiceDetailPage.jsx'));
const NotificationsPage = lazy(() => import('./public/NotificationsPage.jsx'));
const CollectedPostsPage = lazy(() => import('./public/CollectedPostsPage.jsx'));
const StaffCollectedPostsPage = lazy(() => import('./staff/StaffCollectedPostsPage.jsx'));
const CommunityReportsPage = lazy(() => import('./CommunityReportsPage.jsx'));

// Host Pages (lazy-loaded per route)
const HostDashboardPage = lazy(() => import('./host/HostDashboardPage.jsx'));
const HostManagementWorkspace = lazy(() => import('./host/HostManagementWorkspace.jsx'));
const HostPropertyCreatePage = lazy(() => import('./host/HostPropertyCreatePage.jsx'));
const HostPropertyEditPage = lazy(() => import('./host/HostPropertyEditPage.jsx'));
const HostViewingRequestsPage = lazy(() => import('./host/HostViewingRequestsPage.jsx'));
const HostSupportPage = lazy(() => import('./host/HostSupportPage.jsx'));
const HostNotificationsPage = lazy(() => import('./host/HostNotificationsPage.jsx'));

// Staff Pages (lazy-loaded per route)
const StaffDashboardPage = lazy(() => import('./staff/StaffDashboardPage.jsx'));
const StaffServiceApplicationsPage = lazy(() => import('./staff/StaffServiceApplicationsPage.jsx'));
const StaffPropertyVerificationsPage = lazy(() => import('./staff/StaffPropertyVerificationsPage.jsx'));
const StaffPropertyVerificationDetailPage = lazy(() => import('./staff/StaffPropertyVerificationDetailPage.jsx'));
const StaffCommunityModerationPage = lazy(() => import('./staff/StaffCommunityModerationPage.jsx'));
const StaffCommunityModerationDetailPage = lazy(() => import('./staff/StaffCommunityModerationDetailPage.jsx'));
const StaffAssistanceRequestsPage = lazy(() => import('./staff/StaffAssistanceRequestsPage.jsx'));
const StaffAssistanceRequestDetailPage = lazy(() => import('./staff/StaffAssistanceRequestDetailPage.jsx'));
const StaffHostRegistrationsPage = lazy(() => import('./staff/StaffHostRegistrationsPage.jsx'));
const StaffHostRegistrationDetailPage = lazy(() => import('./staff/StaffHostRegistrationDetailPage.jsx'));
const StaffServiceComplaintsPage = lazy(() => import('./staff/StaffServiceComplaintsPage.jsx'));

// Admin Pages (lazy-loaded per route)
const AdminDashboardPage = lazy(() => import('./admin/AdminDashboardPage.jsx'));

export default function PortalScreens({ screen }) {
  if (['/host/property', '/host/room-types', '/host/rooms'].includes(screen.path)) {
    return <HostManagementWorkspace activePath={screen.path} />;
  }

  switch (screen.path) {
    case '/collected-posts': return <CollectedPostsPage />;
    case '/staff/collected-posts': return <StaffCollectedPostsPage />;
    case '/staff/host-registrations': return <StaffHostRegistrationsPage />;
    case '/staff/host-registrations/detail': return <StaffHostRegistrationDetailPage />;
    // Public & Member Routes
    case '/':
      return <HomePage />;
    case '/search':
      return <SearchPage />;
    case '/map':
      return <MapSearchPage />;
    case '/properties/detail':
      return <DetailPage />;
    case '/favorites/compare':
      return <RoomComparisonPage />;
    case '/favorites':
      return <FavoritesPage />;
    case '/bookings':
      return <BookingsPage />;
    case '/community':
      return <CommunityPage />;
    case '/community/reports':
      return <CommunityReportsPage />;
    case '/services':
      return <ServicesPage />;
    case '/services/detail':
      return <ServiceDetailPage />;
    case '/notifications':
      return <NotificationsPage />;

    // Host Routes
    case '/host':
      return <HostDashboardPage />;
    case '/host/property/new':
      return <HostPropertyCreatePage />;
    case '/host/property/edit':
      return <HostPropertyEditPage />;
    case '/host/viewings':
      return <HostViewingRequestsPage />;
    case '/host/support':
      return <HostSupportPage />;
    case '/host/notifications':
      return <HostNotificationsPage />;

    // nhân viên Routes
    case '/staff':
      return <StaffDashboardPage />;
    case '/staff/service-complaints':
      return <StaffServiceComplaintsPage />;
    case '/staff/service-applications':
      return <StaffServiceApplicationsPage />;
    case '/staff/verifications':
      return <StaffPropertyVerificationsPage />;
    case '/staff/verifications/detail':
      return <StaffPropertyVerificationDetailPage />;
    case '/staff/community':
      return <StaffCommunityModerationPage />;
    case '/staff/community/detail':
      return <StaffCommunityModerationDetailPage />;
    case '/staff/assistance':
      return <StaffAssistanceRequestsPage />;
    case '/staff/assistance/detail':
      return <StaffAssistanceRequestDetailPage />;

    // Admin Routes
    case '/admin':
      return <AdminDashboardPage />;
    case '/admin/community/reports':
      return <CommunityReportsPage admin />;

    default:
      return (
        <div className="session-screen">
          <h2>Không tìm thấy màn hình</h2>
          <p>Đường dẫn {screen.path} chưa được đăng ký trong hệ thống.</p>
        </div>
      );
  }
}
