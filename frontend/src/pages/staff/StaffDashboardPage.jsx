import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, MessageSquare, RefreshCw, ShieldAlert, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { StaffLoadState, StaffMetric, staffDate, useStaffLoad } from '../../components/StaffUI.jsx';

const types = { PROPERTY: 'Nhà trọ', REPORT: 'Báo cáo', COMMUNITY: 'Cộng đồng', SUPPORT: 'Hỗ trợ' };
export default function StaffDashboardPage() {
  const { user } = useAuth();
  const state = useStaffLoad('dashboard');
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('ALL');
  const selectFilter = type => { setFilter(type); if (params.has('view')) setParams({}); };
  if (state.loading || state.error) return <div className="sw-page"><StaffLoadState state={state} /></div>;
  const data = state.data;
  const queryFilter = params.get('view') === 'content-moderation' ? 'REPORT' : params.get('view') === 'feedback-verification' ? 'FEEDBACK' : filter;
  const queue = data.queue.filter(item => queryFilter === 'ALL' || item.type === queryFilter);
  const metrics = [
    ['Xác minh đang chờ', data.pendingVerifications, 'Cần thẩm định', Building2, 'teal', 'PROPERTY'],
    ['Tin chờ kiểm duyệt', data.pendingReports, 'Báo cáo vi phạm', ShieldAlert, 'blue', 'REPORT'],
    ['Đánh giá chờ xác minh', data.pendingFeedback, 'Chưa có quy trình xác minh đánh giá', Star, 'violet', 'FEEDBACK'],
    ['Yêu cầu hỗ trợ', data.pendingSupport, 'Đang cần trợ giúp', MessageSquare, 'amber', 'SUPPORT'],
  ];
  return <div className="sw-page"><header className="sw-page-heading"><div><h2>Bảng điều khiển vận hành</h2><p>Xin chào, <strong>{user.fullName || user.email}</strong>. Trung tâm quản trị tác vụ, xét duyệt nhà trọ và hỗ trợ đối tác Hòa Lạc.</p></div><MotionButton className="p-button" onClick={state.reload}><RefreshCw size={16} />Cập nhật dữ liệu</MotionButton></header>
    <div className="sw-metrics">{metrics.map(([label, value, hint, Icon, tone, type]) => <StaffMetric key={type} label={label} value={value} hint={hint} icon={Icon} tone={tone}>{type === 'PROPERTY' ? <Link to="/staff/verifications">Xem danh sách<ArrowRight size={14} /></Link> : <MotionButton disabled={value == null} onClick={() => selectFilter(type)}>Xem hàng đợi<ArrowRight size={14} /></MotionButton>}</StaffMetric>)}</div>
    <div className="sw-dashboard-grid"><div><section className="sw-panel"><div className="sw-panel-title"><h3>Hàng đợi công việc cần xử lý</h3><span className="sw-count">{data.queue.length} việc</span></div><div className="sw-tabs" role="group" aria-label="Loại công việc">{[['ALL','Tất cả'], ...Object.entries(types)].map(([type,label]) => <MotionButton key={type} className={queryFilter === type ? 'active' : ''} onClick={() => selectFilter(type)} aria-pressed={queryFilter === type}>{label} ({data.queue.filter(item => type === 'ALL' || item.type === type).length})</MotionButton>)}</div>
      <div className="sw-queue">{queue.map(item => <article className="sw-task" key={item.key}><header><span className={`sw-type ${item.type.toLowerCase()}`}>{types[item.type] || item.type}</span><time>{staffDate(item.createdAt)}</time></header><h4>{item.title}</h4><p>Người gửi: {item.requester || 'Chưa cập nhật'}</p><blockquote><span>{item.description || 'Chưa có nội dung mô tả.'}</span></blockquote><footer><span className="sw-status pending">{item.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ xử lý'}</span>{item.detailLink ? <Link className="sw-primary small" to={item.detailLink}>Xử lý ngay<ArrowRight size={14} /></Link> : <MotionButton className="sw-primary small" disabled title="Trang xử lý của phân hệ này chưa được kết nối dữ liệu thật">Xử lý ngay<ArrowRight size={14} /></MotionButton>}</footer></article>)}{!queue.length && <p className="sw-empty">{queryFilter === 'FEEDBACK' ? 'Chưa có dữ liệu trạng thái xác minh đánh giá trong hệ thống.' : 'Không có công việc chờ xử lý trong nhóm này.'}</p>}</div></section>
      <section className="sw-panel sw-recent" id="staff-history"><h3>Công việc đã xử lý gần đây</h3><div className="sw-table-wrap"><table className="sw-table"><thead><tr><th>Phân loại</th><th>Đối tượng</th><th>Người xử lý</th><th>Quyết định</th><th>Thời gian</th></tr></thead><tbody>{data.activities.map(item => <tr key={item.logId}><td>{item.targetType === 'PROPERTY_REGISTRATION' ? 'Xác minh nhà trọ' : item.targetType}</td><td>{item.targetType === 'PROPERTY_REGISTRATION' ? <Link to={`/staff/verifications/detail?id=${item.targetId}`}>Hồ sơ #{item.targetId}</Link> : `#${item.targetId}`}</td><td>{item.staffName}</td><td>{item.action === 'APPROVED' ? 'Đã phê duyệt' : item.action === 'REJECTED' ? 'Đã từ chối' : item.action}</td><td>{staffDate(item.createdAt)}</td></tr>)}</tbody></table></div>{!data.activities.length && <p className="sw-empty">Chưa có công việc được ghi nhận.</p>}</section>
    </div><aside className="sw-dashboard-aside"><section className="sw-panel"><h3>Tình trạng vận hành</h3><dl className="sw-operations">{[['Nhà trọ đang hoạt động', data.activeProperties], ['Tác vụ đã xử lý', data.processedTasks], ['Tỷ lệ tuân thủ SLA', data.slaPercent == null ? 'Chưa có dữ liệu' : `${data.slaPercent}%`], ['Thời gian phản hồi TB', data.averageResponseHours == null ? 'Chưa có dữ liệu' : `${data.averageResponseHours} giờ`]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><section className="sw-panel"><h3>Nhật ký hoạt động gần đây</h3><ol className="sw-activity">{data.activities.slice(0,6).map(item => <li key={item.logId}><strong>{item.staffName}: {item.action === 'APPROVED' ? 'Phê duyệt hồ sơ' : item.action === 'REJECTED' ? 'Từ chối hồ sơ' : item.action}</strong><p>{item.note || `${item.targetType} #${item.targetId}`}</p><time>{staffDate(item.createdAt)}</time></li>)}</ol>{!data.activities.length && <p className="sw-empty">Chưa có nhật ký hoạt động.</p>}</section></aside></div>
  </div>;
}
