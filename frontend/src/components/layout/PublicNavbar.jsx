import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, House, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import CommunityNotificationBell from '../CommunityNotificationBell.jsx';
import { CommunitySupportLinks } from '../CommunityFooter.jsx';
import HostRegistrationBanner from '../HostRegistrationBanner.jsx';
import NotificationBell from '../NotificationBell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { useToast } from '../PortalUI.jsx';
import { landingFor, roleLabels } from '../../routing/screens.js';
import '../../styles/public-navbar.css';

const links = [
  ['/search', 'Tìm phòng'], ['/services', 'Dịch vụ'],
  ['/community', 'Cộng đồng'], ['/collected-posts', 'Bài tổng hợp'],
];

export default function PublicNavbar() {
  const { user, logout } = useAuth();
  const savedCount = useFavorites()?.total ?? 0;
  const notify = useToast();
  const navigate = useNavigate();
  const { key, pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menu = useRef(null);
  const toggle = useRef(null);

  useEffect(() => setMenuOpen(false), [key]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const focusIsInMenu = menu.current?.contains(document.activeElement);
      if (!focusIsInMenu && document.activeElement !== toggle.current) return;
      event.preventDefault();
      setMenuOpen(false);
      toggle.current?.focus();
    };
    const outside = event => {
      if (!menu.current?.contains(event.target) && !toggle.current?.contains(event.target)) setMenuOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const resize = event => { if (event.matches) setMenuOpen(false); };
    window.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    desktop.addEventListener('change', resize);
    return () => {
      window.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', resize);
    };
  }, [menuOpen]);

  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    try {
      if (await logout() !== false) navigate('/login', { replace: true });
    } catch {
      notify('Phiên trên thiết bị đã được kết thúc. Máy chủ không phản hồi khi đăng xuất.', 'error');
    } finally {
      setLeaving(false);
    }
  }

  const name = user?.fullName?.trim() || user?.email || 'Tài khoản';
  const dashboard = landingFor(user);
  const communityBell = ['USER', 'ROOM_HOST'].includes(user?.role);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="navbar-wrapper site-header">
      <HostRegistrationBanner />
      <div className="main-navbar site-nav">
        <div className="navbar-container site-nav-inner">
          <Link className="nav-brand site-brand" aria-label="Trang chủ HL_RCS" to="/" onClick={closeMenu}>
            <span className="site-brand-icon"><House size={22} aria-hidden="true" /></span>
            <span className="site-brand-text">
              <strong>HL_RCS</strong>
              <small>Rental Connection System</small>
            </span>
          </Link>

          <button ref={toggle} type="button" className="mobile-toggle site-menu-toggle" id="mobileMenuBtn"
            aria-expanded={menuOpen} aria-controls="navMenu" aria-label={menuOpen ? 'Đóng thực đơn' : 'Mở thực đơn'}
            onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>

          <nav ref={menu} className="site-navigation" aria-label="Điều hướng chính">
            <ul id="navMenu" className={`nav-menu${menuOpen ? ' show' : ''}`}>
              {links.map(([to, label]) => (
                <li key={to}>
                  <NavLink className="nav-item" to={to} onClick={closeMenu}>
                    {label}
                  </NavLink>
                </li>
              ))}
              {dashboard !== '/' && (
                <li className="site-menu-extra"><Link className="nav-item" to={dashboard} onClick={closeMenu}>Bảng điều khiển</Link></li>
              )}
              {user ? (
                <li className="site-menu-extra"><Link className="nav-item" to="/notifications" onClick={closeMenu}>Thông báo</Link></li>
              ) : (
                <li className="site-menu-extra"><Link className="nav-item" to="/register" onClick={closeMenu}>Đăng ký tài khoản</Link></li>
              )}
              {pathname === '/community' && <li className="site-menu-extra site-community-support"><CommunitySupportLinks /></li>}
              {user && <li className="site-menu-extra site-mobile-logout">
                <button type="button" className="nav-item site-menu-logout" onClick={signOut} disabled={leaving}>
                  <LogOut size={17} aria-hidden="true" />Đăng xuất
                </button>
              </li>}
            </ul>
          </nav>

          <div className="nav-actions site-nav-actions">
            {communityBell ? <CommunityNotificationBell /> : user && <NotificationBell />}
            <NavLink className="btn-wishlist-top site-favorite" to="/favorites"
              aria-label={`Phòng yêu thích, ${savedCount} phòng đã lưu`} title="Phòng yêu thích" onClick={closeMenu}>
              <Heart size={20} aria-hidden="true" />
              <span className="wishlist-count" aria-hidden="true">{savedCount > 99 ? '99+' : savedCount}</span>
            </NavLink>
            {user ? (
              <>
                {dashboard !== '/' && <Link className="site-dashboard" to={dashboard} aria-label="Bảng điều khiển" title="Bảng điều khiển">
                  <LayoutDashboard size={18} aria-hidden="true" /><span>Bảng điều khiển</span>
                </Link>}
                <div className="user-nav-pill site-account">
                  <Link className="user-nav-profile-link site-profile-link" to="/profile" onClick={closeMenu} aria-label={`Hồ sơ của ${name}`}>
                    <span className="site-avatar" aria-hidden="true">{user.avatar ? <img src={user.avatar} alt="" /> : name.charAt(0).toUpperCase()}</span>
                    <span className="site-account-meta">
                      <strong title={name}>{name}</strong>
                      <small>{roleLabels[user.role]}</small>
                    </span>
                  </Link>
                  <button type="button" className="user-nav-logout site-logout" title="Đăng xuất" aria-label="Đăng xuất"
                    onClick={signOut} disabled={leaving}><LogOut size={17} aria-hidden="true" /></button>
                </div>
              </>
            ) : (
              <>
                <Link className="site-login" to="/login" onClick={closeMenu}>Đăng nhập</Link>
                <Link className="site-register" to="/register" onClick={closeMenu}>Đăng ký ngay</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
