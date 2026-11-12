import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StateView, StatusBadge, useToast } from '../components/PortalUI.jsx';
import CommunityPostDescription from '../components/CommunityPostDescription.jsx';
import CommunityPostMedia from '../components/CommunityPostMedia.jsx';
import { postStatuses, postTypes } from '../services/community.js';
import { communityReportsApi, reportDate, reportPage, reportReasons, reportStatuses } from '../services/community-reports.js';
import '../styles/community-reports.css';

const adminPath = '/admin/community/reports';
const minePath = '/community/reports';

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
    <a className="p-button" href={state.url} download={`bao-cao-${id}.${state.extension}`}>Tải ảnh bằng chứng</a>
  </>;
}

function ReportStatus({ status }) {
  return <StatusBadge tone={status === 'OPEN' ? 'warning' : status === 'RESOLVED' ? 'success' : 'neutral'}>
    {reportStatuses[status]}
  </StatusBadge>;
}

function AdminReportDetail({ data, onChange, onRefresh }) {
  const notify = useToast();
  const { report, post } = data;
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy || !action) return;
    if (!note.trim()) {
      setError('Vui lòng nhập lý do xử lý.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await communityReportsApi.resolve(report.id, action, note.trim());
      onChange(updated);
      notify('Đã lưu quyết định xử lý.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <section className="ad-panel community-report-panel">
      <h2>Báo cáo #{report.id}</h2>
      <dl>
        <div><dt>Trạng thái</dt><dd><ReportStatus status={report.status} /></dd></div>
        <div><dt>Người gửi</dt><dd>{report.reporter}</dd></div>
        <div><dt>Thời điểm gửi</dt><dd>{reportDate(report.createdAt)}</dd></div>
        <div><dt>Lý do</dt><dd>{reportReasons[report.reasonCode] || 'Báo cáo cũ'}</dd></div>
      </dl>
      {data.details && <p className="community-report-description">{data.details}</p>}
      {data.hasEvidence && <ReportEvidence key={report.id} id={report.id} />}
    </section>
    <section className="ad-panel community-report-panel">
      <h2>Bài viết #{report.postId}</h2>
      {post ? <>
        <dl>
          <div><dt>Tiêu đề</dt><dd>{post.title}</dd></div>
          <div><dt>Người đăng</dt><dd>{post.authorName}</dd></div>
          <div><dt>Chuyên mục</dt><dd>{postTypes[post.type]}</dd></div>
          <div><dt>Trạng thái bài</dt><dd>{postStatuses[post.status]}</dd></div>
        </dl>
        <CommunityPostDescription content={post.content} contentFormat={post.contentFormat} />
        {(post.images.length > 0 || post.videos.length > 0) && <CommunityPostMedia post={post} />}
      </> : <p>{report.postTitle && <strong>{report.postTitle}. </strong>}Bài viết đã bị xóa.</p>}
    </section>
    <section className="ad-panel community-report-panel community-report-detail-controls">
      <h2>Quyết định xử lý</h2>
      {report.status === 'OPEN' ? <form className="community-report-form" onSubmit={submit} aria-busy={busy}>
        <label htmlFor="community-report-action">Hành động</label>
        <select id="community-report-action" value={action} onChange={event => setAction(event.target.value)} required disabled={busy}>
          <option value="" disabled>Chọn hành động</option>
          {post?.status === 'APPROVED' && <option value="HIDE_POST">Ẩn bài viết</option>}
          <option value="DISMISS">Bỏ qua báo cáo</option>
        </select>
        {action === 'HIDE_POST' && <p>Bài sẽ biến mất khỏi Cộng đồng công khai và tất cả báo cáo đang mở của bài sẽ được đóng.</p>}
        <label htmlFor="community-report-decision-note">Lý do xử lý</label>
        <textarea id="community-report-decision-note" rows={4} value={note} maxLength={1000} required
          onChange={event => setNote(event.target.value)} disabled={busy} />
        {error && <div role="alert" className="portal-form-alert">
          <p>{error}</p><button type="button" className="p-button" onClick={onRefresh}>Tải lại báo cáo</button>
        </div>}
        <button type="submit" className="p-button primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu quyết định'}</button>
      </form> : <dl>
        <div><dt>Người xử lý</dt><dd>{data.handler || '—'}</dd></div>
        <div><dt>Thời điểm xử lý</dt><dd>{reportDate(data.resolvedAt)}</dd></div>
        <div><dt>Lý do xử lý</dt><dd className="community-report-description">{data.resolutionNote || '—'}</dd></div>
      </dl>}
    </section>
  </>;
}

export default function CommunityReportsPage({ admin = false }) {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') === 'ALL' || Object.hasOwn(reportStatuses, params.get('status')) ? params.get('status') : 'OPEN';
  const page = reportPage(params.get('page'));
  const id = admin ? reportPage(params.get('id')) : 0;
  const base = admin ? adminPath : minePath;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({});
  const requestKey = `${admin}:${id}:${status}:${page}:${revision}`;

  useEffect(() => {
    const controller = new AbortController();
    const load = id ? communityReportsApi.detail(id, controller.signal)
      : admin ? communityReportsApi.queue(status, page, controller.signal) : communityReportsApi.mine(page, controller.signal);
    load.then(data => {
      if (!controller.signal.aborted) setState({ key: requestKey, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key: requestKey, error: error.message });
    });
    return () => controller.abort();
  }, [admin, id, status, page, requestKey]);

  const refresh = () => setRevision(value => value + 1);
  const data = state.key === requestKey ? state.data : null;
  const error = state.key === requestKey ? state.error : null;
  function changePage(nextPage) {
    const next = new URLSearchParams(params);
    nextPage ? next.set('page', String(nextPage)) : next.delete('page');
    setParams(next);
  }
  function changeStatus(event) {
    const next = new URLSearchParams();
    if (event.target.value !== 'OPEN') next.set('status', event.target.value);
    setParams(next);
  }
  function reportUrl(reportId) {
    const next = new URLSearchParams(params);
    reportId ? next.set('id', String(reportId)) : next.delete('id');
    return next.size ? `${base}?${next}` : base;
  }

  return <div className="community-report-page ad-page">
    {id > 0 && <Link to={reportUrl(null)}>Quay lại danh sách báo cáo</Link>}
    {!admin && <Link to="/community">Quay lại Cộng đồng</Link>}
    <h1>{admin ? 'Báo cáo bài viết cộng đồng' : 'Báo cáo của tôi'}</h1>
    {admin && !id && <div className="community-report-filter">
      <label htmlFor="community-report-filter">Trạng thái</label>
      <select id="community-report-filter" value={status} onChange={changeStatus}>
        <option value="ALL">Tất cả</option>
        {Object.entries(reportStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </div>}
    {error && <StateView kind="error" message={error}><button className="p-button" type="button" onClick={refresh}>Thử lại</button></StateView>}
    {!error && !data && <StateView kind="loading" message="Đang tải báo cáo…" />}
    {id > 0 && data && <AdminReportDetail key={id} data={data} onRefresh={refresh}
      onChange={updated => setState({ key: requestKey, data: updated })} />}
    {!id && data && <>
      <section className="ad-panel community-report-panel" aria-label="Danh sách báo cáo">
        {data.content.length === 0 ? <p role="status">Không có báo cáo ở trang này.</p> : <ul className="community-report-list">
          {data.content.map(row => <li key={row.id}>
            {admin ? <>
              <Link to={reportUrl(row.id)}><strong>#{row.id} · {row.postTitle || `Bài viết #${row.postId}`}</strong></Link>
              <span>{row.reporter} · {reportReasons[row.reasonCode] || 'Báo cáo cũ'}</span>
              <span><ReportStatus status={row.status} /></span>
            </> : <><strong>{row.postTitle || `Báo cáo #${row.id}`}</strong><span>Đã gửi báo cáo thành công</span></>}
            <time dateTime={row.createdAt}>{reportDate(row.createdAt)}</time>
          </li>)}
        </ul>}
      </section>
      {(page > 0 || data.totalPages > 1) && <div className="community-report-actions" aria-label="Phân trang">
        <button className="p-button" type="button" disabled={!page} onClick={() => changePage(page - 1)}>Trang trước</button>
        <button className="p-button" type="button" disabled={page + 1 >= data.totalPages} onClick={() => changePage(page + 1)}>Trang sau</button>
      </div>}
    </>}
  </div>;
}
