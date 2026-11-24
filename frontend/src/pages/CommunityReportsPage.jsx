import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Download, EyeOff, FileText, Flag, Inbox, ShieldCheck, Clock3, Layers3, ShieldAlert, Copy, FileWarning, MessageSquare, ListFilter, Check } from 'lucide-react';
import { Modal, StateView, useToast } from '../components/PortalUI.jsx';
import { communityReportsApi, reportPage, reportReasons, reportStatuses } from '../services/community-reports.js';
import CommunityFeedCard from '../components/CommunityFeedCard.jsx';
import CommunityPostFooter from '../components/CommunityPostFooter.jsx';
import CommunityReportAiPanel from '../components/CommunityReportAiPanel.jsx';
import useCommunityLive from '../components/useCommunityLive.js';
// Route chunks must include their own shared styles when opened directly.
import '../styles/admin-dashboard.css';
import '../styles/community-feed.css';
import '../styles/community-prototype-integration.css';
import '../styles/community-reports.css';

const adminPath = '/admin/community/reports';

const queueFilters = { ALL: 'Tất cả', OPEN: reportStatuses.OPEN, RESOLVED: reportStatuses.RESOLVED, DISMISSED: reportStatuses.DISMISSED };
const statusIcons = { ALL: Layers3, OPEN: Clock3, RESOLVED: ShieldCheck, DISMISSED: Inbox };
const reasonOptions = {
  ALL: ['Tất cả lý do', ListFilter], FRAUD: ['Lừa đảo', ShieldAlert], SPAM: ['Spam / đăng trùng', Copy],
  INAPPROPRIATE: ['Không phù hợp', EyeOff], MISLEADING: ['Sai thông tin', FileWarning], OTHER: ['Lý do khác', MessageSquare], LEGACY: ['Báo cáo cũ', FileText],
};
const reasonLabel = report => reportReasons[report.reasonCode] || 'Báo cáo cũ';
const legacyReason = 'LEGACY';
const reasonKey = report => Object.hasOwn(reportReasons, report.reasonCode) ? report.reasonCode : legacyReason;
const reportTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const reportDay = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const decisions = [
  { value: 'DISMISS', label: 'Giữ bài viết', detail: 'Đóng mọi báo cáo đang chờ và giữ nguyên trạng thái bài viết.', icon: ShieldCheck },
  { value: 'HIDE_POST', label: 'Ẩn bài viết', detail: 'Gỡ bài khỏi Cộng đồng công khai và đóng mọi báo cáo đang mở về bài này.', icon: EyeOff },
];
const decisionReasons = {
  DISMISS: [
    'Nội dung bài viết phù hợp với quy định cộng đồng.',
    'Thông tin trong bài đã được kiểm tra và xác nhận là chính xác.',
    'Thông tin và bằng chứng hiện có chưa đủ để xác định vi phạm.',
    'Bài viết đã được cập nhật để khắc phục vấn đề được báo cáo.',
  ],
  HIDE_POST: [
    'Bài viết có dấu hiệu lừa đảo.',
    'Bài viết là nội dung spam hoặc đăng trùng.',
    'Bài viết chứa nội dung không phù hợp với quy định cộng đồng.',
    'Bài viết chứa thông tin sai lệch hoặc gây hiểu nhầm.',
  ],
};
const customDecisionReason = 'CUSTOM';

function ReportEvidence({ id }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    communityReportsApi.evidence(id, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setState({ url: objectUrl, extension: blob.type === 'image/png' ? 'png' : 'jpg' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ error: error.message });
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  if (state.loading) return <p role="status">Đang tải ảnh bằng chứng…</p>;
  if (state.error) return <p role="alert">{state.error}</p>;
  return <>
    <img className="community-report-evidence" src={state.url} alt="Ảnh bằng chứng do người báo cáo gửi" />
    <a className="p-button" href={state.url} download={`bao-cao-${id}.${state.extension}`}><Download size={16} aria-hidden="true" />Tải ảnh bằng chứng</a>
  </>;
}

function ReportStatus({ status }) {
  return <span className={`report-status${status === 'OPEN' ? ' is-open' : status === 'RESOLVED' ? ' is-resolved' : ''}`}>{reportStatuses[status]}</span>;
}

function AdminReportTime({ value }) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? <time dateTime={value}>{reportTime.format(date)} · {reportDay.format(date)}</time> : '—';
}

