import { Link } from 'react-router-dom';
import { Bell, ExternalLink, Menu, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function StaffTopbar({ title = 'Bảng điều khiển Nhân viên', onToggleSidebar }) {
  const { user } = useAuth();

  return (
    <header className="staff-topbar" role="banner">
      <div className="topbar-left">
        <button
          type="button"
          id="btnToggleSidebarMobile"
          className="btn-toggle-sidebar"
          aria-label="Mở menu điều hướng"
          onClick={onToggleSidebar}
        >
          <Menu size={22} />
        </button>
        <div className="topbar-title-wrap">
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-status-chip">
            <span className="live-dot-green" />
            <span>Hệ thống trực tuyến</span>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        {/* View Public Site CTA */}
        <Link to="/" className="btn-view-public-site" title="Xem giao diện tìm kiếm phòng của người thuê">
          <ExternalLink size={15} />
          <span className="hide-mobile">Trang người thuê</span>
        </Link>

        {/* Topbar Notification Bell */}
        <Link
          to="/notifications"
          className="p-icon"
          title="Thông báo"
          aria-label="Thông báo"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            textDecoration: 'none',
          }}
        >
          <Bell size={18} />
        </Link>

        {/* User profile link */}
        {user && (
          <Link
            to="/profile"
            className="user-profile-badge"
            title="Hồ sơ cá nhân"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <User size={16} />
            <span className="hide-mobile">{user.fullName || user.email}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
