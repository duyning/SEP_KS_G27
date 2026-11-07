import { serviceFileName } from '../../services/service-form.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { serviceReviewApi as api, validateServiceReview } from '../../services/service-review.js';
import '../../styles/service-applications.css';
import ServiceGallery from '../../components/ServiceGallery.jsx';
import { ArrowLeft, CheckCircle2, Download, Eye, MessageSquarePlus, RefreshCw, XCircle } from 'lucide-react';

const status = { PENDING: 'Chờ xét duyệt', APPROVED: 'Đã xét duyệt', REJECTED: 'Đã từ chối', NEEDS_SUPPLEMENT: 'Cần bổ sung' };
const reviewChoices = [
  { value: 'APPROVE', label: 'Duyệt hồ sơ', description: 'Chấp nhận thông tin và tài liệu.', Icon: CheckCircle2 },
  { value: 'SUPPLEMENT', label: 'Yêu cầu bổ sung', description: 'Trả hồ sơ để người đăng ký hoàn thiện.', Icon: MessageSquarePlus },
  { value: 'REJECT', label: 'Từ chối hồ sơ', description: 'Không chấp nhận hồ sơ, kèm lý do.', Icon: XCircle },
];
const statusBadge = value => <span className={'service-status-badge service-status-' + value?.toLowerCase()}>{status[value] || value}</span>;
const time = value => value ? new Date(value).toLocaleString('vi-VN') : '—';

