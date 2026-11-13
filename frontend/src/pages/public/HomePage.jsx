import UIField from '../../components/common/Field.jsx';
import UIButton from '../../components/common/Button.jsx';
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
import { MOCK_ROOMS } from '../../fixtures/mockRooms.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';

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

  const featuredRooms = MOCK_ROOMS.filter((r) => r.featured).slice(0, 6);

  return (
    <div className="home-page-root">
      {/* 1. HERO SECTION */}
      <section className="hero-section" style={{
        position: 'relative',
        padding: '80px var(--space-4) 100px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <div className="container hero-container" style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="hero-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '6px var(--space-4)',
            borderRadius: '9999px',
            backgroundColor: 'rgba(13, 148, 136, 0.2)',
            border: '1px solid #0f766e',
            color: '#2dd4bf',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: 'var(--space-6)',
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
            color: 'var(--ui-muted)',
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
            padding: 'var(--space-4)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            textAlign: 'left',
          }}>
            <form id="searchForm" onSubmit={handleSearchSubmit} style={{
              display: 'grid',
              '--grid-columns': 'repeat(auto-fit, minmax(200px, 1fr)) auto',
              gap: 'var(--space-3)',
              alignItems: 'center',
            }}>
              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <MapPin size={20} style={{ color: '#0f766e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <UIField htmlFor="filterLocation" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ui-muted)', textTransform: 'uppercase' }}>
                    Khu vực
                  </UIField>
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
                <Zap size={20} style={{ color: '#0f766e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <UIField htmlFor="filterPrice" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ui-muted)', textTransform: 'uppercase' }}>
                    Khoảng giá
                  </UIField>
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
                <Home size={20} style={{ color: '#0f766e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <UIField htmlFor="filterType" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--ui-muted)', textTransform: 'uppercase' }}>
                    Loại phòng
                  </UIField>
                  <select
                    id="filterType"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#0f172a', background: 'transparent' }}
                  >
                    <option value="all">Tất cả loại phòng</option>
                    <option value="khep-kin">Khép kín có ban công</option>
                    <option value="gac-lung">Có gác lửng / xép</option>
                    <option value="chung-cu-mini">Chung cư mini cao cấp</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <UIButton
                type="submit"
                style={{
                  height: '100%',
                  minHeight: '48px',
                  padding: '0 var(--space-6)',
                  borderRadius: '10px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Search size={18} />
                <span>Tìm phòng</span>
              </UIButton>
            </form>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: 'var(--space-6) var(--space-4)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', '--grid-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f766e' }}>100%</div>
            <div style={{ fontSize: '13px', color: 'var(--ui-muted)', fontWeight: 600 }}>Xác minh chính chủ</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>1.200+</div>
            <div style={{ fontSize: '13px', color: 'var(--ui-muted)', fontWeight: 600 }}>Phòng trọ quanh ĐH FPT</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb' }}>0 đồng</div>
            <div style={{ fontSize: '13px', color: 'var(--ui-muted)', fontWeight: 600 }}>Phí môi giới người thuê</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>24/7</div>
            <div style={{ fontSize: '13px', color: 'var(--ui-muted)', fontWeight: 600 }}>Hỗ trợ sinh viên Hòa Lạc</div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED ROOMS SECTION */}
      <section style={{ padding: '60px var(--space-4)', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PHÒNG TRỌ XÁC THỰC
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 'var(--space-1) 0 0' }}>
              Phòng nổi bật còn trống tại Hòa Lạc
            </h2>
          </div>
          <Link
            to="/search"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f766e',
              textDecoration: 'none',
            }}
          >
            <span>Xem tất cả phòng trống</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <DemoNoticeBanner message="Dữ liệu phòng hiển thị từ prototype fixture do backend chưa có API danh sách phòng công khai." />

        <div style={{
          display: 'grid',
          '--grid-columns': 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 'var(--space-6)',
        }}>
          {featuredRooms.map((room) => (
            <article
              key={room.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div style={{ position: 'relative', height: '210px', overflow: 'hidden' }}>
                <img
                  src={room.image}
                  alt={room.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  padding: 'var(--space-1) 10px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}>
                  <ShieldCheck size={14} />
                  <span>Chính chủ xác thực</span>
                </span>
                <span style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  padding: 'var(--space-1) 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  {room.availability}
                </span>
              </div>

              <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--ui-muted)', marginBottom: '6px' }}>
                    <MapPin size={14} />
                    <span>{room.campusDistance}</span>
                    <span>•</span>
                    <span>{room.area}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 var(--space-2)', lineHeight: 1.4 }}>
                    <Link to={`/properties/detail?id=${room.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {room.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--ui-muted)', margin: '0 0 var(--space-3)', lineHeight: 1.5 }}>
                    {room.location}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 'var(--space-3)',
                  borderTop: '1px solid #f1f5f9',
                }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--ui-muted)', display: 'block' }}>Giá thuê niêm yết</span>
                    <strong style={{ fontSize: '18px', fontWeight: 800, color: '#0f766e' }}>
                      {room.priceDisplay}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>/tháng</span>
                  </div>
                  <Link
                    to={`/properties/detail?id=${room.id}`}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: '8px',
                      backgroundColor: '#f0fdfa',
                      color: '#0f766e',
                      border: '1px solid #99f6e4',
                      fontWeight: 700,
                      fontSize: '13px',
                      textDecoration: 'none',
                    }}
                  >
                    Xem phòng
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. SERVICES SHORTCUT */}
      <section style={{ backgroundColor: '#f8fafc', padding: '60px var(--space-4)', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TIỆN ÍCH QUANH TRỌ
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '6px 0 10px' }}>
              Dịch vụ hỗ trợ sinh viên tại Hòa Lạc
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ui-muted)' }}>
              Đầy đủ các dịch vụ vận chuyển, giặt là, sửa chữa và vệ sinh phòng trọ với giá ưu đãi sinh viên.
            </p>
          </div>

          <div style={{ display: 'grid', '--grid-columns': 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
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
                  padding: 'var(--space-6)',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <srv.icon size={22} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{srv.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--ui-muted)', margin: 0, lineHeight: 1.5 }}>{srv.desc}</p>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 'auto' }}>
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
