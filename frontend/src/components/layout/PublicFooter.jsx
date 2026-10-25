import { Link } from 'react-router-dom';
import { Home, ShieldCheck } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="footer-wrapper">
      <div className="container footer-grid">
        {/* Col 1: Brand Info */}
        <div className="footer-col col-brand">
          <Link to="/" className="nav-brand white">
            <div className="brand-logo-icon">
              <Home size={20} />
            </div>
            <div className="brand-title-wrap">
              <span className="brand-name">HL_RCS</span>
              <span className="brand-sub">Rental Connection System</span>
            </div>
          </Link>
          <p className="footer-desc">
            Nền tảng công nghệ kết nối trực tiếp người thuê và chủ nhà trọ tại khu vực ĐH FPT và Khu Công nghệ cao Hòa Lạc. Minh bạch thông tin, cam kết không môi giới.
          </p>
        </div>

        {/* Col 2: Khu vực phòng trọ */}
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

        {/* Col 3: Điều hướng nhanh */}
        <div className="footer-col">
          <h4 className="footer-col-title">Tiện ích hệ thống</h4>
          <ul className="footer-links">
            <li><Link to="/login">Đăng nhập tài khoản</Link></li>
            <li><Link to="/register">Đăng ký thành viên mới</Link></li>
            <li><Link to="/services">Dịch vụ quanh trọ</Link></li>
            <li><Link to="/community">Cộng đồng cư dân Hòa Lạc</Link></li>
            <li><Link to="/search">Khám phá phòng trống</Link></li>
          </ul>
        </div>

        {/* Col 4: Liên hệ & Hỗ trợ */}
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
            <ShieldCheck size={16} />
            <span>Bảo vệ quyền lợi người thuê phòng trọ</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© 2026 HL_RCS (Rental Connection System). Bản quyền thuộc về Dự án công nghệ HL_RCS.</p>
          <div className="bottom-links">
            <Link to="/community">Quy chế hoạt động</Link>
            <span className="dot">•</span>
            <Link to="/search">Bảo vệ thông tin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
