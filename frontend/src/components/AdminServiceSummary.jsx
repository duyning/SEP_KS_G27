import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useServiceLive from '../hooks/useServiceLive.js';
import { serviceReviewApi } from '../services/service-review.js';
import { serviceFeedbackApi } from '../services/service-feedback.js';
export default function AdminServiceSummary() {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const load = signal => Promise.all([serviceReviewApi.list(signal), serviceFeedbackApi.complaints('staff', signal)]);
  const apply = ([applications, reports]) => { setData({ applications, reports }); setError(''); };
  useEffect(() => { const c = new AbortController(); load(c.signal).then(apply).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, []);
  useServiceLive(load, apply);
  return <section className="sw-panel" aria-label="Tổng quan dịch vụ"><h2>Dịch vụ</h2>{error && <p role="alert">{error}</p>}{data ? <div className="svc-actions"><Link to="/staff/service-applications?status=PENDING">Hồ sơ chờ duyệt: {data.applications.filter(r => r.status === 'PENDING').length}</Link><Link to="/staff/service-applications?status=NEEDS_SUPPLEMENT">Cần bổ sung: {data.applications.filter(r => r.status === 'NEEDS_SUPPLEMENT').length}</Link><Link to="/staff/service-complaints">Báo cáo cần xử lý: {data.reports.filter(r => !['DISMISSED', 'REMOVED'].includes(r.status)).length}</Link></div> : !error && <p>Đang tải dữ liệu dịch vụ…</p>}</section>;
}
