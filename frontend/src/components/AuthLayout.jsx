import { MapPin, ShieldCheck, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandIcon, BRAND } from './brand/index.js';

export function Brand({ compact = false }) {
  return (
    <Link to="/login" className={`brand ${compact ? 'compact' : ''}`} aria-label={BRAND.name}>
      <span className="brand-icon">
        <BrandIcon size={compact ? 24 : 28} variant={compact ? 'teal' : 'white'} />
      </span>
      <span>
        <strong>{BRAND.name}</strong>
        <small>{BRAND.shortTagline}</small>
      </span>
    </Link>
  );
}

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <aside className="showcase">
        <header className="showcase-header">
          <Brand />
          <span className="campus"><MapPin size={13} /> Hòa Lạc Campus</span>
        </header>
        <section className="showcase-copy">
          <span className="eyebrow"><ShieldCheck size={15} /> {BRAND.campusTagline}</span>
          <h1>Tìm trọ an tâm,<br />quản lý dễ dàng tại Hòa Lạc</h1>
          <p>Kết nối sinh viên và người thuê với nhà trọ chính chủ quanh ĐH FPT và Khu Công nghệ cao Hòa Lạc.</p>
        </section>
        <div className="showcase-bottom">
          <div className="location-note">
            <span><MapPin size={16} /> Tân Xã · Thạch Hòa · Bình Yên</span>
            <h2>Một nơi ở phù hợp.<br />Một khởi đầu mới.</h2>
            <p><Check size={15} /> Thông tin rõ ràng <span>·</span> Kết nối trực tiếp</p>
          </div>
          <footer>© {new Date().getFullYear()} {BRAND.name} · {BRAND.tagline}</footer>
        </div>
      </aside>
      <section className="form-side">
        <div className="mobile-brand"><Brand compact /></div>
        {children}
      </section>
    </main>
  );
}
