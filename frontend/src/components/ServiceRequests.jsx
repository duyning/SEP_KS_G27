import { useToast } from './PortalUI.jsx';
import { CalendarDays, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';
import StatusBadge from './common/StatusBadge.jsx';
import UIField from './common/Field.jsx';
import UIButton from './common/Button.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/auth.js';
import Modal from './common/Modal.jsx';
import { serviceRequestsApi as api, vietnamSchedule, requestTime } from '../services/service-requests.js';
import '../styles/service-requests.css';

const labels = { PENDING: 'Chờ phản hồi', ACCEPTED: 'Đã nhận', REJECTED: 'Đã từ chối' };
const vietnamMinute = () => new Date(Date.now() + 7 * 60 * 60 * 1000 + 60000).toISOString().slice(0, 16);
const requiredLabel = text => <>{text}<span className="svc-required" aria-hidden="true"> *</span></>;
export function ServiceRequestForm({ service, onBusyChange, onDirtyChange, onSuccess, onCancel }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ contactName: user?.fullName || '', contactPhone: user?.phoneNumber || '', description: '', address: '', scheduledAt: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const initialForm = useRef(form);
  const editedFields = useRef(new Set());
  const [profileHint, setProfileHint] = useState('');
  useEffect(() => {
    if (!user?.userId) return;
    const controller = new AbortController();
    authApi.me(controller.signal).then(profile => {
      if (controller.signal.aborted || profile.userId !== user.userId) return;
      const contact = { contactName: profile.fullName || '', contactPhone: profile.phoneNumber || '' };
      setForm(previous => {
        const next = { ...previous };
        for (const [name, value] of Object.entries(contact)) {
          if (!editedFields.current.has(name)) {
            next[name] = value;
            initialForm.current = { ...initialForm.current, [name]: value };
          }
        }
        return next;
      });
      setProfileHint(profile.phoneNumber ? '' : 'Tài khoản chưa lưu số điện thoại. Vui lòng bổ sung số liên hệ cho yêu cầu này.');
    }).catch(() => {
      if (!controller.signal.aborted) setProfileHint('Chưa tải được hồ sơ mới nhất. Vui lòng kiểm tra lại thông tin liên hệ.');
    });
    return () => controller.abort();
  }, [user?.userId]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [minimum, setMinimum] = useState(vietnamMinute);
  const lock = useRef(false);
  const [date = '', time = ''] = form.scheduledAt.split('T');
  const [hour = '', minute = ''] = time.split(':');
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const validate = () => {
    const errors = {};
    if (!form.contactName.trim()) errors.contactName = 'Vui lòng nhập người liên hệ.';
    if (!/^(0|\+84)[35789][0-9]{8}$/.test(form.contactPhone.trim())) errors.contactPhone = 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';
    if (form.description.trim().length < 10) errors.description = 'Vui lòng mô tả yêu cầu ít nhất 10 ký tự.';
    try { vietnamSchedule(form.scheduledAt); } catch (err) { errors.scheduledAt = err.message; }
    return errors;
  };
  const update = (name, value) => { editedFields.current.add(name); const next = { ...form, [name]: value }; setForm(next); onDirtyChange?.(Object.keys(next).some(key => next[key] !== initialForm.current[key])); setFieldErrors(previous => ({ ...previous, [name]: undefined })); };
  const blur = name => setFieldErrors(previous => ({ ...previous, [name]: validate()[name] }));
  const setSchedule = (day, hh, mm) => update('scheduledAt', day + 'T' + hh + ':' + mm);
  if (!user) return <p><Link to="/login">Đăng nhập</Link> để gửi yêu cầu sử dụng dịch vụ.</p>;
  if (user.userId === service.providerId) return null;
  async function submit(event) {
    event.preventDefault(); if (lock.current) return;
    const errors = validate(); setFieldErrors(errors); setError('');
    if (Object.keys(errors).length) return;
    lock.current = true; setBusy(true); onBusyChange?.(true);
    try { const saved = await api.submit({ ...form, serviceId: service.serviceId, scheduledAt: vietnamSchedule(form.scheduledAt) }); onDirtyChange?.(false); if (onSuccess) onSuccess(saved); else setResult(saved); }
    catch (err) { setError(err.message); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }
  return <section className="service-request-panel">
    {result ? <p className="service-request-success" role="status">Đã gửi yêu cầu thành công — Chờ chủ dịch vụ phản hồi. Bạn có thể theo dõi tại “Yêu cầu dịch vụ”.</p> : <form noValidate className="service-request-form" onSubmit={submit} aria-busy={busy}>
      <p>Lịch hẹn theo giờ Việt Nam (UTC+7), định dạng 24 giờ. Các mục có dấu <span className="svc-required">*</span> là bắt buộc.</p>
      {error && <p role="alert" className="service-error">{error}</p>}
      <fieldset disabled={busy}>
        <UIField label={requiredLabel('Người liên hệ')} error={fieldErrors.contactName}><input required maxLength={100} value={form.contactName} onBlur={() => blur('contactName')} onChange={e => update('contactName', e.target.value)}/></UIField>
        <UIField label={requiredLabel('Số điện thoại')} error={fieldErrors.contactPhone} helper={!form.contactPhone ? profileHint : undefined}><input required type="tel" autoComplete="tel" maxLength={20} value={form.contactPhone} onBlur={() => blur('contactPhone')} onChange={e => update('contactPhone', e.target.value)}/></UIField>
        <UIField label={requiredLabel('Nội dung yêu cầu')} error={fieldErrors.description}><textarea required minLength={10} maxLength={2000} value={form.description} onBlur={() => blur('description')} onChange={e => update('description', e.target.value)}/></UIField>
        <div className="service-request-schedule" onFocus={() => setMinimum(vietnamMinute())} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) blur('scheduledAt'); }}>
          <UIField label={requiredLabel('Ngày hẹn')} error={fieldErrors.scheduledAt}><input type="date" required min={minimum.slice(0,10)} value={date} onChange={e => setSchedule(e.target.value, hour, minute)}/></UIField>
          <UIField label={requiredLabel('Giờ (00–23)')}><select required value={hour} aria-invalid={!!fieldErrors.scheduledAt} onChange={e => setSchedule(date, e.target.value, minute)}><option value="">Giờ</option>{hours.map(h => <option key={h} value={h} disabled={date === minimum.slice(0,10) && h < minimum.slice(11,13)}>{h}</option>)}</select></UIField>
          <UIField label={requiredLabel('Phút')}><select required value={minute} aria-invalid={!!fieldErrors.scheduledAt} onChange={e => setSchedule(date, hour, e.target.value)}><option value="">Phút</option>{minutes.map(m => <option key={m} value={m} disabled={date === minimum.slice(0,10) && hour === minimum.slice(11,13) && m < minimum.slice(14,16)}>{m}</option>)}</select></UIField>
        </div>
        <UIField label="Địa chỉ thực hiện (nếu cần)"><input maxLength={500} value={form.address} onChange={e => update('address', e.target.value)}/></UIField>
      </fieldset>
      <footer className="service-request-submit-footer">
        {onCancel && <UIButton type="button" className="svc-btn" disabled={busy} onClick={onCancel}>Hủy</UIButton>}
        <UIButton type="submit" className="svc-btn svc-btn-primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={18} aria-hidden="true" />}{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</UIButton>
      </footer>
    </form>}
  </section>;
}

