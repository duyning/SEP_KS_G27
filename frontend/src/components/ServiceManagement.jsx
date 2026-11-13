import StatusBadge from './common/StatusBadge.jsx';
import UIField from './common/Field.jsx';
import UIButton from './common/Button.jsx';
import { useEffect, useState } from 'react';
import Modal from './common/Modal.jsx';
import ServiceRegistrationModal from './ServiceRegistrationModal.jsx';
import ServicePhoto from './ServicePhoto.jsx';
import { serviceRegistrationApi as api } from '../services/service-registration.js';

const labels = { PENDING: 'Chờ nhân viên duyệt', NEEDS_SUPPLEMENT: 'Cần bổ sung', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const actions = { CREATE: 'Thêm dịch vụ', UPDATE: 'Cập nhật', DELETE: 'Gỡ dịch vụ' };
export default function ServiceManagement({ onClose }) {
  const [services, setServices] = useState([]);
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState(null); const [deletion, setDeletion] = useState(null);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    Promise.all([api.mine(controller.signal), api.services(controller.signal)]).then(([data, listings]) => { if (!controller.signal.aborted) { setRows(data); setServices(listings); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const canAdd = !rows.length || rows.some(row => row.capabilityActive) || !rows.some(row => ['PENDING', 'NEEDS_SUPPLEMENT', 'APPROVED'].includes(row.status));
  const pending = serviceId => rows.some(row => row.targetServiceId === serviceId && ['PENDING', 'NEEDS_SUPPLEMENT'].includes(row.status));
  const finish = () => { setLoading(true); setEditor(null); setDeletion(null); setRevision(v => v + 1); };
  async function remove(event) {
    event.preventDefault(); if (busy) return;
    if (reason.trim().length < 10) { setError('Lý do gỡ cần ít nhất 10 ký tự.'); return; }
    setBusy(true); setError('');
    try { await api.change(deletion.serviceId, { operation: 'DELETE', serviceRevision: deletion.serviceRevision, note: reason }); finish(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (editor) return <ServiceRegistrationModal {...editor} onClose={finish} />;
  if (deletion) return <Modal title="Xác nhận gỡ dịch vụ" onClose={() => { if (!busy) { setDeletion(null); setError(''); } }}>
    <form className="svc-form" onSubmit={remove}><p><strong>{deletion.serviceName}</strong> sẽ tiếp tục hiển thị cho đến khi nhân viên duyệt yêu cầu gỡ. Lịch sử xét duyệt được giữ lại.</p>
      {error && <p role="alert" className="service-error">{error}</p>}
      <UIField label="Lý do gỡ dịch vụ"><textarea required minLength={10} maxLength={2000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></UIField>
      <div className="svc-actions"><UIButton type="button" className="svc-btn" disabled={busy} onClick={() => setDeletion(null)}>Hủy</UIButton><UIButton className="svc-btn svc-btn-danger" disabled={busy}>{busy ? 'Đang gửi...' : 'Xác nhận gỡ dịch vụ'}</UIButton></div>
    </form></Modal>;
  return <Modal title="Dịch vụ của tôi" onClose={onClose} maxWidth="1080px">
    <div className="svc-management"><div className="svc-toolbar"><p>Thông tin mới chỉ công khai khi nhân viên duyệt.</p><UIButton className="svc-btn svc-btn-primary" disabled={loading || !canAdd} onClick={() => setEditor({ createNew: true })}>+ Thêm dịch vụ</UIButton></div>
      {error && <p role="alert" className="service-error">{error}<UIButton onClick={() => setRevision(v => v + 1)}>Thử lại</UIButton></p>}
      {loading ? <p role="status">Đang tải dịch vụ...</p> : <>
        <div className="svc-grid">{services.map(row => <article className="svc-card" key={row.serviceId}><ServicePhoto application={row} /><div className="svc-card-body"><h3>{row.serviceName}</h3><div className="svc-management-status"><StatusBadge status={row.publicEligible ? 'PUBLIC' : 'INACTIVE'} label={row.serviceState === 'DELETED' ? 'Đã gỡ dịch vụ' : row.publicEligible ? 'Đang công khai' : 'Chưa công khai'} />{pending(row.serviceId) && <StatusBadge status="PENDING" label="Thay đổi chờ duyệt" />}</div><div className="svc-actions"><UIButton className="svc-btn" disabled={pending(row.serviceId) || row.serviceState === 'DELETED' || !row.capabilityActive} onClick={() => setEditor({ editService: row })}>Cập nhật</UIButton><UIButton className="svc-btn svc-btn-danger" disabled={pending(row.serviceId) || row.serviceState === 'DELETED' || !row.capabilityActive} onClick={() => { setDeletion(row); setReason(''); setError(''); }}>Gỡ dịch vụ</UIButton></div>{pending(row.serviceId) && <small>Có yêu cầu đang xử lý — xem bên dưới.</small>}</div></article>)}</div>
        <h3>Hồ sơ và yêu cầu thay đổi</h3>{!canAdd && <p>Vui lòng xử lý hồ sơ hiện có hoặc kiểm tra lại quyền cung cấp dịch vụ trước khi thêm mới.</p>}{!rows.length && <p>Bạn chưa có dịch vụ. Bấm “Thêm dịch vụ” để bắt đầu.</p>}
        <div className="svc-request-list">{rows.map(row => <div className="svc-request" key={row.registrationId}><div><strong>{row.serviceName}</strong><p>{actions[row.operation] || 'Thêm dịch vụ'}</p><StatusBadge status={row.listingDecision === 'REJECT' ? 'REJECTED' : row.status} label={row.status === 'APPROVED' && row.listingDecision === 'REJECT' ? 'Nội dung bị từ chối' : labels[row.status]} />{row.reasonNote && <small>{row.reasonNote}</small>}</div><UIButton className="svc-btn" onClick={() => setEditor({ applicationId: row.registrationId })}>{row.status === 'NEEDS_SUPPLEMENT' ? 'Bổ sung hồ sơ' : 'Xem kết quả'}</UIButton></div>)}</div>
      </>}
    </div>
  </Modal>;
}