function AdminReportQueue({ data, status, reportUrl, onReset }) {
  return <section className="ad-panel report-queue" aria-labelledby="report-queue-title">
    <header className="report-queue-heading">
      <h2 id="report-queue-title">Bài viết được báo cáo</h2>
      <span role="status">{data.totalElements.toLocaleString('vi-VN')} bài viết</span>
    </header>
    {data.content.length ? <>
      <div className="report-queue-grid report-queue-columns" aria-hidden="true">
        <span>Bài viết</span><span>Báo cáo gần nhất</span><span>Tình trạng báo cáo</span><span>Thao tác</span>
      </div>
      <ul className="report-queue-list">
        {data.content.map(row => <li key={row.postId} className="report-queue-grid report-queue-row">
          <div className="report-queue-post">
            <span className="report-panel-icon"><FileText size={18} aria-hidden="true" /></span>
            <div><strong>{row.postTitle || `Bài viết #${row.postId}`}</strong><small>{row.reportCount} báo cáo</small></div>
          </div>
          <div className="report-queue-date"><small>Báo cáo gần nhất</small><AdminReportTime value={row.latestAt} /></div>
          <div>{row.openCount > 0 ? <span className="report-status is-open">{row.openCount} chờ xử lý</span>
            : <span className="report-status">Đã đóng tất cả</span>}</div>
          <Link className={`p-button report-queue-link${row.openCount > 0 ? ' is-open' : ''}`} to={reportUrl(row.selectedReportId)}
            aria-label={`Xem chi tiết báo cáo của bài #${row.postId}`}>
            Xem chi tiết<ArrowRight size={16} aria-hidden="true" />
          </Link>
        </li>)}
      </ul>
    </> : <div className="report-queue-empty">
      <span className="report-panel-icon"><Inbox size={23} aria-hidden="true" /></span>
      <h3>{status === 'OPEN' && data.totalElements === 0 ? 'Chưa có báo cáo chờ xử lý' : 'Không có báo cáo ở trang này'}</h3>
      {status !== 'ALL' && <button type="button" className="p-button" onClick={onReset}>Xem tất cả báo cáo</button>}
    </div>}
  </section>;
}

