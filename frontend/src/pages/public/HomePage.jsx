import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import AccommodationResults from '../../components/AccommodationResults.jsx';
import useAccommodations from '../../hooks/useAccommodations.js';


export default function HomePage() {
  const navigate = useNavigate();
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterPrice, setFilterPrice] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (filterLocation !== 'all') query.set('location', filterLocation);
    if (filterPrice !== 'all') query.set('price', filterPrice);
    if (filterType !== 'all') query.set('type', filterType);
    navigate(`/search?${query.toString()}`);
  };

  const accommodations = useAccommodations('page=0&size=6&sort=newest');

  return (
    <div className="home-page-root">
      {/* 1. HERO SECTION */}
      <section className="hero-section" style={{
        position: 'relative',
        padding: '80px 16px 100px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <div className="container hero-container" style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="hero-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(13, 148, 136, 0.2)',
            border: '1px solid #0d9488',
            color: '#2dd4bf',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '24px',
          }}>
            <span className="live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2dd4bf' }} />
            <span>Nền tảng kết nối phòng trọ trực tiếp số 1 tại Hòa Lạc</span>
          </div>

          <h1 className="hero-headline" style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: '18px',
          }}>
            Tìm phòng trọ an tâm,<br />
            <span style={{ color: '#2dd4bf' }}>minh bạch & chính chủ</span> tại Hòa Lạc
          </h1>

          <p className="hero-description" style={{
            fontSize: 'clamp(14px, 2vw, 17px)',
            color: '#94a3b8',
            maxWidth: '680px',
            margin: '0 auto 36px',
            lineHeight: 1.6,
          }}>
            Hệ thống dữ liệu phòng trọ xác thực 100%, hình ảnh thật, định vị chính xác và bảng giá điện nước niêm yết công khai quanh ĐH FPT & Khu Công nghệ cao.
          </p>

          {/* SEARCH CARD */}
          <div className="search-box-card" style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            textAlign: 'left',
          }}>
            <form id="searchForm" onSubmit={handleSearchSubmit} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto',
              gap: '12px',
              alignItems: 'center',
            }}>
              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <MapPin size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label htmlFor="filterLocation" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Khu vực
                  </label>
                  <select
                    id="filterLocation"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#0f172a', background: 'transparent' }}
                  >
                    <option value="all">Tất cả khu vực Hòa Lạc</option>
                    <option value="tan-xa">Tân Xã (Gần ĐH FPT)</option>
                    <option value="thach-hoa">Thạch Hòa (Gần chợ & bus)</option>
                    <option value="binh-yen">Bình Yên (Khu yên tĩnh)</option>
                    <option value="cnc">Gần Khu Công nghệ cao</option>
                  </select>
                </div>
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <Zap size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label htmlFor="filterPrice" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Khoảng giá
                  </label>
                  <select
                    id="filterPrice"
                    value={filterPrice}
                    onChange={(e) => setFilterPrice(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#0f172a', background: 'transparent' }}
                  >
                    <option value="all">Tất cả mức giá</option>
                    <option value="under-15">Dưới 1.5 triệu / tháng</option>
                    <option value="15-25">1.5 - 2.5 triệu / tháng</option>
                    <option value="25-35">2.5 - 3.5 triệu / tháng</option>
                    <option value="above-35">Trên 3.5 triệu / tháng</option>
                  </select>
                </div>
              </div>

              {/* Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <Home size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label htmlFor="filterType" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Loại phòng
                  </label>
                  <select
                    id="filterType"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#0f172a', background: 'transparent' }}
                  >
                    <option value="all">Tất cả loại phòng</option>
                    <option value="khep-kin">Khép kín</option>
                    <option value="gac-lung">Có gác lửng / xép</option>
                    <option value="chung-cu-mini">Chung cư mini</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  height: '100%',
                  minHeight: '48px',
                  padding: '0 24px',
                  borderRadius: '10px',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Search size={18} />
                <span>Tìm phòng</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '24px 16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0d9488' }}>100%</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Xác minh chính chủ</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{accommodations.data?.totalElements ?? '—'}</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Loại phòng đang công khai</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb' }}>0 đồng</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Phí môi giới người thuê</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>24/7</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Hỗ trợ sinh viên Hòa Lạc</div>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 16px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="acc-home-heading"><div><h2>Nhà trọ &amp; loại phòng mới nhất</h2><p>Các nhà trọ đã được xác minh và đang công khai.</p></div><Link className="acc-link" to="/search">Xem tất cả <ArrowRight size={16} /></Link></div>
        <AccommodationResults {...accommodations} />
      </section>
      {/* 4. SERVICES SHORTCUT */}
      <section style={{ backgroundColor: '#f8fafc', padding: '60px 16px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TIỆN ÍCH QUANH TRỌ
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '6px 0 10px' }}>
              Dịch vụ hỗ trợ sinh viên tại Hòa Lạc
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Đầy đủ các dịch vụ vận chuyển, giặt là, sửa chữa và vệ sinh phòng trọ với giá ưu đãi sinh viên.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {[
              { title: 'Chuyển trọ sinh viên', desc: 'Xe tải, ba gác hỗ trợ chuyển trọ trọn gói giá rẻ', to: '/services?category=moving', icon: Wrench },
              { title: 'Giặt là công nghiệp', desc: 'Giặt sấy lấy ngay, giao nhận tận phòng trọ trong 3km', to: '/services?category=laundry', icon: Zap },
              { title: 'Dọn dẹp & Vệ sinh', desc: 'Dọn phòng chuyển đến, tổng vệ sinh theo giờ', to: '/services?category=cleaning', icon: CheckCircle2 },
              { title: 'Cộng đồng nhượng phòng', desc: 'Tìm bạn ở ghép, nhượng hợp đồng phòng trọ uy tín', to: '/community', icon: Users },
            ].map((srv) => (
              <Link
                key={srv.title}
                to={srv.to}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <srv.icon size={22} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{srv.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{srv.desc}</p>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0d9488', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                  <span>Tìm hiểu ngay</span>
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
