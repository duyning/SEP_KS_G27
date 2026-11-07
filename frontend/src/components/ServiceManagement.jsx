import { useEffect, useState } from 'react';
import Modal from './common/Modal.jsx';
import ServiceRegistrationModal from './ServiceRegistrationModal.jsx';
import ServicePhoto from './ServicePhoto.jsx';
import { serviceRegistrationApi as api } from '../services/service-registration.js';

const labels = { PENDING: 'Chờ Staff duyệt', NEEDS_SUPPLEMENT: 'Cần bổ sung', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const actions = { CREATE: 'Thêm dịch vụ', UPDATE: 'Cập nhật', DELETE: 'Xóa dịch vụ' };
export default function ServiceManagement({ onClose }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState(null); const [deletion, setDeletion] = useState(null);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    api.mine(controller.signal).then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const services = [...new Map(rows.filter(row => row.status === 'APPROVED' && row.listingDecision === 'APPROVE' && row.serviceId).map(row => [row.serviceId, row]).reverse()).values()].filter(row => row.serviceState !== 'DELETED' && row.operation !== 'DELETE');
  const canAdd = !rows.length || rows.some(row => row.capabilityActive) || !rows.some(row => ['PENDING', 'NEEDS_SUPPLEMENT', 'APPROVED'].includes(row.status));
  const pending = serviceId => rows.some(row => row.targetServiceId === serviceId && ['PENDING', 'NEEDS_SUPPLEMENT'].includes(row.status));
  const finish = () => { setLoading(true); setEditor(null); setDeletion(null); setRevision(v => v + 1); };
  async function remove(event) {
    event.preventDefault(); if (busy) return;
    if (reason.trim().length < 10) { setError('Lý do xóa cần ít nhất 10 ký tự.'); return; }
    setBusy(true); setError('');
    try { await api.change(deletion.serviceId, { operation: 'DELETE', serviceRevision: deletion.serviceRevision, note: reason }); finish(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (editor) return <ServiceRegistrationModal {...editor} onClose={finish} />;
  if (deletion) return <Modal title="Yêu cầu xóa dịch vụ" onClose={() => { if (!busy) { setDeletion(null); setError(''); } }}>
    <form className="svc-form" onSubmit={remove}><p><strong>{deletion.serviceName}</strong> sẽ tiếp tục hiển thị cho đến khi Staff duyệt yêu cầu xóa. Lịch sử xét duyệt được giữ lại.</p>
      {error && <p role="alert" className="service-error">{error}</p>}
      <label>Lý do xóa<textarea required minLength={10} maxLength={2000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label>
      <div className="svc-actions"><button type="button" className="svc-btn" disabled={busy} onClick={() => setDeletion(null)}>Hủy</button><button className="svc-btn svc-btn-danger" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu xóa'}</button></div>
    </form></Modal>;
  return <Modal title="Dịch vụ của tôi" onClose={onClose} maxWidth="1080px">
    <div className="svc-management"><div className="svc-toolbar"><p>Thông tin mới chỉ công khai khi Staff duyệt.</p><button className="svc-btn svc-btn-primary" disabled={loading || !canAdd} onClick={() => setEditor({ createNew: true })}>+ Thêm dịch vụ</button></div>
      {error && <p role="alert" className="service-error">{error}<button onClick={() => setRevision(v => v + 1)}>Thử lại</button></p>}
      {loading ? <p role="status">Đang tải dịch vụ...</p> : <>
        <div className="svc-grid">{services.map(row => <article className="svc-card" key={row.serviceId}><ServicePhoto application={row} /><div className="svc-card-body"><h3>{row.serviceName}</h3><p>{row.serviceState === 'DELETED' ? 'Đã xóa' : row.publicEligible ? 'Đang công khai' : 'Chưa công khai'}</p><div className="svc-actions"><button className="svc-btn" disabled={pending(row.serviceId) || row.serviceState === 'DELETED' || !row.capabilityActive} onClick={() => setEditor({ editService: row })}>Cập nhật</button><button className="svc-btn svc-btn-danger" disabled={pending(row.serviceId) || row.serviceState === 'DELETED' || !row.capabilityActive} onClick={() => { setDeletion(row); setReason(''); setError(''); }}>Yêu cầu xóa</button></div>{pending(row.serviceId) && <small>Có yêu cầu đang xử lý — xem bên dưới.</small>}</div></article>)}</div>
        <h3>Hồ sơ và yêu cầu thay đổi</h3>{!canAdd && <p>Vui lòng xử lý hồ sơ hiện có hoặc kiểm tra lại quyền cung cấp dịch vụ trước khi thêm mới.</p>}{!rows.length && <p>Bạn chưa có dịch vụ. Bấm “Thêm dịch vụ” để bắt đầu.</p>}
        <div className="svc-request-list">{rows.map(row => <div className="svc-request" key={row.registrationId}><div><strong>{row.serviceName}</strong><p>#{row.registrationId} · {actions[row.operation] || 'Thêm dịch vụ'} · {row.status === 'APPROVED' && row.listingDecision === 'REJECT' ? 'Nội dung bị từ chối' : labels[row.status]}</p>{row.reasonNote && <small>{row.reasonNote}</small>}</div><button className="svc-btn" onClick={() => setEditor({ applicationId: row.registrationId })}>{row.status === 'NEEDS_SUPPLEMENT' ? 'Bổ sung hồ sơ' : 'Xem kết quả'}</button></div>)}</div>
      </>}
    </div>
  </Modal>;
}
