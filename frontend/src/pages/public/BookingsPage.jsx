import { AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CalendarCheck,
  Clock,
  Eye,
  MapPin,
  Phone,
  X,
  XCircle,
} from 'lucide-react';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const notify = useToast();
  const activeStatus = params.get('status') || 'ALL';

  const [bookings, setBookings] = useState([
    {
      id: 'BK-8921',
      roomTitle: 'Nhà trọ Minh Quân - Studio khép kín ban công',
      roomNumber: 'P.102',
      address: 'Thôn 2, Tân Xã, Thạch Thất (Cách ĐH FPT 800m)',
      price: '2.200.000 đ',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      date: '2026-10-25',
      time: '15:30',
      hostName: 'Trần Gia Huy (Chủ trọ)',
      hostPhone: '0987 654 321',
      status: 'PENDING',
      statusLabel: 'Chờ xác nhận',
      createdAt: '2026-10-21 09:15',
    },
    {
      id: 'BK-8919',
      roomTitle: 'Căn hộ mini Sunrise - Full nội thất cao cấp',
      roomNumber: 'P.301',
      address: 'Đường D1, Khu CNC Hòa Lạc, Thạch Thất',
      price: '2.800.000 đ',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      date: '2026-10-20',
      time: '10:00',
      hostName: 'Lê Văn C (Chủ trọ)',
      hostPhone: '0933 445 566',
      status: 'CONFIRMED',
      statusLabel: 'Đã xác nhận',
      createdAt: '2026-10-18 14:00',
    },
    {
      id: 'BK-8910',
      roomTitle: 'Nhà trọ Sen Chiểu - Phòng gác xép Bình Yên',
      roomNumber: 'P.101',
      address: 'Thôn Sen Chiểu, Bình Yên, Thạch Thất',
      price: '2.400.000 đ',
      image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
      date: '2026-10-12',
      time: '16:00',
      hostName: 'Hoàng Văn B (Chủ trọ)',
      hostPhone: '0911 223 344',
      status: 'COMPLETED',
      statusLabel: 'Đã hoàn thành',
      createdAt: '2026-10-10 11:20',
    },
  ]);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);

  const filteredBookings = activeStatus === 'ALL'
    ? bookings
    : bookings.filter((b) => b.status === activeStatus);

  const confirmCancel = () => {
    if (!cancellingBooking) return;
    setBookings(bookings.map((b) => (b.id === cancellingBooking.id ? { ...b, status: 'CANCELLED', statusLabel: 'Đã hủy' } : b)));
    setCancellingBooking(null);
    notify?.('Đã hủy lịch hẹn xem phòng thành công.', 'success');
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Lịch xem phòng của bạn ({bookings.length})
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Theo dõi tiến độ, thông tin cuộc hẹn và số liên hệ chủ trọ khi đến xem phòng thực tế.
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
          Đặt thêm lịch hẹn mới
        </Link>
      </div>

      <DemoNoticeBanner message="Dữ liệu lịch hẹn hiển thị từ prototype fixture do backend chưa cung cấp API Viewing Request." />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          ['ALL', 'Tất cả'],
          ['PENDING', 'Chờ xác nhận'],
          ['CONFIRMED', 'Đã xác nhận'],
          ['COMPLETED', 'Đã hoàn thành'],
          ['CANCELLED', 'Đã hủy'],
        ].map(([key, label]) => {
          const active = activeStatus === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setParams(key === 'ALL' ? {} : { status: key })}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                border: active ? '1px solid #0d9488' : '1px solid #e2e8f0',
                backgroundColor: active ? '#0d9488' : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                fontWeight: active ? 700 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredBookings.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '48px 20px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}>
            <CalendarCheck size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              Không có lịch hẹn nào trong mục này
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Các lịch hẹn xem phòng với chủ trọ sẽ được hiển thị và cập nhật trạng thái tại đây.
            </p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <article
              key={b.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                flexWrap: 'wrap',
                boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
              }}
            >
              <img
                src={b.image}
                alt={b.roomTitle}
                style={{ width: '140px', height: '110px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
              />

              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', backgroundColor: '#f0fdfa', padding: '2px 8px', borderRadius: '4px' }}>
                    {b.id}
                  </span>
                  <StatusBadge status={b.status} label={b.statusLabel} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  {b.roomTitle} ({b.roomNumber})
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} />
                  <span>{b.address}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} style={{ color: '#0d9488' }} />
                  <span>Thời gian hẹn: <strong>{b.time}</strong> ngày <strong>{b.date}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                <a
                  href={`tel:${b.hostPhone}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f0fdfa',
                    color: '#0d9488',
                    border: '1px solid #99f6e4',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                  }}
                >
                  <Phone size={14} />
                  <span>Gọi chủ trọ</span>
                </a>

                {b.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => setCancellingBooking(b)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#ef4444',
                      border: '1px solid #fecaca',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy lịch hẹn
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Cancel Dialog */}
      <AnimatePresence>{cancellingBooking && (
        <Modal title="Xác nhận hủy lịch hẹn" onClose={() => setCancellingBooking(null)}>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
            Bạn có chắc chắn muốn hủy lịch hẹn xem <strong>{cancellingBooking.roomTitle}</strong> vào lúc {cancellingBooking.time} ngày {cancellingBooking.date}?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setCancellingBooking(null)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              Giữ lịch hẹn
            </button>
            <button
              type="button"
              onClick={confirmCancel}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#e11d48', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Xác nhận hủy
            </button>
          </div>
        </Modal>
      )}</AnimatePresence>
    </div>
  );
}
