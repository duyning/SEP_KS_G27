import { useState } from 'react';
import Modal from './common/Modal.jsx';
import UIButton from './common/Button.jsx';
import { serviceRegistrationApi as api } from '../services/service-registration.js';

export default function ServiceCancellation({ application, onChanged, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  if (application.status !== 'PENDING') return null;
  const close = () => { if (!busy) { setOpen(false); if (stale) onChanged(); } };
  async function cancel() {
    if (busy || stale) return;
    setBusy(true); setError('');
    try {
      await api.cancel(application.registrationId, application.revision);
      setOpen(false); onChanged();
    } catch (err) { setError(err.message); setStale(err.status === 409 || err.status === 502); }
    finally { setBusy(false); }
  }
  return <>
    <UIButton type="button" className="svc-btn svc-btn-danger" disabled={disabled} onClick={() => { setError(''); setStale(false); setOpen(true); }}>Hủy hồ sơ</UIButton>
    {open && <Modal title="Xác nhận hủy hồ sơ" onClose={close} closeDisabled={busy}>
      <p>Bạn muốn hủy hồ sơ <strong>{application.serviceName}</strong>? Hồ sơ sẽ ngừng chờ xét duyệt và được giữ trong lịch sử với trạng thái “Đã hủy”.</p>
      <p>{application.targetServiceId ? 'Dịch vụ đang công khai không thay đổi. Bạn có thể gửi yêu cầu mới sau khi hủy.' : 'Bạn có thể gửi hồ sơ mới sau khi hủy.'}</p>
      {error && <p role="alert" className="service-error">{error}</p>}
      <div className="svc-actions"><UIButton type="button" className="svc-btn" disabled={busy} onClick={close}>{stale ? 'Đóng' : 'Quay lại'}</UIButton><UIButton type="button" className="svc-btn svc-btn-danger" disabled={busy || stale} onClick={cancel}>{busy ? 'Đang hủy...' : 'Xác nhận hủy hồ sơ'}</UIButton></div>
    </Modal>}
  </>;
}
