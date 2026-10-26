// Preserved from Code/giao_dien/html/staff-host-registrations.html and staff-host-registration-detail.html.
import {Link} from 'react-router-dom';
export default function StaffHostShellTemplate(props){return <div className="hr-staff staff-body" onClick={props.onShellClick}><div id="staffAppLayout" className="staff-app-layout">


    <div id="sidebarBackdrop" aria-hidden="true" className={`sidebar-backdrop ${props.mobileOpen ? "active" : ""}`}></div>


    <aside id="staffSidebar" aria-label="Thanh điều hướng nhân viên" className={`staff-sidebar ${props.mobileOpen ? "open" : ""}`}>

      <div className="sidebar-brand-box">
        <Link className="sidebar-brand-link" title="HL_RCS Rental Connection System" to="/staff">
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div className="brand-text-block">
            <div className="brand-portal-title">HL_RCS</div>
            <div className="brand-portal-role">STAFF PORTAL</div>
          </div>
        </Link>
        <button type="button" id="btnCloseSidebar" className="btn-close-sidebar-mobile" aria-label="Đóng thanh điều hướng">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>


      <nav className="sidebar-nav">

        <div className="nav-group-label">TỔNG QUAN</div>
        <ul className="nav-list">
          <li>
            <Link className="nav-link" id="navItemDashboard" to="/staff">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Bảng điều khiển</span>
            </Link>
          </li>
        </ul>


        <div className="nav-group-label">NGHIỆP VỤ VẬN HÀNH</div>
        <ul className="nav-list">
          <li>
            <Link className="nav-link active" id="navItemHostRegistration" to="/staff/host-registrations">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Đăng ký làm chủ trọ</span>
              <span className="nav-badge pending" id="sidebarHostRegBadge">{props.pending || 0}</span>
            </Link>
          </li>
          <li>
            <Link className="nav-link" id="navItemPropertyVerification" to="/staff/verifications">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Xác minh nhà trọ</span>
              <span className="nav-badge pending" id="sidebarPropBadge">0</span>
            </Link>
          </li>
          <li>
            <Link className="nav-link" id="navItemContentModeration" to="/staff?view=content-moderation">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Kiểm duyệt tin đăng</span>
              <span className="nav-badge pending" id="sidebarReportBadge">0</span>
            </Link>
          </li>
          <li>
            <Link className="nav-link" id="navItemCommunityModeration" to="/staff/community">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Kiểm duyệt cộng đồng</span>
              <span className="nav-badge pending" id="sidebarCommunityBadge">0</span>
            </Link>
          </li>
          <li>
            <Link className="nav-link" id="navItemFeedbackVerification" to="/staff?view=feedback-verification">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span>Đánh giá người thuê</span>
              <span className="nav-badge pending" id="sidebarFeedbackBadge">0</span>
            </Link>
          </li>
          <li>
            <Link className="nav-link" id="navItemStaffAssistance" to="/staff/assistance">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Yêu cầu hỗ trợ</span>
              <span className="nav-badge pending" id="sidebarSupportBadge">0</span>
            </Link>
          </li>
        </ul>


        <div className="nav-group-label">HỆ THỐNG &amp; NHẬT KÝ</div>
        <ul className="nav-list">
          <li>
            <Link className="nav-link" id="navItemModerationHistory" to="/staff?view=history">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Lịch sử kiểm duyệt</span>
            </Link>
          </li>
          <li>
            <Link className="nav-link" id="navItemPublicPortal" to="/">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>Xem trang công khai</span>
            </Link>
          </li>
          <li>
            <Link className="nav-link" id="navItemProfile" to="/profile">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Hồ sơ nhân viên</span>
            </Link>
          </li>
          <li>
            <button type="button" className="nav-link btn-logout-sidebar" id="btnSidebarLogout" style={{"color": "#e11d48"}}>
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Đăng xuất</span>
            </button>
          </li>
        </ul>
      </nav>



    </aside>


    <div className="staff-main-container">


      <header className="staff-topbar" role="banner">
        <div className="topbar-left">
          <button type="button" id="btnToggleSidebarMobile" className="btn-toggle-sidebar" aria-label="Mở menu điều hướng" aria-expanded={props.mobileOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="topbar-title-wrap">
            <h1 className="topbar-title">Xác minh đăng ký chủ trọ</h1>
            <div className="topbar-status-chip">
              <span className="live-dot-green"></span>
              <span>Xét duyệt tư cách</span>
            </div>
          </div>
        </div>

        <div className="topbar-right">

          <Link className="btn-view-public-site" title="Xem giao diện tìm kiếm phòng của người thuê" to="/">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span className="hide-mobile">Trang người thuê</span>
          </Link>


          <Link className="topbar-btn-bell" title="Xem thông báo hệ thống" aria-label="Thông báo" style={{"display": "flex", "alignItems": "center", "justifyContent": "center", "width": "36px", "height": "36px", "flexShrink": "0", "borderRadius": "8px", "border": "1px solid var(--staff-border)", "background": "#ffffff", "color": "var(--staff-text-muted)"}} to="/notifications">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </Link>


          <div className="staff-user-menu-wrapper" id="staffUserMenuWrapper">
            <button type="button" className="staff-user-btn" id="btnStaffUserDropdown" aria-haspopup="true" aria-expanded={props.userMenu}>
              <div className="staff-user-avatar" id="topbarAvatarFallback">{(props.user.fullName || 'S').charAt(0)}</div>
              <div className="staff-user-text hide-mobile">
                <span className="staff-user-name" id="topbarStaffName">{props.user.fullName}</span>
                <span className="staff-user-role" id="topbarStaffRole">{props.user.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên vận hành'}</span>
              </div>
              <svg className="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>


            <div className="staff-user-popover" id="staffUserPopover" style={{display:props.userMenu ? "block" : "none"}}>
              <div className="popover-header">
                <div className="popover-name" id="popoverStaffName">{props.user.fullName}</div>
                <div className="popover-phone" id="popoverStaffPhone">{props.user.phoneNumber || 'Chưa cập nhật số điện thoại'}</div>
              </div>
              <ul className="popover-links">
                <li><Link to="/profile">Hồ sơ cá nhân</Link></li>
                <li><Link to="/">Xem trang công khai</Link></li>
                <li className="popover-divider"></li>
                <li><button type="button" id="btnPopoverLogout" className="btn-popover-logout">Đăng xuất</button></li>
              </ul>
            </div>
          </div>
        </div>
      </header>


      {props.children}</div></div></div>;}