export default function ServiceRequests({ onClose }) {
  const notify = useToast();
  const [responseError, setResponseError] = useState('');
  const [mode, setMode] = useState('mine'), [rows, setRows] = useState([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState(null), [reason, setReason] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setRows([]); setError(''); setChoice(null);
    api[mode](controller.signal).then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mode, revision]);
  async function respond(event) {
    event.preventDefault(); if (lock.current || !choice) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const updated = await api.respond(choice.row.requestId, { decision: choice.decision, reason: choice.decision === 'REJECTED' ? (reason.trim() ? (reason.trim().length < 10 ? 'Lý do từ chối: ' + reason.trim() : reason.trim()) : 'Nhà cung cấp không nhận yêu cầu này.') : reason, revision: choice.row.revision });
      setRows(previous => previous.map(row => row.requestId === updated.requestId ? updated : row)); setChoice(null); notify(updated.status === 'ACCEPTED' ? 'Đã nhận yêu cầu dịch vụ.' : 'Đã từ chối yêu cầu dịch vụ.', 'success');
    } catch (err) { setResponseError(err.message); setError(err.message); if (err.status === 409) setChoice(null); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal title="Yêu cầu dịch vụ" maxWidth="900px" onClose={() => { if (!busy) onClose(); }}>
    <div className="service-request-panel">
      <div className="service-request-toolbar"><div className="svc-actions service-request-tabs" role="group" aria-label="Loại yêu cầu">
        <UIButton className="svc-btn" aria-pressed={mode === 'mine'} disabled={busy} onClick={() => setMode('mine')}>Tôi đã gửi</UIButton>
        <UIButton className="svc-btn" aria-pressed={mode === 'incoming'} disabled={busy} onClick={() => setMode('incoming')}>Khách gửi cho tôi</UIButton>
        </div><UIButton type="button" variant="ghost" className="service-request-refresh" title="Tải lại yêu cầu" aria-label="Tải lại yêu cầu" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={18} aria-hidden="true" /></UIButton>
      </div>

      {error && <p role="alert" className="service-error">{error} Hãy tải lại để kiểm tra trạng thái mới nhất.</p>}
      {loading ? <p role="status">Đang tải yêu cầu…</p> : !error && !rows.length ? <div className="service-request-empty"><Inbox size={36} aria-hidden="true" /><h3>{mode === 'mine' ? 'Bạn chưa gửi yêu cầu nào' : 'Chưa có yêu cầu từ khách'}</h3><p>{mode === 'mine' ? 'Chọn dịch vụ phù hợp và gửi yêu cầu để nhà cung cấp liên hệ với bạn.' : 'Yêu cầu mới sẽ xuất hiện tại đây khi khách gửi đến dịch vụ của bạn.'}</p><Link className="svc-btn" to="/services" onClick={onClose}>Xem danh sách dịch vụ</Link></div> : rows.map(row => <article className="service-request-card" key={row.requestId}>
        <header className="request-card-heading"><h3>#{row.requestId} · {row.serviceName}</h3><StatusBadge status={row.status} label={labels[row.status]}/></header><p className="request-card-calendar"><CalendarDays size={16} aria-hidden="true" />{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(row.scheduledAt)).replace(', ', ' ').replace(/^(\d{2}:\d{2}) (.*)$/, '$2 $1')}</p>
        <dl className="request-card-facts"><dt>Khách hàng</dt><dd>{row.contactName}</dd><dt>Điện thoại</dt><dd><a href={'tel:' + row.contactPhone.replace(/[^+0-9]/g, '')}>{row.contactPhone}</a></dd><dt>Nội dung</dt><dd className="service-text">{row.description}</dd></dl>{row.address && <p>Địa chỉ: {row.address}</p>}
        {row.handledAt && <p>Phản hồi lúc {requestTime(row.handledAt)} · Người xử lý #{row.handledBy}</p>}
        {row.responseReason && <p className="service-text">Phản hồi: {row.responseReason}</p>}
        {mode === 'incoming' && row.status === 'PENDING' && <>
          {!row.canAccept && <p>Dịch vụ hoặc quyền đã ngừng, hoặc lịch đã qua. Bạn vẫn có thể từ chối kèm lý do.</p>}
          <div className="svc-actions request-card-actions"><UIButton className="svc-btn svc-btn-primary" disabled={busy || !row.canAccept} onClick={() => { setChoice({ row, decision: 'ACCEPTED' }); setReason(''); setResponseError(''); }}>Nhận yêu cầu</UIButton><UIButton className="svc-btn request-reject" disabled={busy} onClick={() => { setChoice({ row, decision: 'REJECTED' }); setReason(''); }}>Từ chối</UIButton></div>
        </>}
      </article>)}
      <p className="request-timezone-note">Thời gian theo giờ Việt Nam (UTC+7).</p>
      {choice && <Modal title={choice.decision === 'ACCEPTED' ? 'Nhận yêu cầu dịch vụ?' : 'Từ chối yêu cầu dịch vụ?'} maxWidth="480px" closeDisabled={busy} onClose={() => { if (!busy) setChoice(null); }}>
        <form className="service-request-form" onSubmit={respond}><p>#{choice.row.requestId} · {choice.row.serviceName}</p>
        {responseError && <p role="alert" className="service-error">{responseError}</p>}
        {choice.decision === 'REJECTED' && <UIField label="Lý do từ chối (tùy chọn)"><textarea maxLength={2000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /><small>Nếu để trống, khách sẽ nhận thông báo: “Nhà cung cấp không nhận yêu cầu này.”</small></UIField>}
        <div className="svc-actions request-card-actions"><UIButton type="button" className="svc-btn" disabled={busy} onClick={() => setChoice(null)}>Hủy</UIButton><UIButton type="submit" className={'svc-btn ' + (choice.decision === 'REJECTED' ? 'request-reject' : 'svc-btn-primary')} disabled={busy}>{busy && <LoaderCircle className="spin" size={16} aria-hidden="true" />}{busy ? 'Đang lưu…' : 'Xác nhận'}</UIButton></div></form>
      </Modal>}
    </div>
  </Modal>;
}
