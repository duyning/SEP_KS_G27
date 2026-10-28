import { AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { MOCK_SERVICE_PROVIDERS, MOCK_SERVICES } from '../../fixtures/mockServices.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function ServiceDetailPage() {
  const [params] = useSearchParams();
  const notify = useToast();
  const providerId = params.get('id') || 'sp-001';
  const provider = MOCK_SERVICE_PROVIDERS.find((p) => p.id === providerId) || MOCK_SERVICE_PROVIDERS[0];
  const services = MOCK_SERVICES.filter((s) => s.providerId === provider.id);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    setIsContactModalOpen(false);
    notify?.('Yêu cầu đặt dịch vụ đã được gửi trực tiếp tới đối tác! Đối tác sẽ liên hệ lại trong ít phút.', 'success');
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '18px' }}>
        <Link
          to="/services"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#0d9488',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh mục dịch vụ</span>
        </Link>
      </div>

      <DemoNoticeBanner message="Dữ liệu chi tiết dịch vụ hiển thị từ prototype fixture do backend chưa cung cấp API GET /api/services/{id}." />

      {/* Provider Hero Card */}
      <section style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '28px',
        border: '1px solid #e2e8f0',
        marginBottom: '28px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: 800,
              border: '2px solid #99f6e4',
            }}>
              {provider.initials || 'DV'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {provider.name}
                </h1>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #a7f3d0',
                }}>
                  <ShieldCheck size={14} />
                  <span>Xác thực uy tín</span>
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 8px' }}>
                {provider.description}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#475569', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={15} style={{ color: '#0d9488' }} />
                  <span>Phục vụ: {provider.serviceArea?.join(', ')}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={15} style={{ color: '#0d9488' }} />
                  <span>{provider.operatingHours}</span>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={`tel:${provider.phone}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              <Phone size={16} />
              <span>Gọi: {provider.phone}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Services & Pricing List */}
      <section style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '20px' }}>
          Bảng giá các gói dịch vụ niêm yết
        </h2>

        {services.length === 0 ? (
          <p style={{ color: '#64748b' }}>Đang cập nhật bảng giá chi tiết cho đối tác này.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {services.map((srv) => (
              <div
                key={srv.id}
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                    {srv.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 8px' }}>
                    {srv.description}
                  </p>
                  <strong style={{ fontSize: '17px', color: '#0d9488' }}>
                    {srv.priceDisplay || `${srv.basePrice?.toLocaleString()} đ`}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedService(srv);
                    setIsContactModalOpen(true);
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#f0fdfa',
                    color: '#0d9488',
                    border: '1px solid #99f6e4',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Đặt gói này
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking Dialog */}
      <AnimatePresence>{isContactModalOpen && (
        <Modal title={`Đặt dịch vụ: ${selectedService?.name || provider.name}`} onClose={() => setIsContactModalOpen(false)}>
          <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="customerName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Họ và tên của bạn *
              </label>
              <input
                id="customerName"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="VD: Hoàng Văn Nam"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label htmlFor="customerPhone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Số điện thoại liên hệ *
              </label>
              <input
                id="customerPhone"
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="VD: 0912345678"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label htmlFor="bookingTime" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Thời gian mong muốn thực hiện *
              </label>
              <input
                id="bookingTime"
                type="text"
                required
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                placeholder="VD: 14:00 chiều Chủ nhật (25/10)"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label htmlFor="notes" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Ghi chú thêm (Địa chỉ trọ, khối lượng đồ đạc...)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Chuyển từ trọ thôn 2 Tân Xã sang ngã ba Hòa Lạc, có 1 tủ lạnh nhỏ và 3 vali..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Gửi yêu cầu dịch vụ
              </button>
            </div>
          </form>
        </Modal>
      )}</AnimatePresence>
    </div>
  );
}
