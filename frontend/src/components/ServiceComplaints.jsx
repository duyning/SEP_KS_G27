import ServiceFormSelect from './ServiceFormSelect.jsx';
import '../styles/service-registration-form.css';
import useServiceLive from '../hooks/useServiceLive.js';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import UIButton from './common/Button.jsx';
import UIField from './common/Field.jsx';
import Modal from './common/Modal.jsx';
import { FeedbackUpload, FeedbackImages } from './ServiceFeedbackMedia.jsx';
import { serviceFeedbackApi as api, complaintLabels } from '../services/service-feedback.js';
import '../styles/service-feedback.css';

const eventLabels = { REQUEST_EXPLANATION: 'Yêu cầu giải trình', EXPLAINED: 'Nhà cung cấp giải trình', DISMISS: 'Đóng báo cáo', REMOVE: 'Gỡ dịch vụ khỏi công khai' };
export function ServiceReportForm({ service, onClose }) {
  const { user } = useAuth(); const [content, setContent] = useState(''); const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  async function submit(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.report(service.serviceId, content.trim(), images); setSent(true); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title="Báo cáo dịch vụ" onClose={() => { if (!busy) onClose(); }}>
    {!user ? <p>Vui lòng <Link to="/login" state={{ from: `/services/detail?id=${service.serviceId}` }}>đăng nhập</Link> để gửi báo cáo.</p> : sent ? <div role="status"><h3>Đã gửi báo cáo cho nhân viên</h3><p>Bạn có thể theo dõi trong mục “Báo cáo của tôi” tại trang Dịch vụ.</p><UIButton onClick={onClose}>Đóng</UIButton></div> : <form className="svc-feedback-form" onSubmit={submit}>
      <p><strong>{service.serviceName}</strong></p><p>Mô tả hành vi nghi lừa đảo hoặc vi phạm và đính kèm ảnh minh chứng nếu có. Nội dung được gửi trực tiếp đến nhân viên xét duyệt; không hiển thị công khai.</p>
      <UIField label="Nội dung báo cáo" helper="Từ 10 đến 3000 ký tự."><textarea required minLength={10} maxLength={3000} rows={5} value={content} disabled={busy} onChange={e => setContent(e.target.value)} /></UIField>
      <FeedbackUpload images={images} onChange={setImages} disabled={busy} />
      {error && <p role="alert" className="service-error">{error}</p>}<UIButton variant="destructive" disabled={busy || content.trim().length < 10}>{busy ? 'Đang gửi…' : 'Gửi báo cáo cho nhân viên'}</UIButton>
    </form>}
  </Modal>;
}

function DetailIcon({ type }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {type === 'refresh' ? <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" /></> : type === 'user' ? <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></> : type === 'provider' ? <><path d="M4 21V5l8-3v19M12 8h8v13M8 7v1m0 4v1m0 4v1m8-6v1m0 4v1M2 21h20" /></> : type === 'clock' ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> : type === 'remove' ? <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></> : type === 'message' ? <path d="M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5" /> : type === 'shield' ? <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></> : type === 'loading' ? <path d="M21 12a9 9 0 1 1-9-9" /> : <path d="m5 12 4 4L19 6" />}
  </svg>;
}
const detailStyles = `
.report-detail-ui{--rd-teal:#0f766e;--rd-teal-dark:#115e59;--rd-teal-soft:#f0fdfa;--rd-teal-border:#b5ddd7;--rd-text:#183044;--rd-muted:#64748b;--rd-border:#e2e8f0;--rd-bg:#fff;--rd-soft:#f8fafc;--rd-red:#b91c1c;--rd-red-soft:#fef2f2;--rd-red-border:#fecaca;--rd-yellow:#a16207;--rd-yellow-soft:#fef9c3;--rd-blue:#1d4ed8;--rd-blue-soft:#eff6ff;--rd-green:#15803d;--rd-green-soft:#f0fdf4;--rd-disabled:#d5e6e3;--rd-disabled-text:#426560;color:var(--rd-text);padding:24px;border-color:var(--rd-border);background:var(--rd-bg)}
.report-detail-title{display:flex;align-items:center;gap:16px;margin:0 0 20px}.report-detail-title-copy{display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex:1;min-width:0}.report-detail-ui .report-detail-reload{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:none;margin-left:auto;padding:9px 12px;min-height:40px;font-size:13px}.report-detail-reload svg{width:16px;height:16px}.report-detail-title h2{font-size:24px;line-height:1.35;font-weight:800;margin:0;overflow-wrap:anywhere}.report-detail-title .svc-complaint-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:650;padding:5px 10px;margin:0;background:var(--rd-yellow-soft);color:var(--rd-yellow);border-radius:999px}.report-detail-title .svc-complaint-status>span{width:6px;height:6px;border-radius:50%;background:currentColor}.report-detail-title .status-needs_explanation,.report-detail-title .status-explained{background:var(--rd-blue-soft);color:var(--rd-blue)}.report-detail-title .status-removed{background:var(--rd-red-soft);color:var(--rd-red)}.report-detail-title .status-dismissed{background:var(--rd-green-soft);color:var(--rd-green)}
.report-detail-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:0 0 20px;padding:14px 16px;border:1px solid var(--rd-border);border-radius:12px}.report-detail-meta dt{display:flex;align-items:center;gap:6px;color:var(--rd-muted);font-size:12px;margin-bottom:7px}.report-detail-meta dt svg{width:14px;height:14px;flex:none}.report-detail-meta dd{font-weight:700;font-size:14px;margin:0;line-height:1.6;overflow-wrap:anywhere}.report-detail-content{padding:16px;background:var(--rd-soft);border-left:3px solid var(--rd-red);border-radius:0 12px 12px 0}.report-detail-ui h3{font-size:18px;line-height:1.4;font-weight:750;margin:0}.report-detail-ui .report-detail-content h3{font-size:16px}.report-detail-content .svc-feedback-content{font-size:15px;margin:10px 0 0;line-height:1.7}.report-detail-history{margin:20px 0 0;padding:20px;border:1px solid var(--rd-border);border-radius:14px;background:var(--rd-bg)}
.report-detail-timeline{list-style:none;padding:0;margin:16px 0 0}.report-detail-timeline>li{position:relative;display:grid;grid-template-columns:32px minmax(0,1fr);gap:14px;padding-bottom:24px}.report-detail-timeline>li:last-child{padding-bottom:0}.report-detail-timeline>li:not(:last-child):before{content:'';position:absolute;left:15px;top:32px;bottom:0;width:2px;background:var(--rd-border)}.report-detail-marker{position:relative;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--rd-teal-soft);color:var(--rd-teal);border:1px solid var(--rd-teal-border)}.report-detail-marker svg{width:16px;height:16px}.report-detail-timeline .is-removal .report-detail-marker{color:var(--rd-red);background:var(--rd-red-soft);border-color:var(--rd-red-border)}.report-detail-timeline strong{display:block;padding-top:4px;font-size:14px}.report-detail-timeline small{display:block;margin-top:6px;color:var(--rd-muted);font-size:12px;line-height:1.6}.report-detail-timeline p{margin:10px 0 0;font-size:14px;line-height:1.7}
.report-detail-ui .report-detail-action{padding:20px;border:1px solid var(--rd-teal-border);border-radius:14px;background:var(--rd-bg);gap:20px;margin-top:20px}.report-detail-action>h3{display:flex;align-items:center;gap:10px;color:var(--rd-teal-dark)}.report-detail-action>h3 svg{flex:none}.report-detail-decisions>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.report-detail-ui .report-detail-decisions legend{margin-bottom:12px;font-size:14px}.report-detail-decision{position:relative;display:flex;flex-wrap:wrap;align-content:flex-start;align-items:center;gap:10px;padding:16px;border:1.5px solid var(--rd-border);border-radius:10px;cursor:pointer;background:var(--rd-bg);transition:border-color .15s ease,background .15s ease}.report-detail-decision input{width:17px;height:17px;accent-color:var(--rd-teal);margin:0}.report-detail-decision-icon{color:var(--rd-teal);margin-left:auto;height:20px}.report-detail-decision>span:last-child{width:100%;min-width:0}.report-detail-decision strong{display:block;font-size:14px;line-height:1.5}.report-detail-decision small{display:block;font-size:12px;color:var(--rd-muted);line-height:1.6;margin-top:6px}.report-detail-decision:hover,.report-detail-decision.is-selected{border-color:var(--rd-teal);background:var(--rd-teal-soft)}.report-detail-decision.is-danger .report-detail-decision-icon,.report-detail-decision.is-danger strong{color:var(--rd-red)}.report-detail-decision.is-danger input{accent-color:var(--rd-red)}.report-detail-decision.is-danger:hover,.report-detail-decision.is-danger.is-selected{border-color:var(--rd-red);background:var(--rd-red-soft)}.report-detail-decision:has(input:focus-visible){outline:2px solid var(--rd-teal);outline-offset:3px}.report-detail-decisions:disabled .report-detail-decision{cursor:not-allowed}
.report-detail-text{position:relative}.report-detail-ui .report-detail-text .ui-field{display:grid;gap:9px}.report-detail-ui .report-detail-text textarea{border:1px solid var(--rd-border);border-radius:10px;padding:14px;background:var(--rd-bg);color:var(--rd-text);line-height:1.7;resize:vertical;font-size:14px}.report-detail-ui .report-detail-text textarea:focus{border-color:var(--rd-teal);outline:2px solid var(--rd-teal-border);outline-offset:2px}.report-detail-ui .report-detail-text textarea[aria-invalid=true]{border-color:var(--rd-red)}.report-detail-counter{display:block;text-align:right;font-size:12px;color:var(--rd-muted);font-variant-numeric:tabular-nums;margin-top:6px}.report-detail-text .ui-field-error{color:var(--rd-red);font-size:12px}.report-detail-text .ui-field-helper{color:var(--rd-muted);font-size:12px}.report-detail-ui .svc-remove-confirm{padding:14px;border:1px solid var(--rd-red-border);border-radius:10px;background:var(--rd-red-soft);color:var(--rd-red);font-size:14px}.report-detail-ui .svc-remove-confirm input{accent-color:var(--rd-red)}
.report-detail-ui .ui-button.report-detail-save{display:inline-flex;align-items:center;justify-content:center;gap:9px;justify-self:start;min-height:46px;min-width:180px;padding:12px 22px;border:1px solid var(--rd-teal);border-radius:9px;background:var(--rd-teal);color:var(--rd-bg);font-weight:750;opacity:1}.report-detail-ui .ui-button.report-detail-save:hover:not(:disabled){background:var(--rd-teal-dark)}.report-detail-ui .ui-button.report-detail-save.is-danger{background:var(--rd-red);border-color:var(--rd-red)}.report-detail-ui .ui-button.report-detail-save:disabled{background:var(--rd-disabled);border-color:var(--rd-disabled);color:var(--rd-disabled-text);opacity:1;cursor:not-allowed}.report-detail-ui .ui-button.report-detail-save.is-danger:disabled{background:var(--rd-red-soft);border-color:var(--rd-red-border);color:var(--rd-red)}.report-detail-ui .ui-button:focus-visible{outline:2px solid var(--rd-teal);outline-offset:3px}.report-detail-spinner{display:inline-flex;animation:report-detail-spin 1s linear infinite}.report-detail-ui .service-error{color:var(--rd-red)}.report-detail-ui .svc-feedback-success{background:var(--rd-teal-soft);color:var(--rd-teal-dark)}
@keyframes report-detail-spin{to{transform:rotate(360deg)}}
@media(max-width:800px){.report-detail-decisions>div{grid-template-columns:1fr}.report-detail-decision{display:grid;grid-template-columns:18px 22px minmax(0,1fr);align-items:start}.report-detail-decision>span:last-child{width:auto}.report-detail-decision input{margin-top:2px}.report-detail-decision-icon{margin:0}}
@media(max-width:480px){.report-detail-ui{padding:16px}.report-detail-title{align-items:flex-start;gap:10px}.report-detail-title-copy{gap:8px}.report-detail-title h2{font-size:22px}.report-detail-ui .report-detail-reload{padding:8px;font-size:12px}.report-detail-history{padding:16px}.report-detail-meta{grid-template-columns:1fr;padding:16px;gap:16px}.report-detail-content{padding:16px}.report-detail-ui .report-detail-action{padding:16px;gap:18px}.report-detail-decision{padding:12px;gap:8px}.report-detail-ui .ui-button.report-detail-save{width:100%;min-width:0}.report-detail-ui .report-detail-history>h3,.report-detail-ui .report-detail-action>h3{font-size:18px}.report-detail-timeline>li{gap:10px}}
@media(prefers-reduced-motion:reduce){.report-detail-spinner{animation:none}.report-detail-decision{transition:none}}
`;

function ComplaintDetail({ id, onChanged }) {
  const [touched, setTouched] = useState(false);
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [reload, setReload] = useState(0); const [action, setAction] = useState('REQUEST_EXPLANATION'); const [content, setContent] = useState('');
  const [images, setImages] = useState([]); const [busy, setBusy] = useState(false); const [success, setSuccess] = useState(''); const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    api.complaint(id, controller.signal).then(d => { if (!controller.signal.aborted) { setData(d); setAction(d.complaint.status === 'NEEDS_EXPLANATION' ? 'REMOVE' : 'REQUEST_EXPLANATION'); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload]);
  useServiceLive(signal => api.complaint(id, signal), fresh => { setData(fresh); setLoading(false); }, { enabled: !busy, identity: id });
  async function send(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setSuccess('');
    try {
      const next = data.canExplain ? await api.explain(id, data.complaint.revision, content.trim(), images) : await api.decide(id, data.complaint.revision, action, content.trim());
      setData(next); setAction(next.complaint.status === 'NEEDS_EXPLANATION' ? 'REMOVE' : 'REQUEST_EXPLANATION'); setContent(''); setImages([]); setConfirmRemove(false); setSuccess('Đã lưu và gửi kết quả xử lý.'); onChanged();
    } catch (err) { setError(err.message); if (err.status === 409) { setData(null); } } finally { setBusy(false); }
  }
  const c = data?.complaint;
  const shortContent = (touched || content.length > 0) && content.trim().length < 10;
  return <div className="svc-complaint-detail report-detail-ui"><style>{detailStyles}</style><header className="report-detail-title"><div className="report-detail-title-copy"><h2>Báo cáo #{id}{c && ` · ${c.serviceName}`}</h2>{c && <span className={`svc-complaint-status status-${c.status.toLowerCase()}`}><span aria-hidden="true" />{complaintLabels[c.status]}</span>}</div></header>
    {loading && <p role="status">Đang tải báo cáo…</p>}{error && <p role="alert" className="service-error">{error}</p>}{success && <p role="status" className="svc-feedback-success">{success}</p>}
    {data && <>
      <dl className="report-detail-meta"><div><dt><DetailIcon type="provider" />Nhà cung cấp</dt><dd>{c.providerName}</dd></div>{data.reporterName && <div><dt><DetailIcon type="user" />Người báo cáo</dt><dd>{data.reporterName}</dd></div>}<div><dt><DetailIcon type="clock" />Thời gian gửi</dt><dd><time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleString('vi-VN')}</time></dd></div></dl>
      {c.moderationHidden && <p className="service-error">Dịch vụ đã bị nhân viên gỡ khỏi chế độ công khai.</p>}
      <section className="report-detail-content"><h3>Nội dung báo cáo</h3><p className="svc-feedback-content">{c.content}</p><FeedbackImages urls={data.imageUrls} privateImages /></section>
      <section className="report-detail-history"><h3>Lịch sử xử lý</h3><ol className="report-detail-timeline">
        <li><span className="report-detail-marker"><DetailIcon type="check" /></span><div><strong>Đã tiếp nhận báo cáo</strong><small><time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleString('vi-VN')}</time></small>{!data.history.length && <p>Báo cáo đã được tiếp nhận, đang chờ nhân viên xem xét.</p>}</div></li>
        {data.history.map(event => <li key={event.eventId} className={event.action === 'REMOVE' ? 'is-removal' : ''}><span className="report-detail-marker"><DetailIcon type={event.action === 'REMOVE' ? 'remove' : 'check'} /></span><div><strong>{eventLabels[event.action]}</strong><small>{event.actorName} · <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('vi-VN')}</time></small><p className="svc-feedback-content">{event.content}</p><FeedbackImages urls={event.imageUrls} privateImages /></div></li>)}
      </ol></section>
      {(data.canReview || data.canExplain) && <form className="svc-feedback-form report-detail-action" onSubmit={send} aria-busy={busy}><h3><DetailIcon type="shield" />{data.canExplain ? 'Gửi thông tin giải trình' : 'Xử lý báo cáo'}</h3>
        {data.canReview && <fieldset className="report-detail-decisions" disabled={busy}><legend>Quyết định</legend><div>{[
          ['REQUEST_EXPLANATION', 'Yêu cầu nhà cung cấp giải trình', 'Đề nghị cung cấp thêm thông tin và minh chứng.', 'message'],
          ['REMOVE', 'Gỡ dịch vụ khỏi công khai', 'Ẩn dịch vụ và ngừng nhận yêu cầu mới.', 'remove'],
          ['DISMISS', 'Đóng báo cáo, không gỡ dịch vụ', 'Hoàn tất xử lý và giữ nguyên trạng thái dịch vụ.', 'check'],
        ].filter(([value]) => value !== 'REQUEST_EXPLANATION' || c.status !== 'NEEDS_EXPLANATION').map(([value, label, hint, icon]) => <label key={value} className={`report-detail-decision${value === 'REMOVE' ? ' is-danger' : ''}${action === value ? ' is-selected' : ''}`}>
          <input type="radio" name={`report-decision-${id}`} value={value} checked={action === value} onChange={e => { setAction(e.target.value); setConfirmRemove(false); }} /><span className="report-detail-decision-icon"><DetailIcon type={icon} /></span><span><strong>{label}</strong><small>{hint}</small></span>
        </label>)}</div></fieldset>}
        <div className="report-detail-text"><UIField label={data.canExplain ? 'Thông tin giải trình' : action === 'REQUEST_EXPLANATION' ? 'Thông tin cần nhà cung cấp trình báo lại' : 'Lý do xử lý'} helper="Từ 10 đến 3000 ký tự." error={shortContent ? 'Vui lòng nhập ít nhất 10 ký tự (không tính khoảng trắng ở đầu/cuối).' : undefined}><textarea required minLength={10} maxLength={3000} rows={5} value={content} disabled={busy} onBlur={() => setTouched(true)} onChange={e => setContent(e.target.value)} /></UIField><span className="report-detail-counter" aria-label={`${content.length} trên 3000 ký tự`}>{content.length}/3000</span></div>
        {data.canExplain && <FeedbackUpload images={images} onChange={setImages} disabled={busy} />}
        {data.canReview && action === 'REMOVE' && <label className="svc-remove-confirm"><input type="checkbox" required disabled={busy} checked={confirmRemove} onChange={e => setConfirmRemove(e.target.checked)} />Xác nhận gỡ dịch vụ khỏi danh sách, trang chi tiết và ngừng nhận yêu cầu mới ngay sau khi lưu.</label>}
        <UIButton className={`report-detail-save${data.canReview && action === 'REMOVE' ? ' is-danger' : ''}`} variant={data.canReview && action === 'REMOVE' ? 'destructive' : 'primary'} disabled={busy || content.trim().length < 10 || data.canReview && action === 'REMOVE' && !confirmRemove}>{busy && <span className="report-detail-spinner"><DetailIcon type="loading" /></span>}{busy ? 'Đang gửi…' : data.canExplain ? 'Gửi giải trình cho nhân viên' : 'Lưu quyết định'}</UIButton>
      </form>}
    </>}
  </div>;
}
export default function ServiceComplaints({ scope = 'mine', renderList }) {
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0); const [selected, setSelected] = useState(() => scope === 'staff' && /^[1-9]\d*$/.test(params.get('id') || '') ? Number(params.get('id')) : null); const [filter, setFilter] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    api.complaints(scope, controller.signal).then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, reload]);
  useServiceLive(signal => api.complaints(scope, signal), fresh => { setRows(fresh); setError(''); setLoading(false); }, { identity: scope });
  const refresh = () => setReload(n => n + 1);
  if (selected) return <ComplaintDetail key={selected} id={selected} onChanged={refresh} />;
  const filtered = rows.filter(row => !filter || row.status === filter);
  if (renderList) return renderList({ rows, filtered, filter, setFilter, loading, error, refresh, onSelect: setSelected });
  return <section className="svc-complaints"><div className="svc-feedback-heading"><h3>{scope === 'staff' ? 'Báo cáo dịch vụ' : scope === 'incoming' ? 'Báo cáo và yêu cầu giải trình' : 'Báo cáo của tôi'}</h3></div>
    <div className="svc-report-status-select"><ServiceFormSelect label="Lọc theo trạng thái" name="report-status" value={filter} onChange={event => setFilter(event.target.value)} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(complaintLabels).map(([value, label]) => ({ value, label }))]} /></div>
    {error && <p role="alert" className="service-error">{error}</p>}{loading ? <p role="status">Đang tải báo cáo…</p> : !error && <>
      {!filtered.length && <p>Chưa có báo cáo ở trạng thái này.</p>}
      {filtered.map(row => <article className="svc-complaint-row" key={row.complaintId}><div><strong>#{row.complaintId} · {row.serviceName}</strong><span className={`svc-complaint-status status-${row.status.toLowerCase()}`}>{complaintLabels[row.status]}</span><p>{row.content.length > 160 ? row.content.slice(0, 160) + '…' : row.content}</p><small>{new Date(row.createdAt).toLocaleString('vi-VN')}</small></div><UIButton className="svc-btn svc-complaint-open" onClick={() => setSelected(row.complaintId)}>{scope === 'incoming' && row.status === 'NEEDS_EXPLANATION' ? 'Gửi giải trình' : 'Xem báo cáo'}</UIButton></article>)}
    </>}
  </section>;
}
