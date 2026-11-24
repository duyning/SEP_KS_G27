import {
  Camera,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { BRAND } from '../config/brand.js';

export default function HostOnboardingSidebar() {
  return (
    <aside className="hob-sidebar" aria-label="Hướng dẫn đăng ký chủ trọ">
      <section className="hob-guide-card hob-guide-primary">
        <div className="hob-guide-top">
          <span className="hob-guide-art-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <span className="hob-guide-art-pill">
            <Sparkles size={13} aria-hidden="true" />
            <span>Xác minh chính chủ</span>
          </span>
        </div>

        <h3>Trở thành chủ trọ trên {BRAND.name}</h3>
        <p className="hob-guide-lead">
          Quản lý vận hành nhà trọ chuyên nghiệp trên một nền tảng thống nhất.
        </p>

        <ul className="hob-guide-list">
          <li>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Quản lý nhà trọ, loại phòng và trạng thái phòng trống.</span>
          </li>
          <li>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Theo dõi hợp đồng thuê, điện nước và phiếu thu minh bạch.</span>
          </li>
          <li>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Tiếp nhận lịch xem phòng trực tiếp từ người thuê.</span>
          </li>
          <li>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Hồ sơ được nhân viên kiểm tra trước khi cấp quyền.</span>
          </li>
        </ul>
      </section>

      <section className="hob-guide-card">
        <div className="hob-guide-header">
          <span className="hob-guide-badge" aria-hidden="true">
            <Camera size={16} />
          </span>
          <div>
            <h3>Lưu ý khi xác minh CCCD</h3>
            <p className="hob-guide-sub">Giúp hồ sơ được duyệt nhanh hơn</p>
          </div>
        </div>

        <ul className="hob-guide-checklist">
          <li>
            <span className="hob-check-dot" aria-hidden="true" />
            <span>Sử dụng CCCD còn hiệu lực của chính chủ tài khoản.</span>
          </li>
          <li>
            <span className="hob-check-dot" aria-hidden="true" />
            <span>Chụp đủ bốn góc cả hai mặt, chữ và ảnh rõ nét.</span>
          </li>
          <li>
            <span className="hob-check-dot" aria-hidden="true" />
            <span>Tránh ánh sáng lóa, không cắt xén hay chỉnh sửa ảnh.</span>
          </li>
          <li>
            <span className="hob-check-dot" aria-hidden="true" />
            <span>Chỉ tải giấy tờ qua biểu mẫu chính thức của {BRAND.name}.</span>
          </li>
        </ul>

        <div className="hob-guide-security">
          <LockKeyhole size={15} aria-hidden="true" />
          <span>
            Ảnh CCCD không lưu vào bộ nhớ cục bộ và chỉ nhân viên thẩm định có thẩm quyền mới được xem.
          </span>
        </div>

        <div className="hob-guide-eta">
          <Clock3 size={14} aria-hidden="true" />
          <span>Hồ sơ hoàn chỉnh thường được thẩm định trong vòng 24 giờ làm việc.</span>
        </div>
      </section>
    </aside>
  );
}
