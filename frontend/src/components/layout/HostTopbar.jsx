import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ExternalLink, LogOut, Menu, User, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function HostTopbar({ title = 'Bảng điều khiển', onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <header className="host-topbar" role="banner">
      <div className="topbar-left">
        <button
          type="button"
          id="btnToggleSidebarMobile"
          className="btn-toggle-sidebar"
          aria-label="Mở menu quản lý"
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
          to="/host/notifications"
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

        {/* Direct Logout Button */}
        {user && (
          <button
            type="button"
            className="btn-host-topbar-logout"
            title="Đăng xuất khỏi tài khoản Chủ trọ"
            aria-label="Đăng xuất"
            onClick={handleLogout}
            disabled={leaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #fecdd3',
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
            <span className="hide-mobile">{leaving ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
          </button>
        )}

        {/* Host User Dropdown */}
        {user && (
          <div className="host-user-menu-wrapper" ref={popoverRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="host-user-btn"
              id="btnHostUserDropdown"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <div
                className="host-user-avatar"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0d9488',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                {(user.fullName || 'H').slice(0, 1).toUpperCase()}
              </div>
              <div className="host-user-text hide-mobile" style={{ textAlign: 'left' }}>
                <span className="host-user-name" style={{ display: 'block', fontSize: '13px', lineHeight: 1.2 }}>
                  {user.fullName || user.email}
                </span>
                <span className="host-user-role" style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 400 }}>
                  Chủ trọ đối tác
                </span>
              </div>
              <ChevronDown size={14} style={{ color: '#94a3b8' }} />
            </button>

            {/* Dropdown Popover */}
            {userMenuOpen && (
              <div
                className="host-user-popover"
                id="hostUserPopover"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '210px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  padding: '8px 0',
                  zIndex: 100,
                }}
              >
                <div className="popover-header" style={{ padding: '8px 14px 10px', borderBottom: '1px solid #e2e8f0' }}>
                  <div className="popover-name" style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    {user.fullName || 'Chủ trọ'}
                  </div>
                  <div className="popover-phone" style={{ fontSize: '12px', color: '#64748b' }}>
                    {user.phoneNumber || user.email}
                  </div>
                </div>
                <ul className="popover-links" style={{ listStyle: 'none', padding: '6px 0 0', margin: 0 }}>
                  <li>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '13px', color: '#0f172a', textDecoration: 'none' }}
                    >
                      <UserRound size={15} /> Hồ sơ cá nhân
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '13px', color: '#0f172a', textDecoration: 'none' }}
                    >
                      <ExternalLink size={15} /> Xem trang công khai
                    </Link>
                  </li>
                  <li className="popover-divider" style={{ height: '1px', background: '#e2e8f0', margin: '6px 0' }} />
                  <li>
                    <button
                      type="button"
                      id="btnPopoverLogout"
                      className="btn-popover-logout"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={leaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 14px',
                        fontSize: '13px',
                        color: '#e11d48',
                        fontWeight: 600,
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <LogOut size={15} /> {leaving ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
