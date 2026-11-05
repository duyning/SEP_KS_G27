import { AnimatePresence, MotionMenu, MotionButton } from '../components/motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck, ExternalLink, Flag, Globe, Heart, History, House, Layers, LayoutDashboard, LogOut, Menu, MessagesSquare, PanelTop, PlusCircle, Shield, Star, UserRound, Users, Wrench, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { landingFor, roleLabels } from '../routing/screens.js';
import { useToast } from '../components/PortalUI.jsx';
import { staffApi } from '../services/staff.js';
import { hostApi } from '../services/host.js';
import { staffHostApi } from '../services/staff-host-applications.js';

const hostFooterTitles = { '/host/property': 'Nhà trọ của tôi', '/host/room-types': 'Quản lý loại phòng', '/host/rooms': 'Danh sách phòng', '/host/viewings': 'Yêu cầu xem phòng', '/host/property/new': 'Đăng ký nhà trọ', '/host/property/edit':'Cập nhật hồ sơ nhà trọ' };

const publicLinks = [['Tìm phòng', '/search', House], ['Bản đồ', '/map', PanelTop], ['Đã lưu', '/favorites', Heart], ['Lịch xem phòng', '/bookings', CalendarDays], ['Dịch vụ', '/services', Wrench], ['Cộng đồng', '/community', MessagesSquare]];
const menus = {
  host: [
    ['TỔNG QUAN', [['Bảng điều khiển', '/host', LayoutDashboard]]],
    ['QUẢN LÝ NHÀ TRỌ', [
      ['Nhà trọ của tôi', '/host/property', House],
      ['Đăng ký nhà trọ', '/host/property/new', PlusCircle],
      ['Loại phòng & Giá', '/host/room-types', Layers],
      ['Danh sách phòng', '/host/rooms', ClipboardCheck]
    ]],
    ['LỊCH XEM PHÒNG', [
      ['Yêu cầu xem phòng', '/host/viewings', CalendarDays]
    ]],
    ['HỖ TRỢ / LIÊN KẾT', [
      ['Yêu cầu Staff hỗ trợ', '/host/support', MessagesSquare],
      ['Thông báo', '/host/notifications', Bell],
      ['Xem trang khách thuê', '/', Globe]
    ]]
  ],
  staff: [['TỔNG QUAN', [['Bảng điều khiển', '/staff', LayoutDashboard]]], ['XÁC MINH & KIỂM DUYỆT', [['Xác minh đăng ký chủ trọ', '/staff/host-registrations', UserRound], ['Xác minh nhà trọ', '/staff/verifications', House], ['Hồ sơ dịch vụ', '/staff/service-applications', Wrench], ['Kiểm duyệt tin đăng', '/staff?view=content-moderation', Flag], ['Kiểm duyệt cộng đồng', '/staff/community', Users], ['Xác minh đánh giá', '/staff?view=feedback-verification', Star], ['Yêu cầu hỗ trợ', '/staff/assistance', MessagesSquare]]], ['HỆ THỐNG & NHẬT KÝ', [['Lịch sử kiểm duyệt', '/staff?view=history', History]]]],
  admin: [['TỔNG QUAN', [['Bảng điều khiển', '/admin', LayoutDashboard], ['Tài khoản hệ thống', '/admin?view=accounts', Users]]], ['ĐIỀU PHỐI', [['Phân công nhân viên', '/admin?view=assignment', ClipboardCheck], ['Xét duyệt hồ sơ dịch vụ', '/staff/service-applications', Wrench]]], ['HỆ THỐNG', [['Nhật ký hoạt động', '/admin?view=activity', History]]]],
};
export function Brand({ portal = 'public', onClick }) {
  return (
    <Link className="sidebar-brand-link" to={portal === 'public' ? '/' : `/${portal}`} onClick={onClick}>
      <div className="brand-logo-icon">
        {portal === 'staff' || portal === 'admin' ? <Shield size={22} /> : <House size={22} />}
      </div>
      <div className="brand-text-block">
        <div className="brand-portal-title">HL_RCS</div>
        <div className="brand-portal-role">
          {portal === 'public'
            ? 'Rental Connection System'
            : portal === 'host'
            ? 'ROOM HOST PORTAL'
            : `${portal.toUpperCase()} PORTAL`}
        </div>
      </div>
    </Link>
  );
}
export default function PortalLayout({ screen, children }) {
  const { user, logout } = useAuth();
  const notify = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const toggle = useRef();
  const sidebar = useRef();
  const popoverRef = useRef();
  const portal = ['host', 'staff', 'admin'].includes(screen.portal) ? screen.portal : 'public';
  const topbarTitle = screen.path === '/staff' ? 'Bảng điều khiển Nhân viên' : screen.path === '/staff/verifications' ? 'Xác minh nhà trọ' : screen.path === '/staff/verifications/detail' ? 'Thẩm định hồ sơ xác minh' : screen.title;
  const [staffCounts, setStaffCounts] = useState(null);
  const [pendingHostApplications, setPendingHostApplications] = useState(null);
  const [canRegister, setCanRegister] = useState(false);
  useEffect(() => {
    if (portal !== 'host') return;
    const controller = new AbortController();
    setCanRegister(false);
    hostApi.registrationEligibility(controller.signal).then(data => { if (!controller.signal.aborted) setCanRegister(data.canRegister); }).catch(() => { if (!controller.signal.aborted) setCanRegister(false); });
    return () => controller.abort();
  }, [portal, user?.userId, location.key]);
  const [staffRevision, setStaffRevision] = useState(0);
  useEffect(() => {
    if (portal !== 'staff') return;
    const refresh = () => setStaffRevision(value => value + 1);
    window.addEventListener('hlrcs:staff-updated', refresh);
    return () => window.removeEventListener('hlrcs:staff-updated', refresh);
  }, [portal]);
  useEffect(() => {
    if (portal !== 'staff') return;
    const controller = new AbortController();
    Promise.allSettled([
      staffApi.dashboard(controller.signal),
      staffHostApi.list({ size: 1 }, controller.signal),
    ]).then(([dashboard, applications]) => {
      if (controller.signal.aborted) return;
      setStaffCounts(dashboard.status === 'fulfilled' ? dashboard.value : null);
      setPendingHostApplications(applications.status === 'fulfilled' ? applications.value.stats.pending : null);
    });
    return () => controller.abort();
  }, [portal, user?.userId, location.pathname, staffRevision]);
  const staffBadges = { '/staff/host-registrations': pendingHostApplications, '/staff/verifications': staffCounts?.pendingVerifications, '/staff?view=content-moderation': staffCounts?.pendingReports, '/staff/community': staffCounts?.pendingCommunity, '/staff?view=feedback-verification': staffCounts?.pendingFeedback, '/staff/assistance': staffCounts?.pendingSupport };
  const closeMenu = () => { setOpen(false); toggle.current?.focus(); };

  useEffect(() => {
    setOpen(false);
    setUserMenuOpen(false);
    document.title = `${screen.title} | HL_RCS`;
  }, [location.key, screen.title]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    const keydown = event => { if (event.key === 'Escape') { event.preventDefault(); setUserMenuOpen(false); popoverRef.current?.querySelector('#btnHostUserDropdown')?.focus(); } };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('mousedown', handleOutsideClick); document.removeEventListener('keydown', keydown); };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const element = sidebar.current;
    element?.querySelector('button,a')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
      if (event.key === 'Tab' && element) {
        const items = [...element.querySelectorAll('a,button:not(:disabled)')].filter(item => item.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);

  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    try { if (await logout() === false) return; navigate('/login', {replace:true}); } catch { notify('Phiên trên thiết bị đã được xóa. Máy chủ không phản hồi khi đăng xuất.', 'error'); navigate('/login', {replace:true}); }
    finally { setLeaving(false); }
  }

  const avatarChar = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : 'H');
  const initials = user?.fullName?.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('') || (user?.email ? user.email.slice(0, 2).toUpperCase() : 'U');

  const userRoleText = portal === 'host' ? 'Chủ trọ đối tác' : (user ? roleLabels[user.role] : '');

  const account = user ? (
    <div className="host-user-menu-wrapper" ref={popoverRef}>
      <MotionButton
        type="button"
        className="host-user-btn"
        id="btnHostUserDropdown"
        aria-expanded={userMenuOpen}
        aria-haspopup="true"
        onClick={() => setUserMenuOpen((prev) => !prev)}
      >
        <div className="host-user-avatar">{portal === 'host' ? avatarChar : initials}</div>
        <div className="host-user-text hide-mobile">
          <span className="host-user-name">{user.fullName || user.email}</span>
          <span className="host-user-role">{userRoleText}</span>
        </div>
        <ChevronDown size={14} className="chevron-icon" />
      </MotionButton>

      <AnimatePresence>{userMenuOpen && (
        <MotionMenu className="host-user-popover" id="hostUserPopover">
          <div className="popover-header">
            <div className="popover-name">{user.fullName || 'Người dùng'}</div>
            <div className="popover-phone">{user.phoneNumber || user.email}</div>
          </div>
          <ul className="popover-links">
            <li>
              <Link to="/profile" onClick={() => setUserMenuOpen(false)}>
                <UserRound size={15} /> Hồ sơ cá nhân
              </Link>
            </li>
            {portal !== 'public' && (
              <li>
                <Link to="/" onClick={() => setUserMenuOpen(false)}>
                  <ExternalLink size={15} /> Xem trang công khai
                </Link>
              </li>
            )}
            {portal === 'public' && landingFor(user) !== '/' && (
              <li>
                <Link to={landingFor(user)} onClick={() => setUserMenuOpen(false)}>
                  <LayoutDashboard size={15} /> Trang quản lý {roleLabels[user.role]}
                </Link>
              </li>
            )}
            <li className="popover-divider" />
            <li>
              <MotionButton
                type="button"
                id="btnPopoverLogout"
                className="btn-popover-logout"
                onClick={() => {
                  setUserMenuOpen(false);
                  signOut();
                }}
                disabled={leaving}
              >
                <LogOut size={15} /> {leaving ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </MotionButton>
            </li>
          </ul>
        </MotionMenu>
      )}</AnimatePresence>
    </div>
  ) : (
    <div className="portal-auth-links">
      <Link to="/login">Đăng nhập</Link>
      <Link className="p-button primary" to="/register">Đăng ký ngay</Link>
    </div>
  );

  const sidebarLogoutButton = (
    <MotionButton
      type="button"
      id="btnSidebarLogout"
      className="portal-nav-link btn-logout-sidebar"
      onClick={signOut}
      disabled={leaving}
    >
      <LogOut size={18} />
      <span>{leaving ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
    </MotionButton>
  );

  const topbarLogoutButton = user && (
    <MotionButton
      type="button"
      id="btnHostLogout"
      className="btn-topbar-logout"
      title="Đăng xuất khỏi tài khoản"
      aria-label="Đăng xuất"
      onClick={signOut}
      disabled={leaving}
    >
      <LogOut size={16} />
      <span className="btn-logout-label">{leaving ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
    </MotionButton>
  );

  if (['/favorites','/favorites/compare'].includes(location.pathname)) return children;
  if (portal === 'public' && ['/', '/profile', '/become-host', '/properties/detail', '/search', '/community', '/services', '/services/detail'].includes(location.pathname)) return children;

  return (
    <div className={`portal-app ${portal}-portal ${location.pathname==='/'?'home-route':''} ${screen.path === '/host/property' ? 'host-property-route' : ''} ${screen.path === '/host/room-types' ? 'host-room-types-route' : ''} ${screen.path === '/host/rooms' ? 'host-rooms-route' : ''} ${screen.path === '/host/viewings' ? 'host-viewings-route' : ''} ${screen.path === '/host/property/new' ? 'host-property-create-route' : ''}`}>
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>

      {portal === 'public' ? (
        <header className="public-header">
          <div className="public-announcement">Hòa Lạc Campus <span>Kết nối cộng đồng thuê trọ tại Hòa Lạc</span></div>
          <div className="public-navbar">
            <Brand />
            <nav className="public-desktop-nav" aria-label="Điều hướng chính">
              {location.pathname==='/'?<><a href="#nha-tro">Tìm phòng trọ</a><a href="#khu-vuc">Khu vực Hòa Lạc</a><a href="#loi-the">Lợi thế HL_RCS</a><a href="#chu-tro">Dành cho Chủ trọ</a></>:publicLinks.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}
            </nav>
            <div className="public-account">{account}</div>
            <MotionButton ref={toggle} className="p-icon portal-menu-toggle" title="Mở menu" aria-label="Mở menu" aria-expanded={open} aria-controls="portal-navigation" onClick={() => setOpen(true)}>
              <Menu size={23} />
            </MotionButton>
          </div>
        </header>
      ) : (
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <MotionButton ref={toggle} className="p-icon portal-menu-toggle" title="Mở menu" aria-label="Mở menu" aria-expanded={open} aria-controls="portal-navigation" onClick={() => setOpen(true)}>
              <Menu size={22} />
            </MotionButton>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>{screen.path === '/host/property/new' ? <><span className="registration-topbar-parent"><Link to="/host">Bảng điều khiển</Link> / <Link to="/host/property">Nhà trọ của tôi</Link> / </span>Đăng ký nhà trọ</> : topbarTitle}</h1>
              {portal === 'staff' && staffCounts && <div className="topbar-status-chip hide-mobile"><span className="live-dot-green" /><span>{screen.path.startsWith('/staff/verifications') ? 'Thẩm định hồ sơ' : 'Hệ thống trực tuyến'}</span></div>}
              {portal === 'host' && !['/host/rooms', '/host/viewings', '/host/property/new'].includes(screen.path) && (
                <div className="topbar-status-chip hide-mobile">
                  <span className="live-dot-green" />
                  <span>{screen.path === '/host/property' ? 'Danh mục nhà trọ' : screen.path === '/host/room-types' ? 'Bảng giá & Tiện nghi' : 'Hệ thống trực tuyến'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="portal-topbar-right">
            <Link className="btn-view-public-site" to="/" title="Xem giao diện tìm kiếm phòng của người thuê">
              <ExternalLink size={15} /> <span className="hide-mobile">Trang người thuê</span>
            </Link>
            <Link className="p-icon" title="Thông báo" aria-label="Thông báo" to={portal === 'host' ? '/host/notifications' : '/notifications'}>
              <Bell size={18} />
            </Link>
            {portal !== 'host' && portal !== 'staff' && topbarLogoutButton}
            {account}
          </div>
        </header>
      )}

      {open && <MotionButton type="button" className="portal-backdrop" aria-label="Đóng menu" onClick={closeMenu} tabIndex={-1} />}

      <aside ref={sidebar} id="portal-navigation" className={`portal-sidebar ${open ? 'is-open' : ''}`} aria-label="Điều hướng portal" aria-modal={open ? true : undefined} role={open ? 'dialog' : undefined}>
        <div className="portal-sidebar-brand">
          <Brand portal={portal} />
          <MotionButton type="button" className="p-icon portal-close-menu" title="Đóng menu" aria-label="Đóng menu" onClick={closeMenu}>
            <X size={20} />
          </MotionButton>
        </div>
        <nav>
          {(portal === 'public' ? [['KHÁM PHÁ', publicLinks]] : menus[portal]).map(([group, links]) => (
            <section className="portal-nav-group" key={group}>
              <p>{group}</p>
              {links.map(([label, to, Icon]) => {
                if (portal === 'host' && to === '/host/property/new' && !canRegister) return null;
                const selectedPropertyId = new URLSearchParams(location.search).get('propertyId');
                const scopedLink = portal === 'host' && selectedPropertyId && ['/host/room-types','/host/rooms'].includes(to) ? `${to}?propertyId=${encodeURIComponent(selectedPropertyId)}` : to;
                const active = to === '/staff' ? location.pathname === '/staff' && !new URLSearchParams(location.search).has('view') : location.pathname === to || `${location.pathname}${location.search}` === to || (!to.includes('?') && to !== `/${portal}` && location.pathname.startsWith(`${to}/`) && !(to === '/host/property' && location.pathname === '/host/property/new'));
                return (
                  <Link key={to} to={scopedLink} className={`portal-nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
                    <Icon size={19} />
                    <span>{label}</span>
                    {portal === 'staff' && staffBadges[to] != null && <span className="sw-nav-count">{staffBadges[to]}</span>}
                  </Link>
                );
              })}
            </section>
          ))}
          {portal !== 'host' && (
            <section className="portal-nav-group">
              <p>TÀI KHOẢN</p>
              {user && (
                <Link className="portal-nav-link" to="/profile" onClick={() => setOpen(false)}>
                  <UserRound size={19} />
                  <span>Hồ sơ cá nhân</span>
                </Link>
              )}
              {portal === 'public' && user && landingFor(user) !== '/' && (
                <Link className="portal-nav-link" to={landingFor(user)} onClick={() => setOpen(false)}>
                  <LayoutDashboard size={19} />
                  <span>{roleLabels[user.role]}</span>
                </Link>
              )}
              {user ? sidebarLogoutButton : <Link className="portal-nav-link" to="/login" onClick={() => setOpen(false)}>Đăng nhập</Link>}
            </section>
          )}
        </nav>
        {portal !== 'host' && user && (
          <footer className="portal-sidebar-footer" style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="host-user-avatar" style={{ width: '34px', height: '34px', fontSize: '12px' }}>{portal === 'host' ? avatarChar : initials}</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.fullName || user.email}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{userRoleText}</div>
              </div>
            </div>
          </footer>
        )}
      </aside>

      <main id="main-content" tabIndex={-1} className={`portal-content ${portal === 'public' ? 'public-content' : ''} ${screen.path === '/properties/detail' ? 'detail-public-content' : ''}`}>
        {portal !== 'host' && location.pathname !== '/' && screen.path !== '/properties/detail' && (
          <nav className="portal-breadcrumbs" aria-label="Đường dẫn">
            <Link to="/">HL_RCS</Link>
            <ChevronRight size={13} />
            <Link to={portal === 'public' ? '/' : `/${portal}`}>
              {portal === 'public' ? 'Trang chủ' : `${portal[0].toUpperCase()}${portal.slice(1)} Portal`}
            </Link>
            <ChevronRight size={13} />
            <span aria-current="page">{screen.title}</span>
          </nav>
        )}
        {children}
      </main>

      {portal === 'host' && (
        <footer className="host-footer">
          <div className="footer-inner">
            <span>{hostFooterTitles[screen.path] ? `© 2026 HL_RCS · ${hostFooterTitles[screen.path]} (Room Host Portal).` : '© 2026 HL_RCS • Bảng điều khiển dành riêng cho Chủ trọ Hòa Lạc (Room Host Portal).'}</span>
            <span className="footer-links">
              <Link to="/">Trang chủ</Link> • 
              {hostFooterTitles[screen.path] ? <><Link to="/host">Bảng điều khiển</Link> · <Link to="/profile">Hồ sơ cá nhân</Link></> : <><Link to="/profile">Hồ sơ</Link> • <a href="tel:0912345678">Hotline: 0912 345 678</a></>}
            </span>
          </div>
        </footer>
      )}

      {portal === 'public' && location.pathname!=='/' && (
        <footer className="public-footer">
          <Brand />
          <p>Kết nối trực tiếp, minh bạch và an toàn.</p>
          <nav>
            <Link to="/search">Tìm phòng</Link>
            <Link to="/community">Cộng đồng</Link>
            <Link to="/services">Dịch vụ</Link>
          </nav>
        </footer>
      )}
    </div>
  );
}
