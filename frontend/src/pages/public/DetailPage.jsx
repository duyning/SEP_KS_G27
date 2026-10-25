import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  Home,
  Info,
  MapPin,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { MOCK_ROOMS } from '../../fixtures/mockRooms.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function DetailPage() {
  const [params] = useSearchParams();
  const notify = useToast();
  const roomId = parseInt(params.get('id') || '1', 10);
  const room = MOCK_ROOMS.find((r) => r.id === roomId) || MOCK_ROOMS[0];

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingNote, setBookingNote] = useState('');

  // Report Form State
  const [reportReason, setReportReason] = useState('WRONG_PRICE');
  const [reportDetail, setReportDetail] = useState('');

  const galleryImages = room.gallery?.length ? room.gallery.map((g) => g.url) : [room.image];

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!bookingDate || !bookingName || !bookingPhone) {
      alert('Vui lòng điền đầy đủ thông tin đặt lịch.');
      return;
    }
    setIsBookingModalOpen(false);
    notify?.('Yêu cầu đặt lịch hẹn đã được gửi đến Chủ trọ thành công! (Demo)', 'success');
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    setIsReportModalOpen(false);
    notify?.('Cảm ơn bạn! Báo cáo tin đăng đã được ghi nhận và gửi đến ban kiểm duyệt.', 'success');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumb Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
          <Link to="/" style={{ color: '#0d9488', textDecoration: 'none' }}>Trang chủ</Link>
          <span>/</span>
          <Link to="/search" style={{ color: '#0d9488', textDecoration: 'none' }}>Danh sách phòng</Link>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{room.title}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setIsSaved(!isSaved);
              notify?.(isSaved ? 'Đã xóa khỏi danh sách đã lưu' : 'Đã lưu phòng trọ vào mục Yêu thích', 'success');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: isSaved ? '#fff1f2' : '#ffffff',
              color: isSaved ? '#e11d48' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Heart size={16} fill={isSaved ? '#e11d48' : 'none'} />
            <span>{isSaved ? 'Đã lưu' : 'Lưu tin'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <AlertTriangle size={15} />
            <span>Báo cáo</span>
          </button>
        </div>
      </div>

      <DemoNoticeBanner message="Dữ liệu chi tiết nhà trọ hiển thị từ prototype fixture do backend chưa cung cấp API GET /api/properties/{id}." />

      {/* Main Title & Price Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              backgroundColor: '#0d9488',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <ShieldCheck size={14} />
              <span>Chính chủ đã xác thực 100%</span>
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>• {room.campusDistance}</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            {room.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#64748b' }}>
            <MapPin size={16} style={{ color: '#0d9488' }} />
            <span>{room.location}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Giá thuê niêm yết:</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0d9488' }}>
            {room.priceDisplay}
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}> /tháng</span>
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
            {room.availability}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ height: '420px', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
          <img
            src={galleryImages[activeImageIdx]}
            alt={room.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        {galleryImages.length > 1 && (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
            {galleryImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Thumb ${idx + 1}`}
                onClick={() => setActiveImageIdx(idx)}
                style={{
                  width: '90px',
                  height: '65px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  cursor: 'pointer',
                  border: activeImageIdx === idx ? '3px solid #0d9488' : '1px solid #cbd5e1',
                  opacity: activeImageIdx === idx ? 1 : 0.7,
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Grid: Details Left (65%) + Host Sidebar Right (35%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(320px, 360px)', gap: '32px' }}>
        {/* Left Column */}
        <div>
          {/* Specs Overview */}
          <section style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Thông số phòng
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Diện tích</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{room.area}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Sức chứa</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{room.specs?.capacity || '1 - 2 người'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Phòng ngủ</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{room.specs?.bedroom || '1 phòng'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Vệ sinh</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{room.specs?.bathroom || 'Khép kín'}</div>
              </div>
            </div>
          </section>

          {/* Utility Fees */}
          <section style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Chi phí điện nước & dịch vụ niêm yết
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>Tiền điện:</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{room.electric || '3.500 đ/số'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>Tiền nước:</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{room.water || '80.000 đ/người'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>Internet Wifi:</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{room.internet || '100.000 đ/phòng'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>Gửi xe máy:</span>
                <strong style={{ fontSize: '14px', color: '#10b981' }}>{room.parkingFee || 'Miễn phí'}</strong>
              </div>
            </div>
          </section>

          {/* Description & Rules */}
          <section style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Mô tả chi tiết
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
              {room.description || 'Phòng trọ khép kín đầy đủ tiện nghi tại Hòa Lạc, an ninh 24/7, giờ giấc tự do không chung chủ.'}
            </p>
          </section>

          {/* Amenities */}
          <section style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Tiện ích có sẵn
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(room.amenities || ['Vệ sinh khép kín', 'Điều hòa', 'Bình nóng lạnh', 'Wifi tốc độ cao', 'Camera an ninh']).map((am, i) => (
                <span key={i} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 600,
                }}>
                  <Check size={14} style={{ color: '#0d9488' }} />
                  <span>{am}</span>
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* Right Host Sidebar */}
        <aside>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            position: 'sticky',
            top: '20px',
            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
              }}>
                {(room.hostInfo?.name || 'Chủ trọ').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {room.hostInfo?.name || 'Bác Minh Quân (Chủ trọ)'}
                </div>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} />
                  <span>Chủ trọ đối tác xác thực</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <a
                href={`tel:${room.hostInfo?.phone || '0987654321'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                <Phone size={16} />
                <span>Gọi chủ trọ: {room.hostInfo?.phone || '0987 654 321'}</span>
              </a>

              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  border: '1px solid #99f6e4',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <Calendar size={16} />
                <span>Đặt lịch hẹn xem phòng</span>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
              🔒 Hệ thống HL_RCS bảo vệ người thuê: Không thu phí đặt cọc giữ chỗ trước khi xem phòng trực tiếp.
            </div>
          </div>
        </aside>
      </div>

      {/* Booking Appointment Modal */}
      {isBookingModalOpen && (
        <Modal title="Đặt lịch hẹn xem phòng trực tiếp" onClose={() => setIsBookingModalOpen(false)}>
          <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
              <strong>Phòng:</strong> {room.title}
            </div>

            <div>
              <label htmlFor="bookingName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Họ và tên của bạn *
              </label>
              <input
                id="bookingName"
                type="text"
                required
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label htmlFor="bookingPhone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Số điện thoại liên hệ *
              </label>
              <input
                id="bookingPhone"
                type="tel"
                required
                value={bookingPhone}
                onChange={(e) => setBookingPhone(e.target.value)}
                placeholder="VD: 0987654321"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="bookingDate" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ngày hẹn xem *
                </label>
                <input
                  id="bookingDate"
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label htmlFor="bookingTime" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Giờ hẹn xem *
                </label>
                <select
                  id="bookingTime"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="08:30">08:30 Sáng</option>
                  <option value="09:30">09:30 Sáng</option>
                  <option value="11:00">11:00 Trưa</option>
                  <option value="14:30">14:30 Chiều</option>
                  <option value="16:00">16:00 Chiều</option>
                  <option value="17:30">17:30 Chiều</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="bookingNote" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Ghi chú thêm cho chủ trọ
              </label>
              <textarea
                id="bookingNote"
                rows={3}
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="VD: Em muốn xem thêm khu để xe và ban công..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Gửi yêu cầu đặt lịch
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <Modal title="Báo cáo tin đăng phòng trọ" onClose={() => setIsReportModalOpen(false)}>
          <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="reportReason" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Lý do báo cáo
              </label>
              <select
                id="reportReason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="WRONG_PRICE">Sai lệch giá thuê so với thực tế</option>
                <option value="FAKE_PHOTOS">Hình ảnh không đúng thực tế</option>
                <option value="FULL_ROOM">Phòng đã hết nhưng vẫn báo còn</option>
                <option value="SCAM">Có dấu hiệu lừa đảo / yêu cầu cọc online</option>
                <option value="OTHER">Lý do khác</option>
              </select>
            </div>

            <div>
              <label htmlFor="reportDetail" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Chi tiết phản ánh
              </label>
              <textarea
                id="reportDetail"
                rows={4}
                required
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="Mô tả cụ thể vấn đề bạn gặp phải khi liên hệ hoặc đến xem phòng..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#e11d48', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Gửi báo cáo
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
