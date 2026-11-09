import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  CheckSquare,
  Globe,
  Home,
  LayoutDashboard,
  Layers,
  LogOut,
  MessageSquare,
  PlusCircle,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function HostSidebar({ isOpen, onClose, pendingViewingsCount = 1 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (await logout() === false) return;
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={onClose}
          aria-hidden="true"
          style={{ display: 'block' }}
        />
      )}

      <aside id="hostSidebar" className={`host-sidebar ${isOpen ? 'mobile-open' : ''}`} aria-label="Thanh điều hướng chủ trọ">
        {/* Brand & Portal Logo */}
        <div className="sidebar-brand-box">
          <Link to="/host" className="sidebar-brand-link" title="HL_RCS Rental Connection System">
            <div className="brand-logo-icon">
              <Home size={22} />
            </div>
            <div className="brand-text-block">
              <div className="brand-portal-title">HL_RCS</div>
              <div className="brand-portal-role">ROOM HOST PORTAL</div>
            </div>
          </Link>
          <button
            type="button"
            id="btnCloseSidebar"
            className="btn-close-sidebar-mobile"
            aria-label="Đóng thanh điều hướng"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          {/* Group: TỔNG QUAN */}
          <div className="nav-group-label">TỔNG QUAN</div>
          <ul className="nav-list">
            <li>
              <NavLink to="/host" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <LayoutDashboard className="nav-icon" size={18} />
                <span>Bảng điều khiển</span>
              </NavLink>
            </li>
          </ul>

          {/* Group: QUẢN LÝ NHÀ TRỌ */}
          <div className="nav-group-label">QUẢN LÝ NHÀ TRỌ</div>
          <ul className="nav-list">
            <li>
              <NavLink to="/host/property" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Home className="nav-icon" size={18} />
                <span>Nhà trọ của tôi</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/host/property/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <PlusCircle className="nav-icon" size={18} />
                <span>Đăng ký nhà trọ</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/host/room-types" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Layers className="nav-icon" size={18} />
                <span>Loại phòng & Giá</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/host/rooms" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <CheckSquare className="nav-icon" size={18} />
                <span>Danh sách phòng</span>
              </NavLink>
            </li>
          </ul>

          {/* Group: LỊCH XEM PHÒNG */}
          <div className="nav-group-label">LỊCH XEM PHÒNG</div>
          <ul className="nav-list">
            <li>
              <NavLink to="/host/viewings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Calendar className="nav-icon" size={18} />
                <span>Yêu cầu xem phòng</span>
                {pendingViewingsCount > 0 && (
                  <span className="nav-badge pending" id="sidebarPendingReqBadge">{pendingViewingsCount}</span>
                )}
              </NavLink>
            </li>
          </ul>

          {/* Group: HỖ TRỢ / LIÊN KẾT */}
          <div className="nav-group-label">HỖ TRỢ / LIÊN KẾT</div>
          <ul className="nav-list">
            <li>
              <NavLink to="/host/support" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <MessageSquare className="nav-icon" size={18} />
                <span>Yêu cầu Staff hỗ trợ</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/host/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Bell className="nav-icon" size={18} />
                <span>Thông báo</span>
              </NavLink>
            </li>
            <li>
              <Link to="/" className="nav-link" onClick={onClose}>
                <Globe className="nav-icon" size={18} />
                <span>Xem trang khách thuê</span>
              </Link>
            </li>
          </ul>

          {/* Group: TÀI KHOẢN */}
          <div className="nav-group-label">TÀI KHOẢN</div>
          <ul className="nav-list">
            <li>
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <User className="nav-icon" size={18} />
                <span>Hồ sơ cá nhân</span>
              </NavLink>
            </li>
            <li>
              <button type="button" className="nav-link btn-nav-action btn-logout-sidebar" onClick={handleLogout}>
                <LogOut className="nav-icon" size={18} />
                <span>Đăng xuất</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer User Info */}
        {user && (
          <div className="sidebar-user-footer" style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div className="sidebar-user-card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar-badge" style={{
                width: '36px', height: '36px', borderRadius: '50%', background: '#0d9488',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}>
                {(user.fullName || 'H').slice(0, 2).toUpperCase()}
              </div>
              <div className="user-info-text" style={{ overflow: 'hidden' }}>
                <div className="user-display-name" style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.fullName || user.email}
                </div>
                <div className="user-role-tag" style={{ fontSize: '11px', color: '#64748b' }}>
                  Chủ trọ đối tác
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
