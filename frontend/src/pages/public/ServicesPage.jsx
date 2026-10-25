import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Wrench,
} from 'lucide-react';
import { MOCK_SERVICE_PROVIDERS } from '../../fixtures/mockServices.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function ServicesPage() {
  const [params, setParams] = useSearchParams();
  const notify = useToast();
  const selectedCat = params.get('category') || 'all';

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerCategory, setProviderCategory] = useState('moving');
  const [providerDesc, setProviderDesc] = useState('');

  const filteredProviders = selectedCat === 'all'
    ? MOCK_SERVICE_PROVIDERS
    : MOCK_SERVICE_PROVIDERS.filter((p) => p.category === selectedCat);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setIsRegisterModalOpen(false);
    notify?.('Hồ sơ đăng ký đối tác dịch vụ đã được gửi tới ban quản trị! (Demo)', 'success');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Dịch vụ hỗ trợ quanh khu vực Hòa Lạc
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Tổng hợp các đơn vị chuyển trọ, giặt là, vệ sinh và sửa chữa uy tín dành cho sinh viên và cư dân.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: '#0d9488',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          <span>Đăng ký cung cấp dịch vụ</span>
        </button>
      </div>

      <DemoNoticeBanner message="Dữ liệu nhà cung cấp dịch vụ hiển thị từ prototype fixture do backend chưa cung cấp API GET /api/services." />

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          ['all', 'Tất cả dịch vụ'],
          ['moving', 'Chuyển phòng trọ'],
          ['laundry', 'Giặt là sinh viên'],
          ['cleaning', 'Dọn dẹp & Vệ sinh'],
        ].map(([key, label]) => {
          const active = selectedCat === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setParams(key === 'all' ? {} : { category: key })}
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

      {/* Providers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {filteredProviders.map((provider) => (
          <article
            key={provider.id}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 800,
                  border: '1px solid #99f6e4',
                }}>
                  {provider.initials || 'DV'}
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    {provider.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                    <ShieldCheck size={14} />
                    <span>Đối tác đã xác thực</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
                {provider.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ color: '#0d9488' }} />
                  <span>Khu vực: {provider.serviceArea?.join(', ')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: '#0d9488' }} />
                  <span>Giờ hoạt động: {provider.operatingHours}</span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '14px',
              borderTop: '1px solid #f1f5f9',
            }}>
              <a
                href={`tel:${provider.phone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0d9488',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                <Phone size={15} />
                <span>{provider.phone}</span>
              </a>

              <Link
                to={`/services/detail?id=${provider.id}`}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  border: '1px solid #99f6e4',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Bảng giá & Chi tiết
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Provider Registration Modal */}
      {isRegisterModalOpen && (
        <Modal title="Đăng ký nhà cung cấp dịch vụ quanh trọ" onClose={() => setIsRegisterModalOpen(false)}>
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="providerName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Tên đơn vị / Tên nhà xe / Dịch vụ *
              </label>
              <input
                id="providerName"
                type="text"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="VD: Dịch vụ Chuyển Trọ Tân Xã"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label htmlFor="providerPhone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Số điện thoại liên hệ *
              </label>
              <input
                id="providerPhone"
                type="tel"
                required
                value={providerPhone}
                onChange={(e) => setProviderPhone(e.target.value)}
                placeholder="VD: 0987654321"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label htmlFor="providerCategory" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Lĩnh vực dịch vụ *
              </label>
              <select
                id="providerCategory"
                value={providerCategory}
                onChange={(e) => setProviderCategory(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="moving">Chuyển phòng trọ</option>
                <option value="laundry">Giặt là sinh viên</option>
                <option value="cleaning">Dọn dẹp & Vệ sinh</option>
                <option value="repair">Sửa chữa điện nước, khóa cổng</option>
              </select>
            </div>

            <div>
              <label htmlFor="providerDesc" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Mô tả dịch vụ & Cam kết giá sinh viên *
              </label>
              <textarea
                id="providerDesc"
                rows={3}
                required
                value={providerDesc}
                onChange={(e) => setProviderDesc(e.target.value)}
                placeholder="Giới thiệu về phương tiện, phạm vi hoạt động, cam kết chất lượng..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Gửi hồ sơ đăng ký
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
