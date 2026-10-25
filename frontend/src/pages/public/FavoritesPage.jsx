import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MapPin,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { MOCK_ROOMS } from '../../fixtures/mockRooms.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function FavoritesPage() {
  const notify = useToast();
  const [savedRooms, setSavedRooms] = useState(MOCK_ROOMS.slice(0, 4));

  const handleRemove = (id) => {
    setSavedRooms(savedRooms.filter((r) => r.id !== id));
    notify?.('Đã xóa phòng trọ khỏi danh sách đã lưu', 'success');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Danh sách phòng trọ đã lưu ({savedRooms.length})
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Lưu trữ các phòng trọ bạn quan tâm để dễ dàng so sánh giá và đặt lịch hẹn xem phòng.
          </p>
        </div>

        <Link
          to="/search"
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: '#0d9488',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          Khám phá thêm phòng
        </Link>
      </div>

      <DemoNoticeBanner message="Dữ liệu danh sách đã lưu hiển thị từ prototype fixture do backend chưa cung cấp API Wishlist." />

      {savedRooms.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '60px 20px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}>
          <Heart size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Bạn chưa lưu phòng trọ nào
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
            Hãy bấm vào biểu tượng trái tim khi xem phòng để lưu lại và đối chiếu sau nhé!
          </p>
          <Link
            to="/search"
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Tìm phòng trọ ngay
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {savedRooms.map((room) => (
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
              }}
            >
              <div style={{ position: 'relative', height: '190px' }}>
                <img src={room.image} alt={room.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => handleRemove(room.id)}
                  title="Xóa khỏi danh sách lưu"
                  aria-label="Xóa khỏi danh sách lưu"
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  Chính chủ
                </span>
              </div>

              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <MapPin size={13} />
                    <span>{room.campusDistance}</span>
                    <span>•</span>
                    <span>{room.area}</span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    <Link to={`/properties/detail?id=${room.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {room.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
                    {room.location}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  <strong style={{ fontSize: '17px', fontWeight: 800, color: '#0d9488' }}>
                    {room.priceDisplay}/tháng
                  </strong>
                  <Link
                    to={`/properties/detail?id=${room.id}`}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#f0fdfa',
                      color: '#0d9488',
                      border: '1px solid #99f6e4',
                      fontWeight: 700,
                      fontSize: '12px',
                      textDecoration: 'none',
                    }}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
