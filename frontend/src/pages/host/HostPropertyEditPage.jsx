import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { MOCK_HOST_PROPERTY } from '../../fixtures/mockHostData.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function HostPropertyEditPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const [formData, setFormData] = useState({ ...MOCK_HOST_PROPERTY });
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      notify?.('Thông tin nhà trọ đã được lưu tạm cục bộ. Lưu ý: Chưa có API cập nhật nhà trọ (Integration Gap).', 'warning');
      navigate('/host/property');
    }, 400);
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/host/property" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0d9488', fontSize: '13px', fontWeight: 700, textDecoration: 'none', marginBottom: '8px' }}>
          <ArrowLeft size={16} />
          <span>Quay lại chi tiết nhà trọ</span>
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          Cập nhật thông tin nhà trọ
        </h1>
      </div>

      <DemoNoticeBanner message="Chức năng Cập nhật nhà trọ hiển thị đầy đủ trường nhập. Lưu ý: Thao tác lưu bị khóa do backend chưa có API cập nhật nhà trọ." />

      <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label htmlFor="title" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Tên nhà trọ
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label htmlFor="addressDetail" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Địa chỉ chi tiết
          </label>
          <input
            id="addressDetail"
            type="text"
            value={formData.addressDetail}
            onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label htmlFor="description" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Mô tả giới thiệu
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Link to="/host/property" style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#475569', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Hủy
          </Link>
          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 20px',
              borderRadius: '8px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <Save size={16} />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </form>
    </div>
  );
}
