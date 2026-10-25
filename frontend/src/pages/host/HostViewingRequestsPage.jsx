import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Eye, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { hostApi } from '../../services/host.js';
import { Modal, StateView, StatusBadge, UnsupportedButton } from '../../components/PortalUI.jsx';
import '../../styles/host-viewings-page.css';

const statuses = { PENDING: 'Chờ xác nhận', APPROVED: 'Đã xác nhận', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };
const formatDate = value => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa cập nhật';

export function ViewingsNoProperty() {
  return <section id="noPropertyState" className="host-viewings-state">
    <div className="host-viewings-state-icon" aria-hidden="true">🏠</div>
    <h2>Bạn chưa đăng ký nhà trọ</h2>
    <p>Bạn cần đăng ký nhà trọ trước khi nhận yêu cầu xem phòng từ khách thuê.</p>
    <Link to="/host/property/new" className="host-viewings-register">Đăng ký nhà trọ ngay</Link>
  </section>;
}

function ViewingList({ data, propertyId, onRefresh }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('NEWEST');
  const [selected, setSelected] = useState(null);
  const ownedRequests = useMemo(() => data.viewings.filter(item => !propertyId || String(item.propertyId) === propertyId), [data.viewings, propertyId]);
  const filtered = useMemo(() => ownedRequests.filter(item =>
    (status === 'ALL' || item.status === status)
    && (!date || item.scheduledDate?.slice(0, 10) === date)
    && [item.renterName, item.renterPhone, item.propertyName, item.roomType, item.bookingId].some(value => String(value ?? '').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))
  ).sort((a, b) => sort === 'APPOINTMENT' ? new Date(a.scheduledDate) - new Date(b.scheduledDate) : new Date(b.createdAt) - new Date(a.createdAt)), [ownedRequests, search, status, date, sort]);

  return <section className="host-viewings-list">
    <div className="host-viewings-heading"><h2>Yêu cầu xem phòng</h2><button className="p-icon" title="Làm mới dữ liệu" aria-label="Làm mới dữ liệu" onClick={onRefresh}><RefreshCw size={18} /></button></div>
    <div className="host-viewings-counts"><span>Tổng yêu cầu <strong>{ownedRequests.length}</strong></span>{Object.entries(statuses).map(([key, label]) => <span key={key}>{label} <strong>{ownedRequests.filter(item => item.status === key).length}</strong></span>)}</div>
    {ownedRequests.length === 0 ? <StateView kind="empty" message="Chưa có yêu cầu xem phòng từ khách thuê. Yêu cầu mới sẽ hiển thị tại đây." /> : <>
      <div className="host-viewings-filters">
        <label className="host-viewings-search"><Search size={18} /><input aria-label="Tìm yêu cầu" placeholder="Tìm tên khách, số điện thoại, loại phòng..." value={search} onChange={event => setSearch(event.target.value)} /></label>
        <select aria-label="Trạng thái" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <input type="date" aria-label="Ngày xem phòng" value={date} onChange={event => setDate(event.target.value)} />
        <select aria-label="Sắp xếp" value={sort} onChange={event => setSort(event.target.value)}><option value="NEWEST">Mới nhất trước</option><option value="APPOINTMENT">Lịch hẹn gần nhất</option></select>
        <button className="p-icon" title="Đặt lại bộ lọc" aria-label="Đặt lại bộ lọc" onClick={() => { setSearch(''); setStatus('ALL'); setDate(''); setSort('NEWEST'); }}><RefreshCw size={17} /></button>
      </div>
      <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Khách thuê</th><th>Nhà trọ / Loại phòng</th><th>Lịch hẹn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(item => <tr key={item.bookingId}><td><strong>{item.renterName}</strong><br />{item.renterPhone || 'Chưa có số điện thoại'}</td><td>{item.propertyName}<br />{item.roomType}</td><td>{formatDate(item.scheduledDate)}</td><td><StatusBadge tone={item.status === 'APPROVED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'neutral'}>{statuses[item.status] || item.status}</StatusBadge></td><td><button className="p-button" onClick={() => setSelected(item)}><Eye size={16} />Chi tiết</button></td></tr>)}</tbody></table></div>
      {filtered.length === 0 && <StateView kind="empty" message="Không có yêu cầu phù hợp với bộ lọc." />}
      <p className="host-viewings-result" role="status">Hiển thị {filtered.length} / {ownedRequests.length} yêu cầu</p>
    </>}
    {selected && <Modal title={`Yêu cầu xem phòng #${selected.bookingId}`} onClose={() => setSelected(null)}><dl className="host-viewings-details">{[['Khách thuê', selected.renterName], ['Số điện thoại', selected.renterPhone], ['Nhà trọ', selected.propertyName], ['Loại phòng', selected.roomType], ['Lịch hẹn', formatDate(selected.scheduledDate)], ['Trạng thái', statuses[selected.status] || selected.status], ['Ghi chú', selected.note]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa có thông tin'}</dd></div>)}</dl><p>Chức năng xác nhận và từ chối chưa được máy chủ hỗ trợ.</p><div className="portal-actions"><UnsupportedButton>Xác nhận</UnsupportedButton><UnsupportedButton>Từ chối</UnsupportedButton></div></Modal>}
  </section>;
}

export function ViewingsContent({ data, propertyId, onRefresh }) {
  if (propertyId !== null && !data.properties.some(property => String(property.propertyId) === propertyId)) return <StateView kind="error" message="Không tìm thấy nhà trọ trong danh sách bạn được phép quản lý." />;
  if (!data.properties.length) {
    if (data.pendingRegistrationCount > 0) return <section className="host-viewings-state"><div className="host-viewings-state-icon"><CalendarDays size={30} /></div><h2>Hồ sơ nhà trọ đang chờ xét duyệt</h2><p>Bạn có {data.pendingRegistrationCount} hồ sơ đang chờ xử lý. Yêu cầu xem phòng sẽ khả dụng khi nhà trọ được tạo trong hệ thống.</p><Link className="host-viewings-register" to="/host/property">Xem nhà trọ của tôi</Link></section>;
    return <ViewingsNoProperty />;
  }
  return <ViewingList key={propertyId || 'all'} data={data} propertyId={propertyId} onRefresh={onRefresh} />;
}

export default function HostViewingRequestsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId');
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    hostApi.viewings(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [user?.userId, revision]);
  const refresh = () => setRevision(value => value + 1);
  return <div className="host-viewings-page">{state.loading ? <StateView kind="loading" /> : state.error ? <StateView kind="error" message={state.error}><button className="p-button primary" onClick={refresh}>Thử lại</button></StateView> : <ViewingsContent data={state.data} propertyId={propertyId} onRefresh={refresh} />}</div>;
}