function AdminReportDetail({ data, onRefresh, selected, reportUrl, reasonFilter, onReasonFilterChange }) {
  const notify = useToast();
  const { report, post } = data;
  const [action, setAction] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [note, setNote] = useState('');
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canHide = post?.status === 'APPROVED';
  const openReports = data.relatedReports.filter(item => item.status === 'OPEN');
  const reasonCounts = new Map();
  for (const item of data.relatedReports) {
    const key = reasonKey(item);
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  const filteredReports = reasonFilter === 'ALL' ? data.relatedReports
    : data.relatedReports.filter(item => reasonKey(item) === reasonFilter);
  const showSelected = selected && (reasonFilter === 'ALL' || reasonKey(report) === reasonFilter);
  const chosenAction = action === 'HIDE_POST' && !canHide ? '' : action;

  async function submit(event) {
    event.preventDefault();
    if (busy || !chosenAction || !openReports.length) return;
    const resolutionReason = selectedReason === customDecisionReason ? note.trim() : selectedReason;
    if (!resolutionReason) {
      setError({ message: 'Vui lòng chọn hoặc nhập lý do xử lý.' });
      return;
    }
    setBusy(true);
    setError('');
    try {
      await communityReportsApi.resolve(openReports[0].id, chosenAction, resolutionReason);
      onRefresh();
      notify('Đã lưu quyết định cho bài viết và đóng các báo cáo đang chờ.');
    } catch (err) {
      setError({ message: err.fields?.reason || err.message, conflict: err.status === 409 });
    } finally {
      setBusy(false);
    }
  }

  function closeDecision() {
    if (!busy) setDecisionOpen(false);
  }

  return <div className="report-detail-grid">
    {openReports.length > 0 && <button type="button" className="p-button primary report-save report-decision-shortcut"
      aria-haspopup="dialog" onClick={() => setDecisionOpen(true)}>
      <ShieldCheck size={16} aria-hidden="true" />Ra quyết định
    </button>}
    <div className="prototype-community report-post-preview">
      {post ? <CommunityFeedCard post={post} showStatus>
        <CommunityPostFooter post={post} preview />
      </CommunityFeedCard> : <section className="ad-panel community-report-panel">
        <h2>Bài viết #{report.postId}</h2>
        <p>{report.postTitle && <strong>{report.postTitle}. </strong>}Bài viết đã bị xóa.</p>
      </section>}
    </div>
    <section className="ad-panel report-detail-sidebar" aria-labelledby="related-reports-title">
      <header className="report-sidebar-header">
        <h2 id="related-reports-title"><Flag size={19} aria-hidden="true" />Các lượt báo cáo ({data.relatedReports.length})</h2>
        {openReports.length > 0 && <button type="button" className="p-button primary report-save" aria-haspopup="dialog"
          onClick={() => setDecisionOpen(true)}>
          <ShieldCheck size={16} aria-hidden="true" />Ra quyết định
        </button>}
      </header>
      <div className="report-sidebar-content">
        <CommunityReportAiPanel key={report.postId} reportId={report.id} postId={report.postId} />
        <div className="report-reason-control">
          <div className="report-filter-title"><h3><ListFilter size={16} aria-hidden="true" />Loại báo cáo</h3>
            <span>{openReports.length} chờ · {data.relatedReports.length-openReports.length} đã đóng</span></div>
          <div className="report-reason-chips" role="group" aria-label="Lọc theo lý do báo cáo">
            {Object.entries(reasonOptions).filter(([code]) => code !== legacyReason || reasonCounts.has(legacyReason) || reasonFilter === legacyReason).map(([code,[label,Icon]]) => {
              const count=code==='ALL'?data.relatedReports.length:reasonCounts.get(code)??0;
              return <button className="report-reason-chip" type="button" key={code} data-reason={code} aria-pressed={reasonFilter===code}
                disabled={!count&&reasonFilter!==code} onClick={()=>onReasonFilterChange(code)}
                aria-label={`${reportReasons[code]||label}, ${count} lượt báo cáo`}>
                <Icon size={16} aria-hidden="true" /><span>{label}</span><strong>{count}</strong>
                {reasonFilter===code&&<Check className="report-filter-selected" size={14} aria-hidden="true" />}
              </button>;
            })}
          </div>
          <p className="report-filter-result" role="status">Hiển thị <strong>{filteredReports.length}/{data.relatedReports.length}</strong> lượt báo cáo.
            <span> Quyết định vẫn áp dụng cho toàn bộ báo cáo đang chờ.</span></p>
        </div>
        {filteredReports.length > 0 ? <ul className="report-related-list">
          {filteredReports.map(item => <li key={item.id}>
            <Link to={reportUrl(item.id, true)} aria-current={showSelected && item.id === report.id ? 'page' : undefined}>
              <div><strong>#{item.id} · {reasonLabel(item)}</strong>
                <small>{item.reporter} · <AdminReportTime value={item.createdAt} /></small></div>
              <ReportStatus status={item.status} />
            </Link>
          </li>)}
        </ul> : <p className="report-reason-empty">Không có báo cáo thuộc lý do này.</p>}
        {showSelected && (
          <section className="report-selected" aria-labelledby="report-selected-title">
            <h3 id="report-selected-title">Thông tin báo cáo #{report.id}</h3>
            <dl className="report-detail-meta">
              <div><dt>Người gửi</dt><dd>{report.reporter}</dd></div>
              <div><dt>Thời điểm gửi</dt><dd><AdminReportTime value={report.createdAt} /></dd></div>
            </dl>
            <div className="report-reason-box">
              <h3>{reasonLabel(report)}</h3>
              {data.details && <p className="community-report-description">{data.details}</p>}
            </div>
            <div className="report-evidence-block">
              <h3>Ảnh bằng chứng</h3>
              {data.hasEvidence ? <ReportEvidence key={report.id} id={report.id} /> : <p>Người gửi chưa đính kèm ảnh.</p>}
            </div>
            {report.status !== 'OPEN' && <dl>
              <div><dt>Người xử lý</dt><dd>{data.handler || '—'}</dd></div>
              <div><dt>Thời điểm xử lý</dt><dd><AdminReportTime value={data.resolvedAt} /></dd></div>
              <div><dt>Lý do xử lý</dt><dd className="community-report-description">{data.resolutionNote || '—'}</dd></div>
            </dl>}
          </section>
        )}
      </div>
    </section>
    {decisionOpen && openReports.length > 0 && (
      <Modal title="Quyết định cho bài viết" onClose={closeDecision} className="report-decision-dialog">
        <p>Quyết định áp dụng cho {openReports.length} báo cáo đang chờ.</p>
        <form className="community-report-form" onSubmit={submit} aria-busy={busy}>
          <fieldset className="report-decision-options" disabled={busy}>
            <legend>Chọn hành động</legend>
            {decisions.filter(option => canHide || option.value !== 'HIDE_POST').map(({ value, label, detail, icon: Icon }) => (
              <label className="report-decision-option" key={value}>
                <input type="radio" name="report-action" value={value} checked={chosenAction === value} required
                  aria-labelledby={`report-action-${value}`} aria-describedby={`report-description-${value}`}
                  onChange={() => { setAction(value); setSelectedReason(''); setNote(''); setError(''); }} />
                <span><strong id={`report-action-${value}`}><Icon size={16} aria-hidden="true" />{label}</strong>
                  <small id={`report-description-${value}`}>{detail}</small></span>
              </label>
            ))}
          </fieldset>
          {!canHide && <small>Chỉ có thể ẩn bài đang hiển thị công khai. Bạn vẫn có thể đóng các báo cáo đang chờ.</small>}
          <label htmlFor="community-report-decision-reason">Lý do xử lý (bắt buộc)</label>
          <select id="community-report-decision-reason" value={selectedReason} required disabled={busy || !chosenAction}
            onChange={event => { setSelectedReason(event.target.value); setError(''); }}>
            <option value="">{chosenAction ? 'Chọn lý do xử lý' : 'Chọn hành động trước'}</option>
            {decisionReasons[chosenAction]?.map(reason => <option key={reason} value={reason}>{reason}</option>)}
            {chosenAction && <option value={customDecisionReason}>Lý do khác</option>}
          </select>
          {selectedReason === customDecisionReason && <>
            <label htmlFor="community-report-decision-note">Nhập lý do khác (bắt buộc)</label>
            <textarea id="community-report-decision-note" rows={3} value={note} maxLength={1000} required
              onChange={event => { setNote(event.target.value); setError(''); }} disabled={busy}
              placeholder="Ghi căn cứ cho quyết định của bạn…" />
          </>}
          {error && <div role="alert" className="portal-form-alert">
            <p>{error.message}</p>{error.conflict && <button type="button" className="p-button" onClick={onRefresh}>Tải lại báo cáo</button>}
          </div>}
          <button type="submit" className={`p-button primary report-save${chosenAction === 'HIDE_POST' ? ' is-danger' : ''}`} disabled={busy}>
            {busy ? 'Đang lưu…' : chosenAction === 'HIDE_POST' ? 'Ẩn bài và đóng báo cáo' : 'Lưu quyết định cho bài viết'}
          </button>
        </form>
      </Modal>
    )}
  </div>;
}

export default function CommunityReportsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') === 'ALL' || Object.hasOwn(reportStatuses, params.get('status')) ? params.get('status') : 'OPEN';
  const page = reportPage(params.get('page'));
  const id = reportPage(params.get('id'));
  const selected = id > 0 && params.get('review') === '1';
  const reason = params.get('reason');
  const reasonFilter = reason === legacyReason || Object.hasOwn(reportReasons, reason) ? reason : 'ALL';
  const base = adminPath;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({});
  const [stats, setStats] = useState(null);
  const requestKey = `${id}:${status}:${page}:${revision}`;
  const dataScope = `${id}:${status}:${page}`;
  useCommunityLive('reports,posts', () => setRevision(value => value + 1));

  useEffect(() => {
    const controller = new AbortController();
    const load = id ? communityReportsApi.detail(id, controller.signal)
      : Promise.all([communityReportsApi.queue(status, page, controller.signal), communityReportsApi.stats(controller.signal)])
          .then(([queue, counts]) => { if (!controller.signal.aborted) setStats(counts); return queue; });
    load.then(data => {
      if (!controller.signal.aborted) setState({ key: requestKey, scope: dataScope, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState(current => ({ ...([401,403,404].includes(error.status) ? {} : current), key: requestKey, error: error.message }));
    });
    return () => controller.abort();
  }, [id, status, page, requestKey]);

  const refresh = () => setRevision(value => value + 1);
  const data = state.scope === dataScope ? state.data : null;
  useEffect(() => {
    if (!id && data && page >= Math.max(1, data.totalPages)) {
      const next = new URLSearchParams(params); next.delete('page'); setParams(next, { replace: true });
    }
  }, [id, page, data?.totalPages]);
  const error = state.key === requestKey ? state.error : null;
  function changePage(nextPage) {
    const next = new URLSearchParams(params);
    nextPage ? next.set('page', String(nextPage)) : next.delete('page');
    setParams(next);
  }
  function changeStatus(nextStatus) {
    const next = new URLSearchParams();
    if (nextStatus !== 'OPEN') next.set('status', nextStatus);
    setParams(next);
  }
  function reportUrl(reportId, review = false) {
    const next = new URLSearchParams(params);
    reportId ? next.set('id', String(reportId)) : next.delete('id');
    review ? next.set('review', '1') : next.delete('review');
    if (!reportId) next.delete('reason');
    return next.size ? `${base}?${next}` : base;
  }

  function changeReasonFilter(value) {
    const next = new URLSearchParams(params);
    value === 'ALL' ? next.delete('reason') : next.set('reason', value);
    setParams(next, { preventScrollReset: true });
  }

  return <div className="community-report-page ad-page admin-report-page">
    {id > 0 && <Link className="report-back-link" to={reportUrl(null)}><ArrowLeft size={17} aria-hidden="true" />Quay lại danh sách báo cáo</Link>}
    <header className="report-page-heading">
      <span className="report-panel-icon"><Flag size={24} aria-hidden="true" /></span>
      <div>
        <h1>{id ? 'Chi tiết bài viết bị báo cáo' : 'Báo cáo bài viết cộng đồng'}</h1>
      </div>
    </header>
    {!id && <div className="report-queue-toolbar">
      <div className="report-status-filters" role="group" aria-label="Lọc theo trạng thái" aria-busy={!stats}>
        {Object.entries(queueFilters).map(([key, label]) => {
          const Icon=statusIcons[key], count=stats?.[key];
          return <button className="report-status-filter" data-status={key} key={key} type="button"
            aria-pressed={status===key} onClick={()=>changeStatus(key)}>
            <span className="report-status-filter-label"><span className="report-status-icon"><Icon size={19} aria-hidden="true" /></span>{label}
              {status===key&&<Check size={16} aria-hidden="true" />}</span>
            <span className="report-status-total"><strong>{count?.posts??'—'}</strong> bài viết</span>
            <span className="report-status-subtotal">{count?.reports??'—'} lượt báo cáo</span>
          </button>;
        })}
      </div>
      <p className="report-live-caption"><span aria-hidden="true" />Tự động cập nhật theo thời gian thực</p>
    </div>}
    {error && <StateView kind="error" message={error}><button className="p-button" type="button" onClick={refresh}>Thử lại</button></StateView>}
    {!error && !data && <StateView kind="loading" message="Đang tải báo cáo…" />}
    {id > 0 && data && <AdminReportDetail key={id} data={data} onRefresh={refresh} selected={selected} reportUrl={reportUrl}
      reasonFilter={reasonFilter} onReasonFilterChange={changeReasonFilter} />}
    {!id && data && <>
      <AdminReportQueue data={data} status={status} reportUrl={reportUrl} onReset={() => changeStatus('ALL')} />
      {(page > 0 || data.totalPages > 1) && <div className="community-report-actions" aria-label="Phân trang">
        <button className="p-button" type="button" disabled={!page} onClick={() => changePage(page - 1)}><ChevronLeft size={16} aria-hidden="true" />Trang trước</button>
        {data.totalPages > 0 && page < data.totalPages && <span>Trang {page + 1} / {data.totalPages}</span>}
        <button className="p-button" type="button" disabled={page + 1 >= data.totalPages} onClick={() => changePage(page + 1)}>Trang sau<ChevronRight size={16} aria-hidden="true" /></button>
      </div>}
    </>}
  </div>;
}