export default function StaffServiceApplicationsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams(); const selected = params.get('id');
  const activeSelection = useRef(selected); activeSelection.current = selected;
  const [rows, setRows] = useState([]); const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [decision, setDecision] = useState(''); const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); const decisionInput = useRef(null); const reasonInput = useRef(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setDetail(null);
    setDecision(''); setReason(''); setFieldErrors({});
    (selected ? api.detail(selected, controller.signal) : api.list(controller.signal))
      .then(data => {
        if (controller.signal.aborted) return;
        if (selected) setDetail(data); else setRows(data);
      }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected, user.userId, revision]);
  const row = detail?.application;
  const reasonLabel = decision === 'SUPPLEMENT' ? 'Nội dung cần bổ sung' : decision === 'REJECT' ? 'Lý do từ chối' : 'Nhận xét xét duyệt';
  const submitLabel = decision === 'SUPPLEMENT' ? 'Gửi yêu cầu bổ sung' : decision === 'REJECT' ? 'Xác nhận từ chối' : decision === 'APPROVE' ? 'Xác nhận duyệt hồ sơ' : 'Xác nhận quyết định';
  async function mutate(action) {
    if (busy) return;
    setBusy(true); setError('');
    const requested = selected;
    try { const result = await action(); if (activeSelection.current === requested) setDetail(result); window.dispatchEvent(new Event('hlrcs:staff-updated')); }
    catch (err) { if (activeSelection.current === requested) {
      setError(err.message);
      if (err.status === 409) { try { const fresh = await api.detail(requested); if (activeSelection.current === requested) { setDetail(fresh); setDecision(''); setReason(''); setFieldErrors({}); } } catch { /* Reload remains available. */ } }
    } }
    finally { setBusy(false); }
  }
  async function download(doc) {
    try {
      const blob = await api.file(selected, doc.documentId); const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = doc.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
  }
  function review(event) {
    event.preventDefault(); if (busy) return;
    const errors = validateServiceReview(decision, reason); setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const target = errors.decision ? decisionInput.current : reasonInput.current;
      target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return;
    }
    mutate(() => decision === 'SUPPLEMENT' ? api.supplement(selected, reason.trim(), row.revision) : api.review(selected, decision, decision, decision === 'APPROVE' ? '' : reason.trim(), row.revision));
  }
  return <main className="service-applications">
    <div className="service-applications-heading"><h1>{selected ? `Hồ sơ dịch vụ #${selected}` : 'Xét duyệt hồ sơ cung cấp dịch vụ'}</h1><button className="service-app-action" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={16} aria-hidden="true" />Tải lại</button></div>
    <p>Staff và Admin đều có thể xem tài liệu và xét duyệt các hồ sơ chờ xử lý.</p>
    {selected && <Link className="service-app-action" to="/staff/service-applications"><ArrowLeft size={16} aria-hidden="true" />Danh sách hồ sơ</Link>}
    {error && <p role="alert" className="service-error">{error}</p>}
    {loading ? <p role="status">Đang tải hồ sơ...</p> : !selected ? <>
      {!rows.length && !error && <p>Chưa có hồ sơ dịch vụ.</p>}
      <div className="service-table-wrap"><table><thead><tr><th>Hồ sơ / Dịch vụ</th><th>Người đăng ký</th><th>Người duyệt</th><th>Trạng thái</th><th>Ngày gửi</th><th>Thao tác</th></tr></thead><tbody>{rows.map(row => <tr key={row.registrationId}><td><strong>#{row.registrationId} · {row.serviceName}</strong><small className="service-table-category">{row.categoryName}</small></td><td>{row.applicantName}</td><td>{row.reviewerName || 'Chưa xét duyệt'}</td><td>{statusBadge(row.status)}</td><td>{time(row.createdAt)}</td><td><Link className="service-app-action service-app-action-primary" to={`/staff/service-applications?id=${row.registrationId}`}><Eye size={16} aria-hidden="true" />Xem hồ sơ</Link></td></tr>)}</tbody></table></div>
    </> : row && <>
      <section className="service-application-detail"><header className="service-application-title"><h2>{row.serviceName}</h2><div className="service-application-category"><span>Danh mục đăng ký</span><strong>{row.categoryName || 'Chưa có danh mục'}</strong></div><p className="service-application-meta"><span>{({ CREATE: 'Thêm dịch vụ', UPDATE: 'Cập nhật dịch vụ', DELETE: 'Yêu cầu xóa dịch vụ' })[row.operation] || 'Thêm dịch vụ'}{row.targetServiceId && ' · Dịch vụ #' + row.targetServiceId}</span>{statusBadge(row.status)}</p></header>
        {row.resubmissionNote && <p className="service-text">Lý do thay đổi: {row.resubmissionNote}</p>}
        <div className={`service-application-overview${row.hasImage ? '' : ' without-image'}`}>
        {row.hasImage && <ServiceGallery key={row.registrationId + "-" + row.revision} application={row} alt={row.serviceName} />}
        <dl><dt>Người đăng ký</dt><dd>{row.applicantName} (tài khoản #{row.applicantId})</dd><dt>Liên hệ</dt><dd>{row.contactPhone} · {row.contactEmail || 'Không có email'}</dd><dt>Mô tả</dt><dd className="service-text">{row.description}</dd><dt>Khu vực</dt><dd>{row.serviceArea}</dd><dt>Giá</dt><dd>{row.pricingType === 'NEGOTIABLE' ? 'Thỏa thuận' : `${row.pricingType === 'FROM' ? 'Từ ' : ''}${Number(row.price).toLocaleString('vi-VN')} VNĐ`}</dd><dt>Ngày gửi</dt><dd>{time(row.createdAt)}</dd></dl>
        </div>
        {row.targetServiceId && row.publicEligible && <Link className="service-app-action" to={'/services/detail?id=' + row.targetServiceId} target="_blank"><Eye size={16} aria-hidden="true" />Xem bản đang công khai để đối chiếu</Link>}
        <h3>Tài liệu xác minh</h3>{!row.documents.length && <p>Hồ sơ không có tài liệu.</p>}<div className="service-review-documents">{row.documents.map(doc => <button className="service-app-action service-review-document" key={doc.documentId} title={doc.name} aria-label={`Tải xuống ${doc.name}`} onClick={() => download(doc)}><Download size={16} aria-hidden="true" /><span>{serviceFileName(doc.name)}</span></button>)}</div>
      </section>
      {row.status === 'PENDING' && row.applicantId === user.userId && <p>Hồ sơ của bạn cần được một Staff hoặc Admin khác xét duyệt.</p>}
      {row.status === 'PENDING' && row.applicantId !== user.userId && <section className="service-review-panel"><h2>Quyết định xét duyệt</h2><p className="service-review-intro">Chọn cách xử lý hồ sơ. Nhận xét của bạn sẽ được hiển thị cho người đăng ký.</p><form noValidate onSubmit={review}><fieldset disabled={busy}>
        <fieldset className="service-review-choices" aria-describedby={fieldErrors.decision ? 'service-decision-error' : undefined}><legend>Hướng xử lý <span className="service-required">*</span></legend>
          {reviewChoices.map(({ value, label, description, Icon }, index) => <label key={value} className={`service-review-choice${decision === value ? ' is-selected' : ''}`}>
            <input ref={index === 0 ? decisionInput : undefined} type="radio" name="reviewDecision" value={value} checked={decision === value} aria-invalid={!!fieldErrors.decision} aria-describedby={fieldErrors.decision ? 'service-decision-error' : undefined} onChange={() => { setDecision(value); setFieldErrors({}); }} /><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span>
          </label>)}
        </fieldset>
        {fieldErrors.decision && <p id="service-decision-error" className="service-review-error" role="alert">{fieldErrors.decision}</p>}
        {decision && <>
          {decision !== 'APPROVE' && <label className="service-review-reason"><span>{reasonLabel} <span className="service-required">*</span></span><textarea ref={reasonInput} required minLength={10} maxLength={2000} rows={4} value={reason} aria-invalid={!!fieldErrors.reason} aria-describedby="service-reason-hint" placeholder={decision === 'SUPPLEMENT' ? 'Ví dụ: Bổ sung giấy phép kinh doanh rõ nét và cập nhật khu vực phục vụ cụ thể.' : decision === 'REJECT' ? 'Nêu rõ thông tin hoặc tài liệu không đáp ứng và lý do hồ sơ bị từ chối.' : 'Ghi nhận nội dung và tài liệu đã kiểm tra, căn cứ chấp nhận hồ sơ.'} onChange={e => { setReason(e.target.value); setFieldErrors(previous => ({ ...previous, reason: undefined })); }} /><small id="service-reason-hint" className={fieldErrors.reason ? 'service-review-error' : 'service-review-hint'} role={fieldErrors.reason ? 'alert' : undefined}>{fieldErrors.reason || `${decision === 'SUPPLEMENT' ? 'Nêu rõ phần thông tin cần sửa, tài liệu cần bổ sung. ' : ''}Từ 10 đến 2000 ký tự · Đã nhập: ${reason.trim().length}/2000`}</small></label>}
          <p className="service-review-effect">{decision === 'SUPPLEMENT' ? 'Hồ sơ chuyển sang “Cần bổ sung”. Người đăng ký có thể chỉnh sửa và nộp lại trên cùng hồ sơ.' : decision === 'REJECT' ? 'Hồ sơ bị từ chối và người đăng ký sẽ nhận được lý do bên trên. Các dịch vụ đang công khai được giữ nguyên.' : row.operation === 'DELETE' ? 'Duyệt sẽ ngừng công khai dịch vụ này. Các dịch vụ khác được giữ nguyên.' : row.operation === 'UPDATE' ? 'Thông tin mới sẽ thay thế bản dịch vụ đang công khai sau khi duyệt.' : 'Duyệt sẽ cấp quyền cung cấp dịch vụ và công khai dịch vụ đủ điều kiện.'}</p>
        </>}
        <div className="service-review-actions"><button className={`service-review-submit${decision === 'REJECT' ? ' is-reject' : ''}`} type="submit">{busy ? 'Đang lưu...' : submitLabel}</button></div>
      </fieldset></form></section>}
      {row.requestedChanges && <section><h2>Yêu cầu bổ sung</h2><p className="service-text">{row.requestedChanges}</p><p>Phiên bản {row.revision} · Yêu cầu lúc {time(row.supplementRequestedAt)}</p>{row.resubmittedAt && <><p>Lần nộp lại gần nhất: {time(row.resubmittedAt)}</p><p className="service-text">{row.resubmissionNote}</p></>}</section>}
      {row.reviewedAt && row.status !== 'NEEDS_SUPPLEMENT' && <section role="status"><h2>Kết quả xét duyệt</h2><p>{row.status === 'REJECTED' ? 'Hồ sơ đã bị từ chối.' : row.listingDecision === 'REJECT' ? 'Đã duyệt quyền cung cấp dịch vụ; nội dung dịch vụ chưa được chấp nhận.' : row.operation === 'DELETE' ? 'Đã duyệt yêu cầu xóa dịch vụ.' : row.operation === 'UPDATE' ? 'Đã duyệt cập nhật dịch vụ.' : 'Hồ sơ đã được duyệt.'}</p>{row.reasonNote && <p className="service-text"><strong>{row.status === 'REJECTED' || row.listingDecision === 'REJECT' ? 'Lý do từ chối' : 'Nhận xét xét duyệt'}:</strong><br />{row.reasonNote}</p>}<p>{row.reviewerName} · {time(row.reviewedAt)}</p><p>Nhà cung cấp #{row.providerId} · Quyền hiện tại: {row.capabilityActive ? 'Đang hoạt động' : 'Chưa có / Đã ngừng'}</p><p>{row.serviceId ? `Dịch vụ #${row.serviceId} · ${row.serviceState}` : 'Chưa tạo dịch vụ công khai'}</p>{row.publicEligible && <Link to={`/services/detail?id=${row.serviceId}`}>Xem dịch vụ công khai</Link>}</section>}
      <section><h2>Lịch sử xử lý</h2>{detail.history.map(item => <p key={item.id}>{time(item.time)} · {item.actor} · {item.action}<br />{item.reason}</p>)}</section>
    </>}
  </main>;
}
