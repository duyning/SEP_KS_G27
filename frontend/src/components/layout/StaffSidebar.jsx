import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Shield,
  Star,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function StaffSidebar({ isOpen, onClose, counts = { verif: 1, reports: 0, community: 1, feedback: 0, support: 1 } }) {
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

      <aside id="staffSidebar" className={`staff-sidebar ${isOpen ? 'mobile-open' : ''}`} aria-label="Thanh điều hướng nhân viên">
        {/* Brand & Portal Logo */}
        <div className="sidebar-brand-box">
          <Link to="/staff" className="sidebar-brand-link" title="HL_RCS Rental Connection System">
            <div className="brand-logo-icon">
              <Shield size={22} />
            </div>
            <div className="brand-text-block">
              <div className="brand-portal-title">HL_RCS</div>
              <div className="brand-portal-role">STAFF PORTAL</div>
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
              <NavLink to="/staff" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <LayoutDashboard className="nav-icon" size={18} />
                <span>Bảng điều khiển</span>
              </NavLink>
            </li>
          </ul>

          {/* Group: NGHIỆP VỤ VẬN HÀNH */}
          <div className="nav-group-label">NGHIỆP VỤ VẬN HÀNH</div>
          <ul className="nav-list">
            <li>
              <NavLink to="/staff/verifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Home className="nav-icon" size={18} />
                <span>Xác minh nhà trọ</span>
                {counts.verif > 0 && <span className="nav-badge pending">{counts.verif}</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/staff?view=content-moderation" className="nav-link" onClick={onClose}>
                <AlertTriangle className="nav-icon" size={18} />
                <span>Kiểm duyệt tin đăng</span>
                {counts.reports > 0 && <span className="nav-badge pending">{counts.reports}</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/staff/community" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Users className="nav-icon" size={18} />
                <span>Kiểm duyệt cộng đồng</span>
                {counts.community > 0 && <span className="nav-badge pending">{counts.community}</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/staff?view=feedback-verification" className="nav-link" onClick={onClose}>
                <Star className="nav-icon" size={18} />
                <span>Đánh giá người thuê</span>
                {counts.feedback > 0 && <span className="nav-badge pending">{counts.feedback}</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/staff/assistance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <MessageSquare className="nav-icon" size={18} />
                <span>Yêu cầu hỗ trợ</span>
                {counts.support > 0 && <span className="nav-badge pending">{counts.support}</span>}
              </NavLink>
            </li>
          </ul>

          {/* Group: HỆ THỐNG & NHẬT KÝ */}
          <div className="nav-group-label">HỆ THỐNG & NHẬT KÝ</div>
          <ul className="nav-list">
            <li>
              <NavLink to="/staff?view=history" className="nav-link" onClick={onClose}>
                <Clock className="nav-icon" size={18} />
                <span>Lịch sử kiểm duyệt</span>
              </NavLink>
            </li>
            <li>
              <Link to="/" className="nav-link" onClick={onClose}>
                <Globe className="nav-icon" size={18} />
                <span>Xem trang công khai</span>
              </Link>
            </li>
            <li>
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <User className="nav-icon" size={18} />
                <span>Hồ sơ nhân viên</span>
              </NavLink>
            </li>
            <li>
              <button type="button" className="nav-link btn-logout-sidebar" onClick={handleLogout} style={{ color: '#e11d48' }}>
                <LogOut className="nav-icon" size={18} />
                <span>Đăng xuất</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Sidebar User Footer */}
        {user && (
          <div className="sidebar-user-footer" style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div className="sidebar-user-card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar-badge" style={{
                width: '36px', height: '36px', borderRadius: '50%', background: '#0f766e',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}>
                {(user.fullName || 'ST').slice(0, 2).toUpperCase()}
              </div>
              <div className="user-info-text" style={{ overflow: 'hidden' }}>
                <div className="user-display-name" style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.fullName || user.email}
                </div>
                <div className="user-role-tag" style={{ fontSize: '11px', color: '#0d9488', fontWeight: 600 }}>
                  Chuyên viên vận hành
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
