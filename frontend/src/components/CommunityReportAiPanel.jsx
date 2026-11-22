import { useEffect, useRef, useState } from 'react';
import { Sparkles, LoaderCircle } from 'lucide-react';
import { communityReportsApi, reportDate } from '../services/community-reports.js';
import useCommunityLive from './useCommunityLive.js';
import '../styles/community-report-ai.css';

const recommendations = {
  SUGGEST_HIDE: 'Đề xuất admin xem xét ẩn bài', SUGGEST_KEEP: 'Chưa thấy căn cứ để ẩn bài',
  ADMIN_REVIEW: 'Cần admin xác minh thêm', INCOMPLETE: 'Chưa đủ kết quả để tổng hợp', CLOSED: 'Các báo cáo đã đóng',
};
const states = { QUEUED: 'Đang chờ phân tích', RUNNING: 'Đang phân tích', READY: 'Đã phân tích', FAILED: 'Phân tích gặp lỗi',
  DISABLED: 'Chưa xếp hàng phân tích', SKIPPED: 'Đã bỏ qua do dữ liệu thay đổi', STALE: 'Kết quả cũ, cần phân tích lại',
  NOT_ANALYZED: 'Chưa phân tích', CLOSED: 'Báo cáo đã đóng', UNAVAILABLE: 'Bài không còn công khai' };
const sources = { POST_TEXT: 'Nội dung bài', POST_MEDIA: 'Tệp của bài', REPORT_EVIDENCE: 'Ảnh bằng chứng do người báo cáo gửi', REPORT_CONTEXT: 'Ngữ cảnh báo cáo' };

export default function CommunityReportAiPanel({ reportId, postId }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const inFlight = useRef(false);
  const currentReport = useRef(reportId);
  currentReport.current = reportId;
  useCommunityLive('reports,posts', () => setRevision(value => value + 1), postId);
  useEffect(() => {
    const controller = new AbortController();
    communityReportsApi.ai(reportId, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ reportId, data });
    }).catch(error => { if (!controller.signal.aborted) setState({ reportId, error: error.message }); });
    return () => controller.abort();
  }, [reportId, revision]);
  const data = state.reportId === reportId ? state.data : null;
  const error = state.reportId === reportId ? state.error : null;
  const working = data?.items.some(item => ['QUEUED', 'RUNNING'].includes(item.state));
  const canAnalyze = data?.items.some(item => !['CLOSED', 'UNAVAILABLE'].includes(item.state));
  const rules = new Map(data?.rules.map(rule => [rule.code, rule]) || []);
  async function analyze() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setActionError('');
    try { const data = await communityReportsApi.analyze(reportId); if (currentReport.current === reportId) setState({ reportId, data }); }
    catch (failure) { if (currentReport.current === reportId) setActionError(failure.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="report-ai" aria-labelledby="report-ai-heading" aria-busy={busy}>
    <header className="report-ai-heading"><h3 id="report-ai-heading"><Sparkles size={18} aria-hidden="true" />AI hỗ trợ admin</h3>
    </header>
    {error && <div role="alert"><p>{error}</p><button type="button" className="p-button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
    {!error && !data && <p role="status">Đang tải hỗ trợ AI…</p>}
    {data && <>
      {!data.enabled || !data.configured ? <p className="report-ai-note">{!data.enabled ? 'AI hỗ trợ report đang tắt.' : 'Máy chủ chưa cấu hình khóa Gemini. Bạn vẫn có thể xử lý thủ công.'}</p> : <>
        <p className="report-ai-summary" data-recommendation={data.recommendation} role="status">
          <strong>{recommendations[data.recommendation]}</strong>
          <span>{data.readyOpen}/{data.totalOpen} báo cáo đang chờ đã có kết quả còn hiệu lực.</span>
        </p>
        {working && <p className="report-ai-working" role="status"><LoaderCircle size={16} className="spin" aria-hidden="true" />AI đang phân tích. Bạn có thể quyết định thủ công ngay.</p>}
      </>}
      <details className="report-ai-expanded"><summary>Chi tiết AI và bộ rule</summary>
      <p className="report-ai-note">AI chỉ đề xuất. Admin kiểm tra bằng chứng và quyết định giữ hoặc ẩn bài.</p>
      <button type="button" className="p-button" disabled={busy || working || !canAnalyze || !data.enabled || !data.configured || !data.totalOpen}
        onClick={analyze}>{busy ? 'Đang xếp hàng…' : data.readyOpen ? 'Yêu cầu phân tích lại' : 'Phân tích báo cáo đang chờ'}</button>
      <small className="report-ai-note">Dùng chung Gemini với kiểm duyệt bài; phân tích lại cách nhau ít nhất 60 giây.</small>
      <details className="report-ai-results"><summary>Xem phân tích từng lượt báo cáo ({data.items.length})</summary>
      {data.items.map(item => <details className="report-ai-item" key={item.reportId}>
        <summary>Báo cáo #{item.reportId} · {states[item.state] || item.state}
          {item.state === 'RUNNING' && ` (${item.completedChecks}/${item.totalChecks} bước)`}</summary>
        {item.recommendation && <strong>{recommendations[item.recommendation]}</strong>}
        {item.state === 'CLOSED' && <p>Kết quả cũ chỉ để tham khảo, không áp dụng cho quyết định mới.</p>}
        {['FAILED','SKIPPED','STALE','UNAVAILABLE'].includes(item.state) && <p>Không dùng kết quả này làm căn cứ tổng hợp. Admin kiểm tra trực tiếp hoặc yêu cầu phân tích lại khi bài còn công khai.</p>}
        {item.finishedAt && <small>Phân tích: {reportDate(item.finishedAt)} · {item.model}</small>}
        {item.findings.map((finding, index) => <div className="report-ai-finding" key={index}>
          <strong>{rules.get(finding.rule)?.label || finding.rule}</strong>
          <small>{sources[finding.source] || finding.source}{finding.mediaId != null ? ` #${finding.mediaId}` : ''}
            {finding.timestampSeconds != null ? ` · khoảng giây ${finding.timestampSeconds}` : ''}</small>
          <p>{finding.explanation}</p>
          {finding.postQuote && <blockquote><span>Trích bài viết:</span> {finding.postQuote}</blockquote>}
          {finding.postQuote2 && <blockquote><span>Thông tin đối chiếu:</span> {finding.postQuote2}</blockquote>}
          {finding.reportQuote && <blockquote><span>Trích báo cáo:</span> {finding.reportQuote}</blockquote>}
        </div>)}
      </details>)}</details>
      <details className="report-ai-rules"><summary>Bộ rule đang áp dụng · {data.rulesVersion}</summary>
        <ol>{data.rules.map(rule => <li key={rule.code}><strong>{rule.label}</strong><p>{rule.criteria}</p></li>)}</ol>
      </details></details>
    </>}
    {actionError && <p role="alert">{actionError}</p>}
  </section>;
}
