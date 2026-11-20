import React from 'react';

// Public Pages
import HomePage from './public/HomePage.jsx';
import SearchPage from './public/SearchPage.jsx';
import MapSearchPage from './public/MapSearchPage.jsx';
import DetailPage from './public/DetailPage.jsx';
import FavoritesPage from './public/FavoritesPage.jsx';
import RoomComparisonPage from './public/RoomComparisonPage.jsx';
import BookingsPage from './public/BookingsPage.jsx';
import CommunityPage from './public/CommunityPage.jsx';
import CommunityReportsPage from './CommunityReportsPage.jsx';
import ServicesPage from './public/ServicesPage.jsx';
import ServiceDetailPage from './public/ServiceDetailPage.jsx';
import NotificationsPage from './public/NotificationsPage.jsx';

// Host Pages
import HostDashboardPage from './host/HostDashboardPage.jsx';
import HostManagementWorkspace from './host/HostManagementWorkspace.jsx';
import HostPropertyCreatePage from './host/HostPropertyCreatePage.jsx';
import HostPropertyEditPage from './host/HostPropertyEditPage.jsx';
import HostViewingRequestsPage from './host/HostViewingRequestsPage.jsx';
import HostSupportPage from './host/HostSupportPage.jsx';
import HostNotificationsPage from './host/HostNotificationsPage.jsx';

// Staff Pages
import StaffDashboardPage from './staff/StaffDashboardPage.jsx';
import StaffServiceApplicationsPage from './staff/StaffServiceApplicationsPage.jsx';
import StaffPropertyVerificationsPage from './staff/StaffPropertyVerificationsPage.jsx';
import StaffPropertyVerificationDetailPage from './staff/StaffPropertyVerificationDetailPage.jsx';
import StaffCommunityModerationPage from './staff/StaffCommunityModerationPage.jsx';
import StaffCommunityModerationDetailPage from './staff/StaffCommunityModerationDetailPage.jsx';
import StaffAssistanceRequestsPage from './staff/StaffAssistanceRequestsPage.jsx';
import StaffAssistanceRequestDetailPage from './staff/StaffAssistanceRequestDetailPage.jsx';

import StaffHostRegistrationsPage from './staff/StaffHostRegistrationsPage.jsx';
import StaffHostRegistrationDetailPage from './staff/StaffHostRegistrationDetailPage.jsx';

// Admin Pages
import AdminDashboardPage from './admin/AdminDashboardPage.jsx';

export default function PortalScreens({ screen }) {
  if (['/host/property', '/host/room-types', '/host/rooms'].includes(screen.path)) {
    return <HostManagementWorkspace activePath={screen.path} />;
  }

  switch (screen.path) {
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
    case '/favorites/compare': return <RoomComparisonPage />;
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

    // Staff Routes
    case '/staff':
      return <StaffDashboardPage />;
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
