import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { MOCK_ROOMS } from '../../fixtures/mockRooms.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';

export default function MapSearchPage() {
  const [selectedRoom, setSelectedRoom] = useState(MOCK_ROOMS[0]);
  const [areaFilter, setAreaFilter] = useState('all');

  const filtered = areaFilter === 'all'
    ? MOCK_ROOMS
    : MOCK_ROOMS.filter((r) => r.category?.includes(areaFilter) || r.locationShort?.toLowerCase().includes(areaFilter));

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Link to="/search" style={{ color: '#0d9488', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} />
              <span>Dạng danh sách</span>
            </Link>
            <span>/</span>
            <span>Bản đồ Hòa Lạc</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Bản đồ tìm kiếm phòng trọ Hòa Lạc
          </h1>
        </div>

        {/* Area pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            ['all', 'Tất cả'],
            ['tan-xa', 'Tân Xã'],
            ['thach-hoa', 'Thạch Hòa'],
            ['binh-yen', 'Bình Yên'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setAreaFilter(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: areaFilter === key ? '1px solid #0d9488' : '1px solid #cbd5e1',
                backgroundColor: areaFilter === key ? '#0d9488' : '#ffffff',
                color: areaFilter === key ? '#ffffff' : '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <DemoNoticeBanner message="Dữ liệu tọa độ bản đồ hiển thị từ prototype fixture do backend chưa cung cấp API tọa độ địa lý." />

      {/* Split Map View Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 420px) 1fr',
        gap: '20px',
        height: 'calc(100vh - 240px)',
        minHeight: '600px',
      }}>
        {/* Left List of Room Cards */}
        <aside style={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingRight: '8px',
        }}>
          {filtered.map((room) => {
            const isSelected = selectedRoom?.id === room.id;
            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                role="button"
                tabIndex={0}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '12px',
                  boxShadow: isSelected ? '0 4px 6px -1px rgba(13, 148, 136, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <img
                  src={room.image}
                  alt={room.title}
                  style={{ width: '100px', height: '90px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldCheck size={12} />
                      <span>{room.campusDistance}</span>
                    </div>
                    <div style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {room.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {room.locationShort}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0d9488' }}>
                      {room.priceDisplay}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{room.area}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </aside>

        {/* Right Map Canvas Simulation */}
        <section style={{
          backgroundColor: '#e2e8f0',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}>
          {/* Map Controls Floating Badge */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#ffffff',
            borderRadius: '10px',
            padding: '8px 14px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#334155',
            zIndex: 10,
          }}>
            <MapPin size={16} style={{ color: '#0d9488' }} />
            <span>Khu vực ĐH FPT & Tân Xã, Hòa Lạc</span>
          </div>

          {/* Interactive Simulated Pins on Map */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {filtered.slice(0, 8).map((room, idx) => {
              const offsets = [
                { top: '35%', left: '42%' },
                { top: '48%', left: '38%' },
                { top: '25%', left: '55%' },
                { top: '60%', left: '62%' },
                { top: '40%', left: '68%' },
                { top: '70%', left: '45%' },
                { top: '30%', left: '30%' },
                { top: '55%', left: '25%' },
              ];
              const pos = offsets[idx % offsets.length];
              const active = selectedRoom?.id === room.id;

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoom(room)}
                  style={{
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: active ? '#0f172a' : '#0d9488',
                    color: '#ffffff',
                    padding: '5px 10px',
                    borderRadius: '20px',
                    border: '2px solid #ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    zIndex: active ? 20 : 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MapPin size={12} />
                  <span>{room.priceChip || `${Math.round(room.price / 1000000 * 10) / 10}tr`}</span>
                </button>
              );
            })}
          </div>

          {/* Floating Selected Room Card */}
          {selectedRoom && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              maxWidth: '360px',
              width: 'calc(100% - 40px)',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
              zIndex: 30,
            }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <img
                  src={selectedRoom.image}
                  alt={selectedRoom.title}
                  style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: 700 }}>
                    {selectedRoom.campusDistance}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '2px 0 4px' }}>
                    {selectedRoom.title}
                  </h4>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0d9488' }}>
                    {selectedRoom.priceDisplay}/tháng
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  to={`/properties/detail?id=${selectedRoom.id}`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                  }}
                >
                  <span>Xem chi tiết phòng</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
