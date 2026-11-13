import ServicePrice from '../../components/ServicePrice.jsx';
import Modal from '../../components/common/Modal.jsx';
import { serviceCategoryStyle } from '../../services/service-category.js';
import { serviceAreaText } from '../../services/service-areas.js';
import UIField from '../../components/common/Field.jsx';
import UIButton from '../../components/common/Button.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { serviceFileName } from '../../services/service-form.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { serviceReviewApi as api, validateServiceReview } from '../../services/service-review.js';
import '../../styles/service-applications.css';
import ServiceGallery from '../../components/ServiceGallery.jsx';
import { Download, Eye, ExternalLink, FileText, Image as ImageIcon, LoaderCircle, RefreshCw } from 'lucide-react';

const status = { PENDING: 'Chờ xét duyệt', APPROVED: 'Đã xét duyệt', REJECTED: 'Đã từ chối', NEEDS_SUPPLEMENT: 'Cần bổ sung' };
const statusFilters = ['ALL', 'APPROVED', 'PENDING', 'NEEDS_SUPPLEMENT', 'REJECTED'];
const reviewChoices = [
  { value: 'APPROVE', label: 'Duyệt hồ sơ', description: 'Chấp nhận thông tin và tài liệu.' },
  { value: 'SUPPLEMENT', label: 'Yêu cầu bổ sung', description: 'Trả hồ sơ để người đăng ký hoàn thiện.' },
  { value: 'REJECT', label: 'Từ chối hồ sơ', description: 'Không chấp nhận hồ sơ, kèm lý do.' },
];
const statusBadge = value => <StatusBadge status={value} tone={value === 'NEEDS_SUPPLEMENT' ? 'supplement' : undefined} label={status[value] || value} />;
const labels = { FIXED: 'Giá cố định', FROM: 'Giá từ', NEGOTIABLE: 'Thỏa thuận', CREATE: 'Thêm dịch vụ', UPDATE: 'Cập nhật dịch vụ', DELETE: 'Xóa dịch vụ', CHANGE_REQUESTED: 'Yêu cầu thay đổi', RESUBMITTED: 'Đã nộp lại hồ sơ', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', REQUESTED_SUPPLEMENT: 'Yêu cầu bổ sung', APPROVE: 'Duyệt', REJECT: 'Từ chối', ACTIVE: 'Đang công khai', DELETED: 'Đã ngừng công khai', INACTIVE: 'Ngừng hoạt động' };
const textValue = value => labels[value] || value || '—';
const money = value => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} VNĐ`;
const time = value => {
  if (!value) return '—';
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + '+07:00');
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
};
const comparisonValue = (record, key) => key === 'price' ? (record.pricingType === 'NEGOTIABLE' ? 'Thỏa thuận' : money(record[key]) + (record.priceUnit ? ' / ' + record.priceUnit : '')) : textValue(record[key]);
const historyNote = note => String(note || '').replace(/\b(CREATE|UPDATE|DELETE|FIXED|FROM|NEGOTIABLE|APPROVE|REJECT)\b/g, value => labels[value]).replace(/Capability:/g, 'Quyền cung cấp dịch vụ:').replace(/Listing:/g, 'Nội dung dịch vụ:').replace(/Revision /g, 'Phiên bản ');
function ReviewDocument({ applicationId, doc, onError }) {
  const [file, setFile] = useState(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(false), [previewUrl, setPreviewUrl] = useState('');
  const mime = file?.type || doc.contentType || '';
  const isImage = ['image/png','image/jpeg','image/webp','image/gif'].includes(mime);
  useEffect(() => { if (!preview || !file) return; const url = URL.createObjectURL(file); setPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [preview, file]);
  useEffect(() => {
    let active = true;
    api.file(applicationId, doc.documentId).then(blob => { if (active) setFile(blob); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [applicationId, doc.documentId]);
  async function download() {
    try {
      const blob = file || await api.file(applicationId, doc.documentId);
      setFile(blob); setFailed(false);
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = doc.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { onError(error.message); }
  }
  return <div className="service-document-item"><div className="service-document-name">{isImage ? <ImageIcon size={24} aria-hidden="true" /> : <FileText size={24} aria-hidden="true" />}<div><strong title={doc.name}>{serviceFileName(doc.name)}</strong><small>{file ? `${(file.size / (file.size >= 1048576 ? 1048576 : 1024)).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ${file.size >= 1048576 ? 'MB' : 'KB'}` : failed ? 'Chưa đọc được dung lượng' : 'Đang đọc dung lượng…'}</small></div></div><div className="service-document-actions">{(isImage || mime === 'application/pdf') && <UIButton className="service-app-action" disabled={!file} onClick={() => setPreview(true)} aria-label={'Xem trước ' + doc.name}><Eye size={16} aria-hidden="true" />Xem trước</UIButton>}<UIButton className="service-app-action" aria-label={`Tải xuống ${doc.name}`} onClick={download}><Download size={16} aria-hidden="true" />Tải xuống</UIButton></div>{preview && <Modal title={doc.name} maxWidth="1000px" className="service-file-preview" onClose={() => setPreview(false)}>{previewUrl && (isImage ? <img src={previewUrl} alt={doc.name} /> : <object data={previewUrl} type="application/pdf" aria-label={doc.name}><p>Trình duyệt không hỗ trợ xem PDF. <UIButton onClick={download}>Tải xuống để xem</UIButton></p></object>)}</Modal>}</div>;
}

export default function StaffServiceApplicationsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams(); const selected = params.get('id');
  const activeStatus = statusFilters.includes(params.get('status')) ? params.get('status') : 'ALL';
  const activeSelection = useRef(selected); activeSelection.current = selected;
  const [rows, setRows] = useState([]); const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const pageTop = useRef(null), scrollAfterReview = useRef(false);
  useEffect(() => {
    if (!scrollAfterReview.current) return;
    scrollAfterReview.current = false;
    let parent = pageTop.current?.parentElement;
    while (parent) { if (parent.scrollHeight > parent.clientHeight) parent.scrollTop = 0; parent = parent.parentElement; }
    window.scrollTo({ top: 0, behavior: 'instant' }); pageTop.current?.focus({ preventScroll: true });
  }, [detail]);
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
  const visibleRows = activeStatus === 'ALL' ? rows : rows.filter(item => item.status === activeStatus);
  const listUrl = '/staff/service-applications' + (activeStatus === 'ALL' ? '' : `?status=${activeStatus}`);
  const row = detail?.application;
  const reasonLabel = decision === 'SUPPLEMENT' ? 'Nội dung cần bổ sung' : decision === 'REJECT' ? 'Lý do từ chối' : 'Nhận xét xét duyệt';
  const submitLabel = decision === 'SUPPLEMENT' ? 'Gửi yêu cầu bổ sung' : decision === 'REJECT' ? 'Xác nhận từ chối' : decision === 'APPROVE' ? 'Xác nhận duyệt hồ sơ' : 'Xác nhận quyết định';
  async function mutate(action) {
    if (busy) return;
    setBusy(true); setError('');
    const requested = selected;
    try { const result = await action(); if (activeSelection.current === requested) { scrollAfterReview.current = true; setDetail(result); } window.dispatchEvent(new Event('hlrcs:staff-updated')); }
    catch (err) { if (activeSelection.current === requested) {
      setError(err.message);
      if (err.status === 409) { try { const fresh = await api.detail(requested); if (activeSelection.current === requested) { setDetail(fresh); setDecision(''); setReason(''); setFieldErrors({}); } } catch { /* Reload remains available. */ } }
    } }
    finally { setBusy(false); }
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
    <div className="service-applications-heading"><h1 ref={pageTop} tabIndex={-1}>{selected ? `Hồ sơ dịch vụ #${selected}` : 'Xét duyệt hồ sơ cung cấp dịch vụ'}</h1><UIButton className="service-app-action service-reload-icon" title="Tải lại hồ sơ" aria-label="Tải lại hồ sơ" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={18} aria-hidden="true" /></UIButton></div>
    <p>Nhân viên và quản trị viên đều có thể xem tài liệu và xét duyệt các hồ sơ chờ xử lý.</p>
    {error && <p role="alert" className="service-error">{error}</p>}
    {loading ? <p role="status">Đang tải hồ sơ...</p> : !selected ? <>
      <div className="service-status-filters" role="group" aria-label="Lọc hồ sơ theo trạng thái">
        {statusFilters.map(value => <UIButton type="button" key={value} className={`service-status-filter service-filter-${value.toLowerCase()}${activeStatus === value ? ' is-active' : ''}`} aria-pressed={activeStatus === value} onClick={() => setParams(previous => {
          const next = new URLSearchParams(previous);
          if (value === 'ALL') next.delete('status'); else next.set('status', value);
          return next;
        })}><span>{value === 'ALL' ? 'Tất cả' : status[value]}</span><span className="service-status-count">{value === 'ALL' ? rows.length : rows.filter(item => item.status === value).length}</span></UIButton>)}
      </div>
      {!visibleRows.length && !error && <p role="status">{rows.length ? 'Không có hồ sơ ở trạng thái này.' : 'Chưa có hồ sơ dịch vụ.'}</p>}
      <div className="service-table-wrap"><table><thead><tr><th>Hồ sơ / Dịch vụ</th><th>Người đăng ký</th><th>Người duyệt</th><th>Trạng thái</th><th>Ngày gửi</th><th>Thao tác</th></tr></thead><tbody>{visibleRows.map(row => <tr key={row.registrationId}><td><strong>#{row.registrationId} · {row.serviceName}</strong><span className="service-category-badge" style={serviceCategoryStyle(row.categoryName)}>{row.categoryName}</span></td><td>{row.applicantName}</td><td>{row.reviewerName || 'Chưa xét duyệt'}</td><td>{statusBadge(row.status)}</td><td>{time(row.createdAt)}</td><td><Link className="service-app-action service-app-action-primary" to={`/staff/service-applications?id=${row.registrationId}${activeStatus === 'ALL' ? '' : `&status=${activeStatus}`}`}><Eye size={16} aria-hidden="true" />Xem hồ sơ</Link></td></tr>)}</tbody></table></div>
    </> : row && <>
      <section className="service-application-detail"><header className="service-application-title"><h2>{row.serviceName}</h2><div className="service-application-category"><span>Danh mục đăng ký</span><strong style={serviceCategoryStyle(row.categoryName)}>{row.categoryName || 'Chưa có danh mục'}</strong></div><p className="service-application-meta"><StatusBadge tone="info" label={textValue(row.operation || 'CREATE')} />{statusBadge(row.status)}</p></header>
        {row.resubmissionNote && <div className="service-change-note"><strong>Lý do thay đổi</strong><p className="service-text">{row.resubmissionNote}</p></div>}
        <div className={`service-application-overview${row.hasImage ? '' : ' without-image'}`}>
        {row.hasImage && <ServiceGallery key={row.registrationId + "-" + row.revision} application={row} alt={row.serviceName} />}
        <dl><dt>Người đăng ký</dt><dd>{row.applicantName} (tài khoản #{row.applicantId})</dd><dt>Liên hệ</dt><dd>{row.contactPhone} · {row.contactEmail || 'Không có email'}</dd><dt>Mô tả</dt><dd className="service-text">{row.description}</dd><dt>Khu vực</dt><dd>{serviceAreaText(row)}</dd><dt>Giá</dt><dd><ServicePrice service={row} /></dd><dt>Ngày gửi</dt><dd>{time(row.createdAt)}</dd></dl>
        </div>
        {row.targetServiceId && row.publicEligible && <Link className="service-app-action service-public-compare" to={'/services/detail?id=' + row.targetServiceId} target="_blank"><Eye size={16} aria-hidden="true" />Xem bản đang công khai để đối chiếu</Link>}
        <h3 className="service-documents-heading">Tài liệu xác minh</h3>{!row.documents.length && <p>Hồ sơ không có tài liệu.</p>}<div className="service-review-documents">{row.documents.map(doc => <ReviewDocument key={row.registrationId + '-' + row.revision + '-' + doc.documentId} applicationId={row.registrationId} doc={doc} onError={setError} />)}</div>
      </section>
      {row.operation === 'DELETE' ? <section className="service-delete-banner" role="note"><h2>Đề nghị xóa / ngừng công khai dịch vụ</h2><p>Dịch vụ sẽ ngừng hiển thị công khai sau khi yêu cầu được duyệt. Không có nội dung thay thế để đối chiếu.</p></section> : detail.currentListing && row.operation !== 'CREATE' && <section><h2>Đối chiếu nội dung đề nghị</h2><p>Bản dịch vụ hiện tại: phiên bản {detail.currentListing.revision}. Các ô thay đổi được tô vàng nhạt.</p><div className="service-table-wrap"><table className="service-comparison"><colgroup><col style={{ width: '20%' }} /><col style={{ width: '40%' }} /><col style={{ width: '40%' }} /></colgroup><thead><tr><th>Thông tin</th><th>Hiện tại</th><th>Đề nghị</th></tr></thead><tbody>{[['serviceName','Tên dịch vụ'],['pricingType','Loại giá'],['price','Giá'],['priceUnit','Đơn vị tính'],['description','Mô tả'],['serviceArea','Khu vực chuẩn'],['customServiceAreas','Khu vực khác']].map(([key,label]) => { const before = comparisonValue(detail.currentListing, key), after = comparisonValue(row, key); return <tr key={key}><th scope="row">{label}</th><td className={`service-text${before !== after ? ' is-changed' : ''}`}>{key === 'price' ? <ServicePrice service={detail.currentListing} /> : before}</td><td className={`service-text${before !== after ? ' is-changed' : ''}`}>{key === 'price' ? <ServicePrice service={row} /> : after}</td></tr>; })}</tbody></table></div></section>}
      {row.status === 'PENDING' && row.applicantId === user.userId && <p>Hồ sơ của bạn cần được một nhân viên hoặc quản trị viên khác xét duyệt.</p>}
      {row.status === 'PENDING' && row.applicantId !== user.userId && <section className="service-review-panel"><h2>Quyết định xét duyệt</h2><p className="service-review-intro">Chọn cách xử lý hồ sơ. Nhận xét của bạn sẽ được hiển thị cho người đăng ký.</p><form noValidate onSubmit={review}><fieldset disabled={busy}>
        <fieldset className="service-review-choices" aria-describedby={fieldErrors.decision ? 'service-decision-error' : undefined}><legend>Hướng xử lý <span className="service-required">*</span></legend>
          {reviewChoices.map(({ value, label, description }, index) => <UIField key={value} className={`service-review-choice${decision === value ? ' is-selected' : ''}`}>
            <input ref={index === 0 ? decisionInput : undefined} type="radio" name="reviewDecision" value={value} checked={decision === value} aria-invalid={!!fieldErrors.decision} aria-describedby={fieldErrors.decision ? 'service-decision-error' : undefined} onChange={() => { setDecision(value); setFieldErrors({}); }} /><span><strong>{label}</strong><small>{description}</small></span>
          </UIField>)}
        </fieldset>
        {fieldErrors.decision && <p id="service-decision-error" className="service-review-error" role="alert">{fieldErrors.decision}</p>}
        {decision && <>
          {decision !== 'APPROVE' && <UIField className="service-review-reason"><span>{reasonLabel} <span className="service-required">*</span></span><textarea ref={reasonInput} required minLength={10} maxLength={2000} rows={4} value={reason} aria-invalid={!!fieldErrors.reason} aria-describedby="service-reason-hint" placeholder={decision === 'SUPPLEMENT' ? 'Ví dụ: Bổ sung giấy phép kinh doanh rõ nét và cập nhật khu vực phục vụ cụ thể.' : decision === 'REJECT' ? 'Nêu rõ thông tin hoặc tài liệu không đáp ứng và lý do hồ sơ bị từ chối.' : 'Ghi nhận nội dung và tài liệu đã kiểm tra, căn cứ chấp nhận hồ sơ.'} onChange={e => { setReason(e.target.value); setFieldErrors(previous => ({ ...previous, reason: undefined })); }} /><small id="service-reason-hint" className={fieldErrors.reason ? 'service-review-error' : 'service-review-hint'} role={fieldErrors.reason ? 'alert' : undefined}>{fieldErrors.reason || `${decision === 'SUPPLEMENT' ? 'Nêu rõ phần thông tin cần sửa, tài liệu cần bổ sung. ' : ''}Từ 10 đến 2000 ký tự · Đã nhập: ${reason.trim().length}/2000`}</small></UIField>}
          <p className="service-review-effect">{decision === 'SUPPLEMENT' ? 'Hồ sơ chuyển sang “Cần bổ sung”. Người đăng ký có thể chỉnh sửa và nộp lại trên cùng hồ sơ.' : decision === 'REJECT' ? 'Hồ sơ bị từ chối và người đăng ký sẽ nhận được lý do bên trên. Các dịch vụ đang công khai được giữ nguyên.' : row.operation === 'DELETE' ? 'Duyệt sẽ ngừng công khai dịch vụ này. Các dịch vụ khác được giữ nguyên.' : row.operation === 'UPDATE' ? 'Thông tin mới sẽ thay thế bản dịch vụ đang công khai sau khi duyệt.' : 'Duyệt sẽ cấp quyền cung cấp dịch vụ và công khai dịch vụ đủ điều kiện.'}</p>
        </>}
        <div className="service-review-actions"><UIButton className={`service-review-submit${decision === 'REJECT' ? ' is-reject' : ''}`} type="submit" disabled={busy || Object.keys(validateServiceReview(decision, reason)).length > 0} aria-busy={busy}>{busy && <LoaderCircle className="service-review-spinner" size={16} aria-hidden="true" />}{busy ? 'Đang lưu...' : submitLabel}</UIButton></div>
      </fieldset></form></section>}
      {row.requestedChanges && <section><h2>Yêu cầu bổ sung</h2><p className="service-text">{row.requestedChanges}</p><p>Phiên bản {row.revision} · Yêu cầu lúc {time(row.supplementRequestedAt)}</p>{row.resubmittedAt && <><p>Lần nộp lại gần nhất: {time(row.resubmittedAt)}</p><p className="service-text">{row.resubmissionNote}</p></>}</section>}
      {(row.reviewedAt || row.status === 'NEEDS_SUPPLEMENT') && <section className="service-review-result" role="status">
<h2>Kết quả xét duyệt</h2><div className="service-result-heading">{statusBadge(row.status === 'APPROVED' && row.listingDecision === 'REJECT' ? 'REJECTED' : row.status)}<span>{row.reviewerName || detail.history[0]?.actor || 'Nhân viên xét duyệt'} · {time(row.status === 'NEEDS_SUPPLEMENT' ? row.supplementRequestedAt : row.reviewedAt)}</span></div>
<div className="service-result-note"><strong>Nhận xét</strong><p className="service-text">{(row.status === 'NEEDS_SUPPLEMENT' ? row.requestedChanges : row.reasonNote) || 'Không có nhận xét.'}</p>{row.status === 'APPROVED' && row.listingDecision === 'REJECT' && <p>Đã duyệt quyền cung cấp dịch vụ; nội dung dịch vụ chưa được chấp nhận.</p>}</div>
<dl className="service-result-facts"><dt>Nhà cung cấp <small>#{row.providerId}</small></dt><dd><StatusBadge status={row.capabilityActive ? 'ACTIVE' : 'INACTIVE'} label={row.capabilityActive ? 'Quyền đang hoạt động' : 'Chưa có / Đã ngừng quyền'} /></dd><dt>Dịch vụ {row.serviceId && <small>#{row.serviceId}</small>}</dt><dd><StatusBadge status={row.serviceState || 'DRAFT'} label={row.serviceId ? textValue(row.serviceState) : 'Chưa tạo dịch vụ công khai'} /></dd></dl>
{row.publicEligible && <Link className="service-app-action service-public-link" to={'/services/detail?id=' + row.serviceId} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />Xem dịch vụ công khai</Link>}
</section>}
      <section><h2>Lịch sử xử lý</h2>{!detail.history.length && <p>Chưa có lịch sử xử lý.</p>}<ol className="service-review-timeline">{detail.history.map(item => <li key={item.id}><div><strong>{item.actor || 'Hệ thống'}</strong><span>{textValue(item.action)}</span></div><time>{time(item.time)}</time>{item.reason && <p className="service-text">{historyNote(item.reason)}</p>}</li>)}</ol></section>
    </>}
  </main>;
}
