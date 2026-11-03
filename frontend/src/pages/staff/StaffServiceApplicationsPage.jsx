import {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {ArrowLeft, ArrowRight, BriefcaseBusiness, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, FileCheck2, FileText, FolderOpen, Info, LoaderCircle, MapPin, RotateCcw, Search, ShieldCheck, SlidersHorizontal, UserRound, XCircle, AlertCircle, LockKeyhole} from 'lucide-react';
import {useAuth} from '../../context/AuthContext.jsx';
import {MotionButton, AnimatePresence} from '../../components/motion/MotionUI.jsx';
import Modal from '../../components/common/Modal.jsx';
import {serviceReviewApi as api, validateServiceReview} from '../../services/service-review.js';
import {applicationStatuses, filterServiceApplications, serviceApplicationCounts, serviceApplicationPrice} from '../../services/service-applications-view.js';
import '../../styles/service-applications.css';

const time = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Chưa có thông tin';
const decisionLabel = value => ({APPROVE:'Phê duyệt', REJECT:'Từ chối'})[value] || 'Chưa quyết định';
const pageSize = 8;
function Status({value}) { return <span className={`sa-status ${value?.toLowerCase()}`}><span/>{applicationStatuses[value] || value}</span>; }
function Notice({children, error = false}) {return <div className={`sa-notice${error ? ' is-error' : ''}`} role={error ? 'alert' : undefined}>{error ? <AlertCircle size={18}/> : <Info size={18}/>}<div>{children}</div></div>;}
function PanelHeading({icon: Icon, title, subtitle}) {return <header className="sa-panel-heading"><span><Icon size={19}/></span><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></header>;}

export default function StaffServiceApplicationsPage() {
  const {user} = useAuth();
  const [params, setParams] = useSearchParams(), selected = params.get('id');
  const activeSelection = useRef(selected), mutation = useRef(false);
  activeSelection.current = selected;
  const [rows, setRows] = useState([]), [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [revision, setRevision] = useState(0), [downloadId, setDownloadId] = useState(null);
  const [capability, setCapability] = useState(''), [listing, setListing] = useState(''), [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState(null), [saved, setSaved] = useState(false);
  const filters = {q:params.get('q') || '', status:params.get('status') || 'ALL', category:params.get('category') || '', sort:params.get('sort') || 'OLDEST'};
  const visible = useMemo(() => filterServiceApplications(rows, filters), [rows, filters.q, filters.status, filters.category, filters.sort]);
  const counts = useMemo(() => serviceApplicationCounts(rows), [rows]);
  const categories = useMemo(() => [...new Set(rows.map(row => row.categoryName).filter(Boolean))].sort((a,b) => a.localeCompare(b,'vi')), [rows]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(params.get('page'),10) || 1));
  const listParams = new URLSearchParams(params); listParams.delete('id');
  const listUrl = `/staff/service-applications${listParams.size ? `?${listParams}` : ''}`;
  const detailUrl = id => {const query = new URLSearchParams(listParams); query.set('id',id); return `/staff/service-applications?${query}`;};
  function filter(key,value) {const next = new URLSearchParams(params); value ? next.set(key,value) : next.delete(key); if(key !== 'page') next.delete('page'); setParams(next, {replace:key === 'q'});}
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setDetail(null); setConfirmation(null); setSaved(false);
    setCapability(''); setListing(''); setReason('');
    (selected ? api.detail(selected, controller.signal) : api.list(controller.signal))
      .then(data => {if (!controller.signal.aborted) selected ? setDetail(data) : setRows(data);})
      .catch(err => {if (!controller.signal.aborted) setError(err.message);})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [selected, user.userId, revision]);
  const row = detail?.application;
  async function saveDecision() {
    if (mutation.current || !confirmation) return;
    mutation.current = true; setBusy(true); setError('');
    const requested = selected;
    try {
      const result = await api.review(requested, confirmation.capability, confirmation.listing, confirmation.reason);
      if (activeSelection.current === requested) {setDetail(result); setConfirmation(null); setSaved(true);}
      window.dispatchEvent(new Event('hlrcs:staff-updated'));
    } catch(err) {if(activeSelection.current === requested) setError(err.message);}
    finally {mutation.current = false; setBusy(false);}
  }
  function review(event) {
    event.preventDefault();
    const failure = validateServiceReview(capability, listing, reason);
    setError(failure);
    if(failure) {document.getElementById(!capability ? 'sa-capability' : !listing ? 'sa-listing' : 'sa-reason')?.focus(); return;}
    setConfirmation({capability, listing, reason:reason.trim()});
  }
  async function download(doc) {
    if(downloadId) return;
    setDownloadId(doc.documentId); setError('');
    const requested = selected;
    try {
      const blob = await api.file(requested, doc.documentId), url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = doc.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(err) {if(activeSelection.current === requested) setError(err.message);}
    finally {setDownloadId(null);}
  }
  const ready = !loading && !error;
  return <div className="service-applications sa-page">
    {selected && <div className="sa-detail-top"><Link className="sa-back" to={listUrl}><ArrowLeft size={16}/>Danh sách hồ sơ</Link>{row && <div><span className="sa-id">DV-{row.registrationId}</span><Status value={row.status}/></div>}</div>}
    {error && !confirmation && <Notice error>{error}{!row && <MotionButton className="sa-inline-button" onClick={() => setRevision(v => v+1)}>Thử lại<RotateCcw size={14}/></MotionButton>}</Notice>}
    {!selected && <>
      <div className="sa-metrics">{[
        ['ALL','Tổng hồ sơ','Toàn bộ hồ sơ đã gửi',FolderOpen,'slate'],
        ['PENDING','Chờ xét duyệt','Cần kiểm tra & quyết định',Clock3,'amber'],
        ['APPROVED','Đã cấp quyền','Đã duyệt quyền cung cấp',ShieldCheck,'teal'],
        ['REJECTED','Đã từ chối','Đã ghi nhận lý do',XCircle,'rose'],
      ].map(([key,label,hint,Icon,tone]) => <MotionButton key={key} className={`sa-metric ${tone}${filters.status === key ? ' is-selected' : ''}`} aria-pressed={filters.status === key} onClick={() => filter('status',key)} disabled={!ready}><div><span>{label}</span><Icon size={19}/></div><strong>{ready ? counts[key] : '—'}</strong><small>{hint}<ArrowRight size={13}/></small></MotionButton>)}</div>
      <section className="sa-queue">
        <header className="sa-queue-heading"><div><span className="sa-heading-icon"><BriefcaseBusiness size={20}/></span><div><h2>Danh sách hồ sơ</h2><p>Lọc hồ sơ chờ xét duyệt để ưu tiên xử lý.</p></div></div><span className="sa-count-label">{ready ? `${visible.length} hồ sơ phù hợp` : 'Đang cập nhật'}</span></header>
        <div className="sa-filters"><label className="sa-search"><Search size={17}/><input aria-label="Tìm hồ sơ dịch vụ" placeholder="Tìm mã hồ sơ, dịch vụ, người đăng ký, số điện thoại..." value={filters.q} onChange={e => filter('q',e.target.value)}/></label><label className="sa-select"><span>Danh mục</span><select aria-label="Danh mục dịch vụ" value={filters.category} onChange={e => filter('category',e.target.value)}><option value="">Tất cả danh mục</option>{categories.map(name => <option key={name}>{name}</option>)}</select></label><label className="sa-select"><span>Sắp xếp</span><select aria-label="Sắp xếp hồ sơ" value={filters.sort} onChange={e => filter('sort',e.target.value)}><option value="OLDEST">Cũ nhất trước</option><option value="NEWEST">Mới nhất trước</option></select></label></div>
        <div className="sa-tabs" aria-label="Lọc trạng thái hồ sơ">{[['ALL','Tất cả'],...Object.entries(applicationStatuses)].map(([key,label]) => <MotionButton key={key} type="button" aria-pressed={filters.status === key} className={filters.status === key ? 'active' : ''} onClick={() => filter('status',key)}>{label}<span>{ready ? counts[key] : '—'}</span></MotionButton>)}</div>
        {loading ? <div className="sa-empty" role="status"><LoaderCircle className="spin" size={29}/><h3>Đang tải danh sách hồ sơ</h3><p>Thông tin đang được cập nhật từ hệ thống.</p></div> : !error && <>
          {!visible.length ? <div className="sa-empty"><FolderOpen size={35}/><h3>{rows.length ? 'Không tìm thấy hồ sơ phù hợp' : 'Chưa có hồ sơ dịch vụ'}</h3><p>{rows.length ? 'Thử thay đổi từ khóa, danh mục hoặc trạng thái xét duyệt.' : 'Hồ sơ đăng ký mới sẽ xuất hiện tại đây để bạn kiểm tra và xử lý.'}</p>{rows.length > 0 && <MotionButton className="sa-button sa-secondary" onClick={() => setParams({})}><SlidersHorizontal size={15}/>Xóa bộ lọc</MotionButton>}</div> : <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th scope="col">Dịch vụ / Hồ sơ</th><th scope="col">Người đăng ký</th><th scope="col">Ngày gửi</th><th scope="col">Trạng thái</th><th scope="col">Người xét duyệt</th><th scope="col"><span className="sa-sr-only">Thao tác</span></th></tr></thead><tbody>{visible.slice((page-1)*pageSize,page*pageSize).map(item => <tr key={item.registrationId}>
            <td><div className="sa-service-cell"><span className="sa-service-icon"><BriefcaseBusiness size={20}/></span><div><Link className="sa-service-title" to={detailUrl(item.registrationId)}>{item.serviceName}</Link><div className="sa-row-meta"><span className="sa-id">DV-{item.registrationId}</span><span>{item.categoryName || 'Chưa có danh mục'}</span></div><small><FileText size={12}/>{item.documents.length} tài liệu{item.serviceArea && <><span>·</span>{item.serviceArea}</>}</small></div></div></td>
            <td><strong>{item.applicantName || 'Chưa có tên'}</strong><small>{item.contactPhone || item.contactEmail || 'Chưa có liên hệ'}</small></td><td><time dateTime={item.createdAt}>{time(item.createdAt)}</time></td><td><Status value={item.status}/></td><td>{item.reviewerName || <span className="sa-muted">Chưa xét duyệt</span>}</td><td><Link className="sa-view-link" aria-label={`Xem hồ sơ DV-${item.registrationId}`} to={detailUrl(item.registrationId)}>Xem hồ sơ<ArrowRight size={14}/></Link></td>
          </tr>)}</tbody></table></div>}
          <footer className="sa-pagination"><span>{visible.length ? `Hiển thị ${(page-1)*pageSize+1}–${Math.min(page*pageSize,visible.length)} / ${visible.length} hồ sơ` : '0 hồ sơ'}</span><div><MotionButton aria-label="Trang trước" disabled={page === 1} onClick={() => filter('page',String(page-1))}><ChevronLeft size={16}/></MotionButton><span>{page} / {totalPages}</span><MotionButton aria-label="Trang sau" disabled={page === totalPages} onClick={() => filter('page',String(page+1))}><ChevronRight size={16}/></MotionButton></div></footer>
        </>}
      </section><div className="sa-bottom-note"><LockKeyhole size={15}/>Tài liệu hồ sơ chỉ phục vụ thẩm định nội bộ. Quyền cung cấp và nội dung công khai được xét duyệt riêng.</div>
    </>}
    {selected && (loading ? <div className="sa-empty sa-panel" role="status"><LoaderCircle className="spin" size={30}/><h3>Đang tải hồ sơ</h3></div> : row && <>
      {saved && <div className="sa-saved" role="status"><CheckCircle2 size={19}/>Đã lưu quyết định xét duyệt. Kết quả hồ sơ đã được cập nhật.</div>}
      <div className="sa-detail-layout"><div className="sa-detail-main">
        <section className="sa-panel"><PanelHeading icon={BriefcaseBusiness} title="Thông tin dịch vụ" subtitle="Nội dung do người đăng ký cung cấp"/><span className="sa-category">{row.categoryName || 'Chưa có danh mục'}</span><h2 className="sa-detail-title">{row.serviceName}</h2><div className="sa-fact-strip"><div><span>Giá đăng ký</span><strong>{serviceApplicationPrice(row)}</strong></div><div><span><MapPin size={13}/>Khu vực phục vụ</span><strong>{row.serviceArea || 'Chưa có thông tin'}</strong></div></div><h3 className="sa-label">MÔ TẢ DỊCH VỤ</h3><p className="sa-description">{row.description || 'Chưa có mô tả.'}</p></section>
        <section className="sa-panel"><PanelHeading icon={UserRound} title="Người đăng ký & liên hệ"/><div className="sa-applicant"><span>{(row.applicantName || '?').trim().charAt(0).toLocaleUpperCase('vi')}</span><div><h3>{row.applicantName}</h3><small>Tài khoản #{row.applicantId}</small></div></div><dl className="sa-info-grid"><div><dt>Số điện thoại</dt><dd>{row.contactPhone || 'Chưa có thông tin'}</dd></div><div><dt>Email liên hệ</dt><dd>{row.contactEmail || 'Không cung cấp'}</dd></div><div><dt>Ngày gửi hồ sơ</dt><dd>{time(row.createdAt)}</dd></div><div><dt>Mã hồ sơ</dt><dd>DV-{row.registrationId}</dd></div></dl></section>
        <section className="sa-panel"><PanelHeading icon={FileCheck2} title="Tài liệu xác minh" subtitle={`${row.documents.length} tài liệu đã được gửi kèm hồ sơ`}/><Notice><strong>Bảo mật tài liệu</strong><p>Chỉ sử dụng giấy tờ để đối chiếu và thẩm định. Tài liệu không hiển thị trong danh sách dịch vụ công khai.</p></Notice><div className="sa-document-list">{row.documents.map(doc => <div className="sa-document" key={doc.documentId}><span><FileText size={22}/></span><div><strong>{doc.name}</strong><small>Tài liệu do người đăng ký gửi</small></div><MotionButton className="sa-button sa-secondary" disabled={!!downloadId} aria-label={`Tải tài liệu ${doc.name}`} onClick={() => download(doc)}>{downloadId === doc.documentId ? <LoaderCircle className="spin" size={16}/> : <Download size={16}/>}Tải xuống</MotionButton></div>)}{!row.documents.length && <p className="sa-muted">Hồ sơ chưa có tài liệu đính kèm.</p>}</div></section>
        <section className="sa-panel"><PanelHeading icon={Clock3} title="Lịch sử xử lý"/><ol className="sa-history">{detail.history.map(item => <li key={item.id}><span/><div><strong>{({SUBMITTED:'Đã gửi hồ sơ',APPROVED:'Đã phê duyệt quyền cung cấp',REJECTED:'Đã từ chối',NEEDS_SUPPLEMENT:'Yêu cầu bổ sung'})[item.action] || item.action}</strong><p>{item.actor} · {time(item.time)}</p>{item.reason && <blockquote>{item.reason}</blockquote>}</div></li>)}</ol>{!detail.history.length && <p className="sa-muted">Chưa có lịch sử xử lý.</p>}</section>
      </div><aside className="sa-decision-column"><section className="sa-panel sa-decision"><PanelHeading icon={ShieldCheck} title={row.reviewedAt ? 'Kết quả thẩm định' : 'Quyết định thẩm định'}/><div className="sa-state-row"><span>Trạng thái hồ sơ</span><Status value={row.status}/></div>
        {row.status === 'PENDING' && row.applicantId !== user.userId && <form onSubmit={review} noValidate><fieldset disabled={busy}>
          <label htmlFor="sa-capability">1. Quyền cung cấp dịch vụ <span>*</span></label><p className="sa-field-hint">Cho phép tài khoản trở thành nhà cung cấp.</p><select id="sa-capability" required value={capability} onChange={e => {setCapability(e.target.value); if(e.target.value === 'REJECT') setListing('REJECT'); setError('');}}><option value="">Chọn quyết định</option><option value="APPROVE">Cấp quyền cung cấp dịch vụ</option><option value="REJECT">Từ chối cấp quyền</option></select>
          <label htmlFor="sa-listing">2. Nội dung dịch vụ đầu tiên <span>*</span></label><p className="sa-field-hint">Chỉ công khai khi tài khoản đã được cấp quyền.</p><select id="sa-listing" required value={listing} onChange={e => {setListing(e.target.value); setError('');}}><option value="">Chọn quyết định</option><option value="APPROVE" disabled={capability !== 'APPROVE'}>Duyệt và công khai dịch vụ</option><option value="REJECT">Từ chối công khai</option></select>
          <label htmlFor="sa-reason">3. Nhận xét / Lý do xét duyệt <span>*</span></label><textarea id="sa-reason" required minLength={10} maxLength={2000} rows={5} value={reason} onChange={e => {setReason(e.target.value); setError('');}} placeholder="Ghi rõ căn cứ kiểm tra và lý do cho từng quyết định..."/><div className="sa-reason-hint"><span>Từ 10 đến 2.000 ký tự</span><span>{reason.length}/2.000</span></div><Notice>Quyết định có hiệu lực sau khi xác nhận lưu và không thể xét duyệt lại hồ sơ này.</Notice><MotionButton className="sa-button sa-primary sa-full" type="submit"><Check size={17}/>Kiểm tra & lưu quyết định</MotionButton>
        </fieldset></form>}
        {row.status === 'PENDING' && row.applicantId === user.userId && <Notice>Hồ sơ của bạn cần được một Staff hoặc Admin khác xét duyệt.</Notice>}
        {row.status === 'NEEDS_SUPPLEMENT' && <Notice>Hồ sơ đang cần bổ sung. Chưa thể ra quyết định xét duyệt ở trạng thái này.</Notice>}
        {row.reviewedAt && <div className="sa-review-result"><dl className="sa-result-facts"><dt>Quyền cung cấp</dt><dd>{decisionLabel(row.capabilityDecision)}</dd><dt>Nội dung công khai</dt><dd>{decisionLabel(row.listingDecision)}</dd><dt>Người xét duyệt</dt><dd>{row.reviewerName || 'Chưa có thông tin'}</dd><dt>Ngày xử lý</dt><dd>{time(row.reviewedAt)}</dd><dt>Quyền hiện tại</dt><dd>{row.capabilityActive ? 'Đang hoạt động' : 'Chưa có / Đã ngừng'}</dd>{row.providerId && <><dt>Nhà cung cấp</dt><dd>#{row.providerId}</dd></>}{row.serviceId && <><dt>Dịch vụ</dt><dd>#{row.serviceId} · {row.serviceState}</dd></>}</dl><h3>Nhận xét xét duyệt</h3><p className="sa-description">{row.reasonNote || 'Không có nhận xét.'}</p>{row.publicEligible ? <Link className="sa-button sa-primary sa-full" to={`/services/detail?id=${row.serviceId}`}>Xem dịch vụ công khai<ArrowRight size={16}/></Link> : <Notice>Dịch vụ chưa đủ điều kiện hiển thị công khai.</Notice>}</div>}
      </section><div className="sa-help"><ShieldCheck size={19}/><p><strong>Hai quyết định độc lập</strong>Cấp quyền cho người cung cấp không đồng nghĩa nội dung dịch vụ được công khai. Hãy kiểm tra cả hai trước khi lưu.</p></div></aside></div>
    </>)}
    <AnimatePresence>{confirmation && <Modal title="Xác nhận quyết định xét duyệt" className="sa-confirm-modal" maxWidth="580px" closeOnEscape={!busy} closeOnBackdrop={false} onClose={() => {if(!busy) setConfirmation(null);}} footer={<div className="sa-confirm-footer"><MotionButton className="sa-button sa-secondary" disabled={busy} onClick={() => setConfirmation(null)}>Quay lại chỉnh sửa</MotionButton><MotionButton className={`sa-button ${confirmation.capability === 'REJECT' ? 'sa-danger' : 'sa-primary'}`} disabled={busy} onClick={saveDecision}>{busy ? <LoaderCircle className="spin" size={16}/> : <Check size={16}/>} {busy ? 'Đang lưu...' : 'Xác nhận lưu quyết định'}</MotionButton></div>}><div className="sa-confirm-content"><span className="sa-id">DV-{row?.registrationId}</span><h2>{row?.serviceName}</h2><dl><dt>Quyền cung cấp dịch vụ</dt><dd>{decisionLabel(confirmation.capability)}</dd><dt>Nội dung dịch vụ</dt><dd>{confirmation.listing === 'APPROVE' ? 'Duyệt & công khai' : 'Từ chối công khai'}</dd></dl><h3>Nhận xét gửi người đăng ký</h3><p className="sa-description">{confirmation.reason}</p><Notice>Quyết định được áp dụng ngay khi lưu thành công. Hồ sơ đã xử lý không thể xét duyệt lại.</Notice>{error && <Notice error>{error}</Notice>}</div></Modal>}</AnimatePresence>
  </div>;
}
