import ServiceComplaints from '../../components/ServiceComplaints.jsx';
import UIButton from '../../components/common/Button.jsx';
import { StaffListIcon as Icon, StaffListPanel, StaffListFilters, StaffListStatus, StaffListOpen, StaffListTag } from '../../components/StaffServiceListUI.jsx';

const statuses = {
  PENDING: ['Chờ xử lý', 'pending'],
  NEEDS_EXPLANATION: ['Yêu cầu giải trình', 'explanation'],
  EXPLAINED: ['Đã giải trình', 'explained'],
  REMOVED: ['Đã gỡ', 'removed'],
  DISMISSED: ['Hoàn tất', 'completed'],
};
function ReportList({ rows, filtered, filter, setFilter, loading, error, refresh, onSelect }) {
  return <StaffListPanel title="Báo cáo dịch vụ" description="Theo dõi và xử lý phản ánh từ người dùng" loading={loading} onReload={refresh}>
    <StaffListFilters value={filter} onChange={setFilter} options={ [['', ['Tất cả', 'all']], ...Object.entries(statuses)].map(([value, [label, tone]]) => ({ value, label, tone, count: loading || error ? '—' : value ? rows.filter(row => row.status === value).length : rows.length })) } />
    {error && <p role="alert" className="staff-report-error">{error}</p>}
    {loading ? <p role="status" className="staff-report-empty">Đang tải báo cáo…</p> : !error && <>
      {!filtered.length && <div className="staff-report-empty"><span className="staff-report-empty-icon"><Icon /></span><h3>{filter ? 'Chưa có báo cáo ở trạng thái này' : 'Chưa có báo cáo dịch vụ'}</h3><p>{filter ? 'Chọn trạng thái khác để xem các báo cáo hiện có.' : 'Các phản ánh mới từ người dùng sẽ xuất hiện tại đây.'}</p>{filter && <UIButton onClick={() => setFilter('')}>Xem tất cả báo cáo</UIButton>}</div>}
      <div className="staff-report-cards">{filtered.map(row => {
        const [label, tone] = statuses[row.status] || [row.status, 'pending'];
        return <article className="staff-report-card" key={row.complaintId}>
          <div className="staff-report-card-content"><div className="staff-report-card-heading"><span className="staff-report-id">#{row.complaintId}</span><strong>{row.providerName || row.serviceName}</strong><StaffListStatus label={label} tone={tone} /></div>
            {row.providerName && row.providerName !== row.serviceName && <StaffListTag>{row.serviceName}</StaffListTag>}
            <p className="staff-report-excerpt">{row.content}</p><time dateTime={row.createdAt}><Icon type="clock" />{new Date(row.createdAt).toLocaleString('vi-VN')}</time>
          </div><StaffListOpen onClick={() => onSelect(row.complaintId)}>Xem báo cáo</StaffListOpen>
        </article>;
      })}</div>
    </>}
  </StaffListPanel>;
}

export default function StaffServiceComplaintsPage() {
  return <section className="staff-service-list-page"><h1>Xử lý báo cáo dịch vụ</h1><p>Xem phản ánh và minh chứng, yêu cầu nhà cung cấp giải trình hoặc gỡ dịch vụ vi phạm khỏi chế độ công khai.</p><ServiceComplaints scope="staff" renderList={props => <ReportList {...props} />} /></section>;
}
