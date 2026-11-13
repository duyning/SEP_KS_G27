import UIField from '../../components/common/Field.jsx';
import UIButton from '../../components/common/Button.jsx';
import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Filter,
  Heart,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { MOCK_ROOMS } from '../../fixtures/mockRooms.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Pagination from '../../components/common/Pagination.jsx';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  const [selectedArea, setSelectedArea] = useState(params.get('location') || 'all');
  const [selectedPrice, setSelectedPrice] = useState(params.get('price') || 'all');
  const [selectedSort, setSelectedSort] = useState(params.get('sort') || 'recommended');
  const [page, setPage] = useState(1);

  // Filter logic
  const filteredRooms = useMemo(() => {
    return MOCK_ROOMS.filter((room) => {
      // Area
      if (selectedArea !== 'all') {
        if (selectedArea === 'tan-xa' && !room.category?.includes('tan-xa') && !room.locationShort?.includes('Tân Xã')) return false;
        if (selectedArea === 'thach-hoa' && !room.category?.includes('thach-hoa') && !room.locationShort?.includes('Thạch Hòa')) return false;
        if (selectedArea === 'binh-yen' && !room.category?.includes('binh-yen') && !room.locationShort?.includes('Bình Yên')) return false;
        if (selectedArea === 'cnc' && !room.category?.includes('cnc') && !room.locationShort?.includes('CNC')) return false;
      }
      // Price
      if (selectedPrice !== 'all') {
        if (selectedPrice === 'under-15' && room.price >= 1500000) return false;
        if (selectedPrice === '15-25' && (room.price < 1500000 || room.price > 2500000)) return false;
        if (selectedPrice === '25-35' && (room.price < 2500000 || room.price > 3500000)) return false;
        if (selectedPrice === 'above-35' && room.price <= 3500000) return false;
      }
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${room.title} ${room.location} ${room.typeName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (selectedSort === 'price-asc') return a.price - b.price;
      if (selectedSort === 'price-desc') return b.price - a.price;
      if (selectedSort === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0; // recommended
    });
  }, [selectedArea, selectedPrice, searchQuery, selectedSort]);

  const pageSize = 6;
  const totalPages = Math.ceil(filteredRooms.length / pageSize) || 1;
  const paginatedRooms = filteredRooms.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedArea('all');
    setSelectedPrice('all');
    setSelectedSort('recommended');
    setPage(1);
    setParams({});
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          Khám phá nhà trọ & Căn hộ tại Hòa Lạc
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ui-muted)', margin: 0 }}>
          Tìm kiếm trong tổng số <strong>{MOCK_ROOMS.length}</strong> phòng trọ đã xác thực quanh ĐH FPT và Khu CNC Hòa Lạc
        </p>
      </div>

      <DemoNoticeBanner message="Dữ liệu tìm kiếm và lọc hiển thị từ prototype fixture do backend chưa cung cấp API GET /api/properties/search." />

      {/* Main Layout: Filter Sidebar + Results */}
      <div style={{ display: 'grid', '--grid-columns': 'minmax(240px, 280px) 1fr', gap: 'var(--space-6)' }}>
        {/* Left Filter Sidebar */}
        <aside style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          height: 'fit-content',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              <Filter size={18} style={{ color: '#0f766e' }} />
              <span>Bộ lọc tìm kiếm</span>
            </div>
            <UIButton
              type="button"
              onClick={resetFilters}
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ui-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <RotateCcw size={14} />
              <span>Đặt lại</span>
            </UIButton>
          </div>

          {/* Area */}
          <div style={{ marginBottom: '20px' }}>
            <UIField htmlFor="searchArea" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: 'var(--space-2)' }}>
              Khu vực
            </UIField>
            <select
              id="searchArea"
              value={selectedArea}
              onChange={(e) => { setSelectedArea(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '9px var(--space-3)',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            >
              <option value="all">Tất cả khu vực Hòa Lạc</option>
              <option value="tan-xa">Tân Xã (Gần ĐH FPT)</option>
              <option value="thach-hoa">Thạch Hòa (Gần chợ & bus)</option>
              <option value="binh-yen">Bình Yên (Khu yên tĩnh)</option>
              <option value="cnc">Gần Khu Công nghệ cao</option>
            </select>
          </div>

          {/* Price Range */}
          <div style={{ marginBottom: '20px' }}>
            <UIField htmlFor="searchPrice" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: 'var(--space-2)' }}>
              Khoảng giá
            </UIField>
            <select
              id="searchPrice"
              value={selectedPrice}
              onChange={(e) => { setSelectedPrice(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '9px var(--space-3)',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            >
              <option value="all">Tất cả mức giá</option>
              <option value="under-15">Dưới 1.5 triệu / tháng</option>
              <option value="15-25">1.5 - 2.5 triệu / tháng</option>
              <option value="25-35">2.5 - 3.5 triệu / tháng</option>
              <option value="above-35">Trên 3.5 triệu / tháng</option>
            </select>
          </div>

          {/* Map Link CTA */}
          <div style={{ marginTop: 'var(--space-6)', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
            <Link
              to="/map"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #99f6e4',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              <MapPin size={16} />
              <span>Xem trên bản đồ</span>
            </Link>
          </div>
        </aside>

        {/* Right Results Column */}
        <section>
          {/* Search bar & Sort header */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '14px 18px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, minWidth: '220px' }}>
              <Search size={18} style={{ color: 'var(--ui-muted)' }} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Tìm theo tên nhà trọ, đường phố, địa chỉ..."
                aria-label="Tìm kiếm phòng trọ"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#0f172a',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <UIField htmlFor="searchSort" style={{ fontSize: '13px', color: 'var(--ui-muted)', fontWeight: 600 }}>
                Sắp xếp:
              </UIField>
              <select
                id="searchSort"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                style={{
                  padding: '6px var(--space-3)',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="recommended">Được đề xuất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {paginatedRooms.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: 'var(--space-12) var(--space-6)',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}>
              <Home size={40} style={{ color: 'var(--ui-muted)', margin: '0 auto var(--space-3)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Không tìm thấy phòng trọ phù hợp
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--ui-muted)', marginBottom: '20px' }}>
                Hãy thử nới lỏng bộ lọc khu vực hoặc mức giá để xem thêm kết quả khác.
              </p>
              <UIButton
                type="button"
                onClick={resetFilters}
                style={{
                  padding: 'var(--space-2) 18px',
                  borderRadius: '8px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đặt lại bộ lọc
              </UIButton>
            </div>
          ) : (
            <div style={{ display: 'grid', '--grid-columns': 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {paginatedRooms.map((room) => (
                <article
                  key={room.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div style={{ position: 'relative', height: '190px' }}>
                    <img src={room.image} alt={room.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      backgroundColor: '#0f766e',
                      color: '#ffffff',
                      padding: '3px var(--space-2)',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                    }}>
                      <ShieldCheck size={12} />
                      <span>Xác thực</span>
                    </span>
                    <span style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      color: '#ffffff',
                      padding: '3px var(--space-2)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      {room.availability}
                    </span>
                  </div>

                  <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--ui-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-1)' }}>
                        <MapPin size={13} />
                        <span>{room.campusDistance}</span>
                        <span>•</span>
                        <span>{room.area}</span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.4 }}>
                        <Link to={`/properties/detail?id=${room.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {room.title}
                        </Link>
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--ui-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                        {room.location}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      <div>
                        <strong style={{ fontSize: '17px', fontWeight: 800, color: '#0f766e' }}>
                          {room.priceDisplay}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--ui-muted)' }}>/tháng</span>
                      </div>
                      <Link
                        to={`/properties/detail?id=${room.id}`}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#f0fdfa',
                          color: '#0f766e',
                          border: '1px solid #99f6e4',
                          fontWeight: 700,
                          fontSize: '12px',
                          textDecoration: 'none',
                        }}
                      >
                        Chi tiết
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div style={{ marginTop: '20px' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredRooms.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
