import { MotionButton } from '../components/motion/MotionUI.jsx';
// Original markup from Code/giao_dien/html/profile.html, bound to the authenticated profile API.
import {Link} from 'react-router-dom';
import {ChevronDown,X,UserRound} from 'lucide-react';
const mobileTabLabels={info:'Thông tin cá nhân',favorites:'Nhà trọ đã lưu',appointments:'Lịch xem phòng',reports:'Báo cáo của tôi',security:'Bảo mật & Mật khẩu'};
export default function ProfilePrototype({user,roleLabel,perks,values,passwords,eyes,editing,tab,errors,busy,mobileOpen,accountMenuOpen,announcementOpen,account,onClick,onSubmit,onChange,alert}) {
return <div className="prototype-home prototype-profile profile-mobile" onClick={onClick} onSubmit={onSubmit} onChange={onChange}>


  <header className="navbar-wrapper">
    <div className={`top-announcement ${announcementOpen?'pm-info-open':''}`}><MotionButton type="button" id="profileInfoToggle" className="pm-info-toggle" aria-expanded={announcementOpen} aria-controls="profileInformation"><span>Hòa Lạc Campus · Thông tin &amp; hỗ trợ</span><ChevronDown size={14}/></MotionButton>
      <div className="container top-announcement-inner" id="profileInformation">
        <div className="announcement-left">
          <span className="badge-tag">Hòa Lạc Campus</span>
          <span className="announcement-text">Hệ thống phòng trọ đã xác thực 100% quanh ĐH FPT &amp; Khu Công nghệ cao Hòa Lạc</span>
        </div>
        <div className="announcement-right">
          <a href="tel:0912345678" className="contact-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>Hotline hỗ trợ: 0912 345 678</span>
          </a>
          <span className="sep">•</span>
          <span className="status-live"><span className="live-dot"></span>Cập nhật phòng trống hôm nay</span>
        </div>
      </div>
    </div>

    <nav className="main-navbar">
      <div className="container navbar-container">

        <Link className="nav-brand" aria-label="Trang chủ HL_RCS" to="/">
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-name">HL_RCS</span>
            <span className="brand-sub">Rental Connection System</span>
          </div>
        </Link>


        <ul id="navMenu" className={`nav-menu ${mobileOpen ? "show" : ""}`}>
          <li><Link className="nav-item" to="/search">Tìm phòng</Link></li>
          <li><Link className="nav-item" to="/map">Bản đồ</Link></li>
          <li><Link className="nav-item" to="/favorites">Đã lưu (<span className="menu-fav-count">0</span>)</Link></li>
          <li><Link className="nav-item" to="/bookings">Lịch xem phòng</Link></li>
          <li><Link className="nav-item" to="/services">Dịch vụ</Link></li>
          <li><Link className="nav-item" to="/community">Cộng đồng</Link></li>
          <li><Link className="nav-item active" to="/profile">Hồ sơ cá nhân</Link></li><li className="pm-menu-account">{account}</li>
        </ul>


        <div className="nav-actions">{account}</div>


        <MotionButton className="mobile-toggle" id="mobileMenuBtn" type="button" aria-label={mobileOpen?"Đóng thực đơn":"Mở thực đơn"} aria-controls="navMenu" aria-expanded={mobileOpen}>
          {mobileOpen?<X size={24}/>:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>}
        </MotionButton>
      </div>
    </nav>
  </header>
  {mobileOpen&&<button type="button" className="pm-menu-backdrop pm-menu-dismiss" aria-label="Đóng thực đơn và quay lại hồ sơ"/>}


  <section className="profile-header-banner" id="profileHeaderBanner">
    <div className="container">
      <div className="profile-header-card">

        <div className="profile-user-main">
          <div className="profile-avatar-wrapper">
            <img alt="Avatar" className="profile-avatar-img" id="profileAvatarImg" src={user.avatar || undefined} style={{display:user.avatar ? "block" : "none"}}/>
            <div className="profile-avatar-fallback" id="profileAvatarFallback" style={{display:user.avatar ? "none" : "grid"}}>{(user.fullName || 'U').charAt(0).toUpperCase()}</div>
            <MotionButton type="button" className="btn-avatar-camera" id="btnTriggerAvatarUpload" title="Thay đổi ảnh đại diện" disabled={busy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </MotionButton>
            <input type="file" id="avatarFileInput" accept="image/*" style={{"display": "none"}}/>
          </div>

          <div className="profile-user-info">
            <div className="profile-name-row">
              <h1 className="profile-display-name" id="profileDisplayName">{user.fullName || 'Người dùng HL_RCS'}</h1>
              <span className="profile-role-badge" id="profileRoleBadge">{roleLabel}</span>
            </div>
            <div className="profile-user-meta">
              <span id="profileDisplayEmail">{user.email}</span>
              <span className="badge-verified-email">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Đã xác thực
              </span>
              <span id="profileMemberSince">{'Thành viên từ ' + (user.createdAt ? new Date(user.createdAt).getFullYear() : '—')}</span>
            </div>
          </div>
        </div>


        <div className="profile-header-stats">
          <Link className="profile-stat-box" title="Xem danh sách nhà trọ đã lưu" to="/favorites">
            <div className="profile-stat-icon fav">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
            </div>
            <div>
              <div className="profile-stat-num" id="headerFavCount">0</div>
              <div className="profile-stat-label">Nhà trọ đã lưu</div>
            </div>
          </Link>

          <div className="profile-stat-box" id="headerApptBox" role="button" tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.currentTarget.click();}}} style={{"cursor": "pointer"}}>
            <div className="profile-stat-icon cal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div>
              <div className="profile-stat-num" id="headerApptCount">0</div>
              <div className="profile-stat-label">Lịch xem phòng</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>


  <main className="profile-main-section" id="profileMainSection">
    <div className="container">
      <div className="profile-layout-grid">


        <aside className={`profile-sidebar ${accountMenuOpen?'pm-account-open':''}`} aria-label="Chức năng tài khoản">
          <MotionButton type="button" className="pm-account-toggle" id="profileAccountToggle" aria-expanded={accountMenuOpen} aria-controls="profileAccountMenu"><span className="pm-account-icon"><UserRound size={20}/></span><span><small>Quản lý tài khoản</small><strong>{mobileTabLabels[tab]}</strong></span><ChevronDown size={20}/></MotionButton>
          <ul className="profile-nav-menu" id="profileAccountMenu">
            <li id="sidebarHostLinkItem" style={{display:user.role === "ROOM_HOST" || user.role === "ADMIN" ? "block" : "none"}}>
              <Link className="profile-nav-btn" style={{"textDecoration": "none", "background": "rgba(13, 148, 136, 0.08)", "color": "var(--primary)"}} title="Vào Bảng điều khiển Chủ trọ" to="/host">
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>Bảng điều khiển Chủ trọ</span>
                </span>
                <span className="profile-nav-badge" style={{"background": "var(--primary)", "color": "#fff"}}>Host</span>
              </Link>
            </li>
            <li id="sidebarBecomeHostItem" style={{display:user.role === "USER" ? "block" : "none"}}>
              <Link className="profile-nav-btn" title="Đăng ký làm chủ trọ" to="/become-host">
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  <span>Đăng ký làm chủ trọ</span>
                </span>
              </Link>
            </li>
            <li>
              <MotionButton type="button" data-tab="info" id="navBtnInfo" className={`profile-nav-btn ${tab === "info" ? "active" : ""}`} aria-selected={tab === "info"}>
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>Thông tin cá nhân</span>
                </span>
              </MotionButton>
            </li>
            <li>
              <MotionButton type="button" data-tab="favorites" id="navBtnFavorites" className={`profile-nav-btn ${tab === "favorites" ? "active" : ""}`} aria-selected={tab === "favorites"}>
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                  <span>Nhà trọ đã lưu</span>
                </span>
                <span className="profile-nav-badge" id="sidebarFavBadge">0</span>
              </MotionButton>
            </li>
            <li>
              <MotionButton type="button" data-tab="appointments" id="navBtnAppointments" className={`profile-nav-btn ${tab === "appointments" ? "active" : ""}`} aria-selected={tab === "appointments"}>
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <span>Lịch xem phòng</span>
                </span>
                <span className="profile-nav-badge" id="sidebarApptBadge">0</span>
              </MotionButton>
            </li>
            <li>
              <Link className="profile-nav-btn" style={{"textDecoration": "none"}} id="navBtnServices" title="Xem dịch vụ hỗ trợ quanh trọ" to="/services">
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"></rect><path d="m16 8 5 3-5 3v-6z"></path><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                  <span>Dịch vụ quanh trọ</span>
                </span>
                <span className="profile-nav-badge" style={{"background": "rgba(13, 148, 136, 0.1)", "color": "var(--primary)"}}>8</span>
              </Link>
            </li>
            <li>
              <MotionButton type="button" data-tab="reports" id="navBtnReports" title="Báo cáo nhà trọ bạn đã gửi" className={`profile-nav-btn ${tab === "reports" ? "active" : ""}`} aria-selected={tab === "reports"}>
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                  <span>Báo cáo của tôi</span>
                </span>
                <span className="profile-nav-badge" id="sidebarReportBadge">0</span>
              </MotionButton>
            </li>
            <li>
              <MotionButton type="button" data-tab="security" id="navBtnSecurity" className={`profile-nav-btn ${tab === "security" ? "active" : ""}`} aria-selected={tab === "security"}>
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <span>Bảo mật &amp; Mật khẩu</span>
                </span>
              </MotionButton>
            </li>

            <li className="profile-nav-divider"></li>

            <li>
              <MotionButton type="button" className="profile-nav-btn btn-logout" id="btnSidebarLogout" disabled={busy}>
                <span className="profile-nav-item-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>Đăng xuất tài khoản</span>
                </span>
              </MotionButton>
            </li>
          </ul>
        </aside>


        <div className="profile-content-area">{alert && <div className="profile-api-error" role="alert">{alert}</div>}


          <div id="tabPanelInfo" className={`profile-tab-panel ${tab === "info" ? "active" : ""}`}>
            <div className="profile-card">

              <div className="profile-card-header">
                <div className="profile-card-title-group">
                  <h2>Thông tin tài khoản</h2>
                  <p>Thông tin cơ bản được sử dụng để xác minh danh tính và liên hệ đặt phòng tại Hòa Lạc.</p>
                </div>
                <MotionButton type="button" className="btn-secondary" id="btnStartEditProfile" style={{display:editing ? "none" : "inline-flex"}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  <span>Chỉnh sửa thông tin</span>
                </MotionButton>
              </div>


              <div id="profileViewMode" style={{display:editing ? "none" : "block"}}>
                <div className="profile-info-grid">
                  <div className="info-item">
                    <span className="info-label">Họ và tên</span>
                    <span className="info-val" id="viewFullName">{user.fullName || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Số điện thoại liên hệ</span>
                    <span className="info-val" id="viewPhone">{user.phoneNumber || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Địa chỉ Email</span>
                    <span className="info-val" id="viewEmail">{user.email || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Vai trò trong hệ thống</span>
                    <span className="info-val" id="viewRole">{roleLabel}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Trường học / Nơi làm việc</span>
                    <span className="info-val" id="viewOrganization">{user.organization || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Khu vực sinh sống / Tìm kiếm</span>
                    <span className="info-val" id="viewAddress">{user.preferredArea || '—'}</span>
                  </div>
                </div>
              </div>


              <form id="profileEditForm" noValidate style={{display:editing ? "block" : "none"}}>
                <div className="profile-form-grid">
                  <div className="form-field">
                    <label htmlFor="editFullName">Họ và tên <span style={{"color": "var(--rose)"}}>*</span></label>
                    <input type="text" id="editFullName" className="form-input" placeholder="Nhập họ và tên đầy đủ" required maxLength="100" name="fullName" value={values.fullName} aria-invalid={!!errors.fullName}/>
                    <span id="errEditFullName" className={`field-error ${errors.fullName || '' ? "show" : ""}`} role="alert">{errors.fullName || ''}</span>
                  </div>

                  <div className="form-field">
                    <label htmlFor="editPhone">Số điện thoại <span style={{"color": "var(--rose)"}}>*</span></label>
                    <input type="tel" id="editPhone" className="form-input" placeholder="Ví dụ: 0912345678" required maxLength="20" name="phoneNumber" value={values.phoneNumber} aria-invalid={!!errors.phoneNumber}/>
                    <span id="errEditPhone" className={`field-error ${errors.phoneNumber || '' ? "show" : ""}`} role="alert">{errors.phoneNumber || ''}</span>
                  </div>

                  <div className="form-field">
                    <label htmlFor="editEmail">Địa chỉ Email (Chính chủ)</label>
                    <input type="email" id="editEmail" className="form-input readonly" disabled title="Email đăng nhập không thể thay đổi" maxLength="255" aria-invalid="false" name="email" value={user.email || ""}/>
                    <span className="field-hint">Email đăng ký gắn với tài khoản hệ thống</span>
                  </div>

                  <div className="form-field">
                    <label htmlFor="editRole">Vai trò tài khoản</label>
                    <input type="text" id="editRole" className="form-input readonly" disabled title="Vai trò được quản lý phân quyền tự động" maxLength="255" aria-invalid="false" name="role" value={roleLabel}/>
                    <span className="field-hint">Cố định theo phân quyền tài khoản</span>
                  </div>

                  <div className="form-field">
                    <label htmlFor="editOrganization">Trường học / Nơi làm việc</label>
                    <input type="text" id="editOrganization" className="form-input" placeholder="Ví dụ: Đại học FPT Hòa Lạc" maxLength="255" aria-invalid="false" name="organization" value={values.organization}/>
                  </div>

                  <div className="form-field">
                    <label htmlFor="editAddress">Khu vực ưu tiên tìm phòng</label>
                    <input type="text" id="editAddress" className="form-input" placeholder="Ví dụ: Tân Xã, Thạch Hòa" maxLength="255" aria-invalid="false" name="preferredArea" value={values.preferredArea}/>
                  </div>
                </div>

                <div className="form-actions-row">
                  <MotionButton type="button" className="btn-secondary" id="btnCancelEditProfile">Hủy bỏ</MotionButton>
                  <MotionButton type="submit" className="btn-primary-action" id="btnSaveProfile" disabled={busy}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    <span>Lưu thay đổi</span>
                  </MotionButton>
                </div>
              </form>


              <div className="role-perks-card" id="rolePerksCard">
                <div className="role-perks-left">
                  <div className="role-perks-icon" id="rolePerksIcon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                  </div>
                  <div>
                    <h3 className="role-perks-title" id="rolePerksTitle">{perks.title}</h3>
                    <p className="role-perks-desc" id="rolePerksDesc">{perks.description}</p>
                  </div>
                </div>
                <div id="rolePerksAction">
                  <Link className="btn-secondary" style={{"textDecoration": "none"}} to="/search">Tìm phòng trọ mới</Link>
                </div>
              </div>

            </div>
          </div>


          <div id="tabPanelFavorites" className={`profile-tab-panel ${tab === "favorites" ? "active" : ""}`}>
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-title-group">
                  <h2>Nhà trọ đã lưu của bạn</h2>
                  <p id="profileFavSummaryText">Xem lại và quản lý các phòng trọ bạn đã đánh dấu yêu thích.</p>
                </div>
                <Link className="btn-secondary" style={{"textDecoration": "none"}} to="/favorites">
                  <span>Mở trang so sánh chi tiết →</span>
                </Link>
              </div>


              <div className="fav-rooms-grid" id="profileFavPreviewGrid">
        <div style={{"gridColumn": "1 / -1", "textAlign": "center", "padding": "48px 20px", "background": "var(--slate-50)", "border": "2px dashed var(--slate-300)", "borderRadius": "16px"}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" strokeWidth="1.8" style={{"marginBottom": "12px"}}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
          <h4 style={{"fontSize": "16px", "fontWeight": "700", "color": "var(--slate-900)", "marginBottom": "6px"}}>Chưa có nhà trọ nào được lưu</h4>
          <p style={{"fontSize": "13.5px", "color": "var(--slate-600)", "marginBottom": "18px"}}>Hãy bấm trái tim khi tìm kiếm để lưu lại phòng trọ ưng ý.</p>
          <Link className="btn-primary-action" style={{"textDecoration": "none"}} to="/search">Khám phá phòng trọ ngay</Link>
        </div>
      </div>
            </div>
          </div>


          <div id="tabPanelAppointments" className={`profile-tab-panel ${tab === "appointments" ? "active" : ""}`}>
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-title-group">
                  <h2>Lịch hẹn xem phòng thực tế</h2>
                  <p>Danh sách các yêu cầu hẹn gặp chủ trọ trực tiếp tại cơ sở nhà trọ Hòa Lạc.</p>
                </div>
                <Link className="btn-secondary" style={{"textDecoration": "none"}} to="/search">+ Đặt lịch phòng khác</Link>
              </div>


              <div className="appointment-list-wrap" id="profileApptList">
        <div style={{"textAlign": "center", "padding": "50px 20px", "background": "var(--slate-50)", "border": "2px dashed var(--slate-300)", "borderRadius": "16px"}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" strokeWidth="1.8" style={{"marginBottom": "12px"}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <h4 style={{"fontSize": "16px", "fontWeight": "700", "color": "var(--slate-900)", "marginBottom": "6px"}}>Bạn chưa có lịch hẹn xem phòng nào</h4>
          <p style={{"fontSize": "13.5px", "color": "var(--slate-600)", "marginBottom": "18px"}}>Khi xem chi tiết một căn phòng, bạn có thể gửi yêu cầu đặt lịch hẹn gặp trực tiếp chủ trọ miễn phí.</p>
          <div style={{"display": "flex", "justifyContent": "center", "gap": "10px", "flexWrap": "wrap"}}>
            <Link className="btn-primary-action" style={{"textDecoration": "none"}} to="/search">Tìm phòng và đặt lịch</Link>
            <Link className="btn-secondary" style={{"textDecoration": "none"}} to="/bookings">Xem trang Lịch xem phòng</Link>
          </div>
        </div>
      </div>
            </div>
          </div>


          <div id="tabPanelSecurity" className={`profile-tab-panel ${tab === "security" ? "active" : ""}`}>
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-title-group">
                  <h2>Bảo mật &amp; Đổi mật khẩu</h2>
                  <p>Để bảo vệ tài khoản, bạn nên sử dụng mật khẩu mạnh gồm chữ hoa, chữ thường và số.</p>
                </div>
              </div>

              <form id="changePasswordForm" noValidate>
                <div style={{"display": "flex", "flexDirection": "column", "gap": "18px", "maxWidth": "460px"}}>

                  <div className="form-field">
                    <label htmlFor="currentPassword">Mật khẩu hiện tại <span style={{"color": "var(--rose)"}}>*</span></label>
                    <div className="password-input-wrap">
                      <input id="currentPassword" className="form-input" placeholder="Nhập mật khẩu hiện tại" required maxLength="128" autoComplete="current-password" name="oldPassword" value={passwords.oldPassword} aria-invalid={!!errors.oldPassword} type={eyes.oldPassword ? "text" : "password"}/>
                      <MotionButton type="button" className="btn-toggle-eye" data-target="currentPassword" aria-label="Hiện hoặc ẩn mật khẩu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </MotionButton>
                    </div>
                    <span id="errCurrentPassword" className={`field-error ${errors.oldPassword || '' ? "show" : ""}`} role="alert">{errors.oldPassword || ''}</span>
                  </div>

                  <div className="form-field">
                    <label htmlFor="newPassword">Mật khẩu mới <span style={{"color": "var(--rose)"}}>*</span></label>
                    <div className="password-input-wrap">
                      <input id="newPassword" className="form-input" placeholder="Tối thiểu 6 ký tự" required maxLength="128" autoComplete="new-password" name="newPassword" value={passwords.newPassword} aria-invalid={!!errors.newPassword} type={eyes.newPassword ? "text" : "password"}/>
                      <MotionButton type="button" className="btn-toggle-eye" data-target="newPassword" aria-label="Hiện hoặc ẩn mật khẩu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </MotionButton>
                    </div>
                    <span id="errNewPassword" className={`field-error ${errors.newPassword || '' ? "show" : ""}`} role="alert">{errors.newPassword || ''}</span>
                  </div>

                  <div className="form-field">
                    <label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới <span style={{"color": "var(--rose)"}}>*</span></label>
                    <div className="password-input-wrap">
                      <input id="confirmNewPassword" className="form-input" placeholder="Nhập lại mật khẩu mới" required maxLength="128" autoComplete="new-password" name="confirmPassword" value={passwords.confirmPassword} aria-invalid={!!errors.confirmPassword} type={eyes.confirmPassword ? "text" : "password"}/>
                      <MotionButton type="button" className="btn-toggle-eye" data-target="confirmNewPassword" aria-label="Hiện hoặc ẩn mật khẩu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </MotionButton>
                    </div>
                    <span id="errConfirmNewPassword" className={`field-error ${errors.confirmPassword || '' ? "show" : ""}`} role="alert">{errors.confirmPassword || ''}</span>
                  </div>

                  <div>
                    <MotionButton type="submit" className="btn-primary-action" id="btnSubmitChangePassword" disabled={busy}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <span>Cập nhật mật khẩu mới</span>
                    </MotionButton>
                  </div>

                </div>
              </form>

              <div className="security-tips-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <div className="security-tips-text">
                  <strong>Khuyến nghị an toàn:</strong> Không chia sẻ mật khẩu hoặc mã xác thực với bất kỳ ai, kể cả người tự xưng là ban quản trị HL_RCS hoặc chủ trọ.
                </div>
              </div>

            </div>
          </div>


          <div id="tabPanelReports" className={`profile-tab-panel ${tab === "reports" ? "active" : ""}`}>
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-title-group">
                  <h2>Báo cáo nhà trọ của tôi</h2>
                  <p id="profileReportsSummaryText">Theo dõi tiến độ kiểm duyệt và xử lý các vấn đề bạn đã phản hồi cho HL_RCS.</p>
                </div>
                <Link className="btn-secondary" style={{"textDecoration": "none", "fontSize": "13px"}} to="/search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <span>Xem thêm phòng trọ</span>
                </Link>
              </div>


              <div className="profile-reports-feed" id="profileReportsFeed">
        <div style={{"textAlign": "center", "padding": "50px 20px", "background": "var(--slate-50)", "border": "2px dashed var(--slate-300)", "borderRadius": "16px"}}>
          <div style={{"width": "56px", "height": "56px", "borderRadius": "50%", "background": "#f0fdfa", "border": "1px solid #ccfbf1", "display": "grid", "placeItems": "center", "margin": "0 auto 14px", "color": "var(--primary)"}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          </div>
          <h4 style={{"fontSize": "16px", "fontWeight": "700", "color": "var(--slate-900)", "marginBottom": "6px"}}>Bạn chưa gửi báo cáo nào</h4>
          <p style={{"fontSize": "13.5px", "color": "var(--slate-600)", "maxWidth": "480px", "margin": "0 auto 18px", "lineHeight": "1.5"}}>
            Khi phát hiện thông tin nhà trọ bị sai giá, địa chỉ không đúng hoặc tin ảo, bạn có thể bấm <strong>"Báo cáo thông tin"</strong> trên trang chi tiết phòng để HL_RCS tiến hành kiểm tra.
          </p>
          <Link className="btn-primary-action" style={{"textDecoration": "none"}} to="/search">Khám phá phòng trọ Hòa Lạc</Link>
        </div>
      </div>


              <div className="reports-safety-tip-box" style={{"marginTop": "24px", "padding": "14px 18px", "background": "#f0fdfa", "border": "1px solid #ccfbf1", "borderRadius": "12px", "display": "flex", "alignItems": "flex-start", "gap": "12px", "fontSize": "13px", "color": "var(--primary-dark)", "lineHeight": "1.5"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{"flexShrink": "0", "color": "var(--primary)"}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <div>
                  <strong>Chính sách bảo mật người báo cáo:</strong> HL_RCS cam kết không cung cấp danh tính người báo cáo cho chủ trọ. Mọi thông tin phản ánh được đội ngũ kiểm duyệt độc lập đối chiếu thực tế để đảm bảo môi trường thuê trọ an toàn, minh bạch tại Hòa Lạc.
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  </main>


  <div className="toast-container" id="toastContainer"></div>


  <footer className="footer-wrapper">
    <div className="container footer-grid">

      <div className="footer-col col-brand">
        <Link className="nav-brand white" to="/">
          <div className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-name">HL_RCS</span>
            <span className="brand-sub">Rental Connection System</span>
          </div>
        </Link>
        <p className="footer-desc">
          Nền tảng công nghệ kết nối trực tiếp người thuê và chủ nhà trọ tại khu vực ĐH FPT và Khu Công nghệ cao Hòa Lạc. Minh bạch thông tin, cam kết không môi giới.
        </p>
        <div className="footer-socials">
          <a href="#" className="social-link" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
          <a href="#" className="social-link" aria-label="Zalo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></a>
          <a href="tel:0912345678" className="social-link" aria-label="Hotline"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a>
        </div>
      </div>


      <div className="footer-col">
        <h4 className="footer-col-title">Khu vực phòng trọ</h4>
        <ul className="footer-links">
          <li><Link to="/search?location=tan-xa">Phòng trọ Tân Xã (Gần ĐH FPT)</Link></li>
          <li><Link to="/search?location=thach-hoa">Phòng trọ Thạch Hòa</Link></li>
          <li><Link to="/search?location=binh-yen">Căn hộ mini Bình Yên</Link></li>
          <li><Link to="/search?location=cnc">Phòng gần Khu Công nghệ cao</Link></li>
          <li><Link to="/search?price=under-15">Phòng trọ giá rẻ sinh viên &lt; 2tr</Link></li>
        </ul>
      </div>


      <div className="footer-col">
        <h4 className="footer-col-title">Tiện ích hệ thống</h4>
        <ul className="footer-links">
          <li><Link to="/profile">Hồ sơ cá nhân</Link></li>
          <li><Link to="/favorites">Nhà trọ đã lưu</Link></li>
          <li><Link to="/search">Tìm kiếm phòng trọ</Link></li>
          <li><a href="index.html#host-section">Hợp tác cho thuê nhà trọ</a></li>
          <li><a href="index.html#features">Quy trình xác minh chính chủ</a></li>
        </ul>
      </div>


      <div className="footer-col">
        <h4 className="footer-col-title">Trụ sở hỗ trợ sinh viên</h4>
        <p className="footer-contact-item">
          📍 Văn phòng hỗ trợ: Đường D1, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội
        </p>
        <p className="footer-contact-item">
          📞 Hotline: <strong>0912 345 678</strong> (8:00 - 21:00)
        </p>
        <p className="footer-contact-item">
          ✉️ Email: support@hlrcs.vn
        </p>
        <div className="verified-badge-footer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Bảo vệ quyền lợi người thuê phòng trọ</span>
        </div>
      </div>
    </div>

    <div className="footer-bottom">
      <div className="container footer-bottom-inner">
        <p>© 2026 HL_RCS (Rental Connection System). Bản quyền thuộc về Dự án công nghệ HL_RCS.</p>
        <div className="bottom-links">
          <a href="#">Điều khoản sử dụng</a>
          <span className="dot">•</span>
          <a href="#">Chính sách bảo mật</a>
          <span className="dot">•</span>
          <a href="#">Quy chế hoạt động</a>
        </div>
      </div>
    </div>
  </footer>



</div>;
}
