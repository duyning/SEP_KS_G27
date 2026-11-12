import {useFavorites} from '../../context/FavoritesContext.jsx';
import {useEffect,useState} from 'react';
import {Link,NavLink} from 'react-router-dom';
import {Bell,Heart,LogOut} from 'lucide-react';
import {useAuth} from '../../context/AuthContext.jsx';
import {landingFor,roleLabels} from '../../routing/screens.js';
import {MotionButton} from '../motion/MotionUI.jsx';
export default function DetailPrototypeShell({children,savedCount:providedSavedCount=0,className='prototype-detail',footer,menuExtras}){
 const favorites=useFavorites(),savedCount=favorites?.total??providedSavedCount;
 const {user,logout}=useAuth();const [mobileOpen,setMobileOpen]=useState(false);
 useEffect(()=>{const close=e=>{if(e.key==='Escape')setMobileOpen(false)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[]);
 const account=user?<>{user.role!=='USER'&&<Link to={landingFor(user)} className="btn-primary-sm shell-desktop-dashboard">Bảng điều khiển</Link>}<Link to="/notifications" className="btn-wishlist-top" aria-label="Thông báo" title="Thông báo"><Bell size={18} aria-hidden="true"/></Link><Link to="/favorites" className="btn-wishlist-top" aria-label="Nhà trọ đã lưu"><Heart size={18}/><span className="wishlist-count">{savedCount}</span></Link><div className="user-nav-pill"><Link to="/profile" className="user-nav-profile-link"><div className="user-nav-avatar">{(user.fullName||'U').charAt(0)}</div><div className="user-nav-meta"><span className="user-nav-name">{user.fullName}</span><span className="user-nav-role">{roleLabels[user.role]}</span></div></Link><MotionButton className="user-nav-logout" aria-label="Đăng xuất" onClick={()=>logout().catch(()=>{})}><LogOut size={15}/></MotionButton></div></>:null;
 return <div className={`prototype-home prototype-shared-shell ${className}`} onClick={event=>{if(event.target.closest('#mobileMenuBtn'))setMobileOpen(v=>!v);else if(event.target.closest('#navMenu a'))setMobileOpen(false)}}><header className="navbar-wrapper">
    <div className="top-announcement">
      <div className="container top-announcement-inner">
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


        <ul className={`nav-menu ${mobileOpen ? "show" : ""}`} id="navMenu">
          <li><NavLink className={({isActive})=>`nav-item${isActive?' active':''}`} to="/search">Tìm phòng</NavLink></li>
          <li><Link className="nav-item" to="/map">Bản đồ</Link></li>
          <li><Link className="nav-item" to="/favorites">Đã lưu (<span className="menu-fav-count">{savedCount}</span>)</Link></li>
          <li><NavLink className={({isActive})=>`nav-item${isActive?' active':''}`} to="/bookings">Lịch xem phòng</NavLink></li>
          <li><NavLink className={({isActive})=>`nav-item${isActive?' active':''}`} to="/services">Dịch vụ</NavLink></li>
          <li><NavLink className={({isActive})=>`nav-item${isActive?' active':''}`} to="/community">Cộng đồng</NavLink></li>
          <li><Link className="nav-item" to="/profile">Hồ sơ cá nhân</Link></li>
          {menuExtras}
          {user && user.role !== 'USER' && <li className="shell-mobile-dashboard"><Link className="nav-item" to={landingFor(user)}>Bảng điều khiển</Link></li>}
        </ul>


        <div className="nav-actions">{account || <>
          <Link className="btn-wishlist-top" id="topWishlistBtn" aria-label="Danh sách phòng yêu thích" title="Nhà trọ đã lưu" style={{"textDecoration": "none"}} to="/favorites">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
            <span className="wishlist-count" id="wishlistCount">{savedCount}</span>
          </Link>
          <Link className="btn-ghost" to="/login">Đăng nhập</Link>
          <Link className="btn-primary-sm" to="/register">Đăng ký ngay</Link>
        </>}</div>


        <MotionButton className="mobile-toggle" id="mobileMenuBtn" aria-label="Mở thực đơn" aria-expanded={mobileOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </MotionButton>
      </div>
    </nav>
  </header>{children}{footer ?? <footer className="footer-wrapper">
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
          <a href="#" className="social-link" aria-label="Hotline"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a>
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
          <li><Link to="/login">Đăng nhập tài khoản</Link></li>
          <li><Link to="/register">Đăng ký thành viên mới</Link></li>
          <li><a href="#host-section">Hợp tác cho thuê nhà trọ</a></li>
          <li><a href="#features">Quy trình xác minh chính chủ</a></li>
          <li><a href="tel:0912345678">Báo cáo tin đăng sai sự thật</a></li>
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
  </footer>}</div>;
}
