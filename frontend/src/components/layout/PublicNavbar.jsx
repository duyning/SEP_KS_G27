import UIButton from '../common/Button.jsx';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, Home, LogOut, Menu, Phone, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { landingFor, roleLabels } from '../../routing/screens.js';

export default function PublicNavbar({ savedCount = 0 }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <header className="navbar-wrapper">
      <div className="top-announcement">
        <div className="container top-announcement-inner">
          <div className="announcement-left">
            <span className="badge-tag">Hòa Lạc Campus</span>
            <span className="announcement-text">
              Hệ thống phòng trọ đã xác thực 100% quanh ĐH FPT & Khu Công nghệ cao Hòa Lạc
            </span>
          </div>
          <div className="announcement-right">
            <a href="tel:0912345678" className="contact-link">
              <Phone size={14} />
              <span>Hotline hỗ trợ: 0912 345 678</span>
            </a>
            <span className="sep">•</span>
            <span className="status-live">
              <span className="live-dot" />
              Cập nhật phòng trống hôm nay
            </span>
          </div>
        </div>
      </div>

      <nav className="main-navbar">
        <div className="container navbar-container">
          {/* Logo */}
          <Link to="/" className="nav-brand" aria-label="Trang chủ HL_RCS">
            <div className="brand-logo-icon">
              <Home size={22} />
            </div>
            <div className="brand-title-wrap">
              <span className="brand-name">HL_RCS</span>
              <span className="brand-sub">Rental Connection System</span>
            </div>
          </Link>

          {/* Menu Links */}
          <ul className={`nav-menu ${mobileOpen ? 'mobile-active' : ''}`} id="navMenu">
            <li><NavLink to="/search" className="nav-item" onClick={() => setMobileOpen(false)}>Tìm phòng</NavLink></li>
            <li><NavLink to="/map" className="nav-item" onClick={() => setMobileOpen(false)}>Bản đồ</NavLink></li>
            <li>
              <NavLink to="/favorites" className="nav-item" onClick={() => setMobileOpen(false)}>
                Đã lưu (<span className="menu-fav-count">{savedCount}</span>)
              </NavLink>
            </li>
            <li><NavLink to="/bookings" className="nav-item" onClick={() => setMobileOpen(false)}>Lịch xem phòng</NavLink></li>
            <li><NavLink to="/services" className="nav-item" onClick={() => setMobileOpen(false)}>Dịch vụ</NavLink></li>
            <li><NavLink to="/community" className="nav-item" onClick={() => setMobileOpen(false)}>Cộng đồng</NavLink></li>
            {user && (
              <li><NavLink to="/profile" className="nav-item" onClick={() => setMobileOpen(false)}>Hồ sơ cá nhân</NavLink></li>
            )}
            {user && user.role !== 'USER' && (
              <li>
                <NavLink to={landingFor(user)} className="nav-item highlight-role" onClick={() => setMobileOpen(false)}>
                  Khu vực {roleLabels[user.role]}
                </NavLink>
              </li>
            )}
          </ul>

          {/* Action Buttons */}
          <div className="nav-actions">
            <Link
              to="/favorites"
              className="btn-wishlist-top"
              id="topWishlistBtn"
              aria-label="Danh sách phòng yêu thích"
              title="Nhà trọ đã lưu"
            >
              <Heart size={18} />
              <span className="wishlist-count" id="wishlistCount">{savedCount}</span>
            </Link>

            {user ? (
              <div className="user-dropdown-nav" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Link to="/profile" className="btn-ghost user-profile-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} />
                  <span>{user.fullName || user.email}</span>
                </Link>
                <UIButton
                  type="button"
                  onClick={handleLogout}
                  className="btn-ghost logout-link"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: '6px 10px' }}
                >
                  <LogOut size={16} />
                </UIButton>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Đăng nhập</Link>
                <Link to="/register" className="btn-primary-sm">Đăng ký ngay</Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <UIButton
            className="mobile-toggle"
            id="mobileMenuBtn"
            aria-label="Mở thực đơn"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </UIButton>
        </div>
      </nav>
    </header>
  );
}
