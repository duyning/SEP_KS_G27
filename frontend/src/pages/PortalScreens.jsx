import React from 'react';

// Public Pages
import HomePage from './public/HomePage.jsx';
import SearchPage from './public/SearchPage.jsx';
import MapSearchPage from './public/MapSearchPage.jsx';
import DetailPage from './public/DetailPage.jsx';
import FavoritesPage from './public/FavoritesPage.jsx';
import BookingsPage from './public/BookingsPage.jsx';
import CommunityPage from './public/CommunityPage.jsx';
import ServicesPage from './public/ServicesPage.jsx';
import ServiceDetailPage from './public/ServiceDetailPage.jsx';
import NotificationsPage from './public/NotificationsPage.jsx';

// Host Pages
import HostDashboardPage from './host/HostDashboardPage.jsx';
import HostPropertyPage from './host/HostPropertyPage.jsx';
import HostPropertyCreatePage from './host/HostPropertyCreatePage.jsx';
import HostPropertyEditPage from './host/HostPropertyEditPage.jsx';
import HostRoomTypesPage from './host/HostRoomTypesPage.jsx';
import HostRoomsPage from './host/HostRoomsPage.jsx';
import HostViewingRequestsPage from './host/HostViewingRequestsPage.jsx';
import HostSupportPage from './host/HostSupportPage.jsx';
import HostNotificationsPage from './host/HostNotificationsPage.jsx';

// Staff Pages
import StaffDashboardPage from './staff/StaffDashboardPage.jsx';
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
    case '/favorites':
      return <FavoritesPage />;
    case '/bookings':
      return <BookingsPage />;
    case '/community':
      return <CommunityPage />;
    case '/services':
      return <ServicesPage />;
    case '/services/detail':
      return <ServiceDetailPage />;
    case '/notifications':
      return <NotificationsPage />;

    // Host Routes
    case '/host':
      return <HostDashboardPage />;
    case '/host/property':
      return <HostPropertyPage />;
    case '/host/property/new':
      return <HostPropertyCreatePage />;
    case '/host/property/edit':
      return <HostPropertyEditPage />;
    case '/host/room-types':
      return <HostRoomTypesPage />;
    case '/host/rooms':
      return <HostRoomsPage />;
    case '/host/viewings':
      return <HostViewingRequestsPage />;
    case '/host/support':
      return <HostSupportPage />;
    case '/host/notifications':
      return <HostNotificationsPage />;

    // Staff Routes
    case '/staff':
      return <StaffDashboardPage />;
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

    default:
      return (
        <div className="session-screen">
          <h2>Không tìm thấy màn hình</h2>
          <p>Đường dẫn {screen.path} chưa được đăng ký trong hệ thống.</p>
        </div>
      );
  }
}
