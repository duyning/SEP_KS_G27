import { Link } from 'react-router-dom';
import { BrandLogo, BRAND } from '../brand/index.js';

export default function DetailPrototypeShell({ children, className = 'prototype-detail', footer }) {
  return <div className={`prototype-home prototype-shared-shell ${className}`}>{children}{footer ?? <footer className="footer-wrapper">
    <div className="container footer-grid">

      <div className="footer-col col-brand">
        <BrandLogo to="/" size="md" tone="dark" iconVariant="badge" subtitle={BRAND.shortTagline} className="nav-brand white" />
        <p className="footer-desc">
          Nền tảng công nghệ kết nối trực tiếp người thuê và chủ nhà trọ tại khu vực ĐH FPT và Khu Công nghệ cao Hòa Lạc. Minh bạch thông tin, cam kết không môi giới.
        </p>
        <div className="footer-socials">
          <a href="https://zalo.me/0912345678" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Zalo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></a>
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
          Văn phòng hỗ trợ: Đường D1, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội
        </p>
        <p className="footer-contact-item">
          Hotline: <strong>{BRAND.hotline}</strong> (8:00 - 21:00)
        </p>
        <p className="footer-contact-item">
          Email: {BRAND.supportEmail}
        </p>
        <div className="verified-badge-footer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Bảo vệ quyền lợi người thuê phòng trọ</span>
        </div>
      </div>
    </div>

    <div className="footer-bottom">
      <div className="container footer-bottom-inner">
        <p>© {BRAND.copyrightYear} {BRAND.name}. Bản quyền thuộc về nền tảng {BRAND.name}.</p>
      </div>
    </div>
  </footer>}</div>;
}
