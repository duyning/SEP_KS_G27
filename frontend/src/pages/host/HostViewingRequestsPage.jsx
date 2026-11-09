import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Eye, MapPin, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { hostApi } from '../../services/host.js';
import HostSetupRequired from '../../components/HostSetupRequired.jsx';
import PropertyCardCover from '../../components/PropertyCardCover.jsx';
import { Modal, StateView, useToast } from '../../components/PortalUI.jsx';
import { useViewingData, ViewingDetails, ViewingStatus } from '../../components/ViewingUI.jsx';
import { formatViewingDate, viewingApi, viewingIsFuture } from '../../services/viewings.js';
import { propertyPage } from '../../services/host-property-list.js';
import '../../styles/host-property-page.css';
import '../../styles/host-viewings-page.css';


export function ViewingsNoProperty() {
 return <HostSetupRequired kind="viewings"/>;
}

function ViewingDecision({ item, availableRooms, onDecision, onRefresh, onBusy }) {
  const inFlight = useRef(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const future = viewingIsFuture(item.scheduledDate);
  const canApprove = future && availableRooms > 0;

  async function decide(status) {
    if (inFlight.current) return;
    setError(null);
    if (status === 'REJECTED' && !reason.trim()) {
      setError({ message: 'Vui lòng nhập lý do từ chối.' });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    try {
      onDecision(await viewingApi.decide(item.bookingId, { status, expectedScheduledDate: item.scheduledDate, ...(status === 'REJECTED' ? { reason: reason.trim() } : {}) }));
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusy(false);
    }
  }

  return <form className="viewing-decision" onSubmit={event => { event.preventDefault(); void decide('REJECTED'); }}>
    {!future && <p>Giờ hẹn đã qua. Bạn có thể từ chối và đề nghị khách gửi lịch mới.</p>}
    {rejecting && <label>Lý do từ chối<textarea autoFocus required rows={3} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>}
    {error && <p role="alert" className="viewing-error">{error.message}</p>}
    <div className="viewing-actions">
      {rejecting ? <>
        <button type="button" className="p-button" disabled={busy} onClick={() => { setRejecting(false); setError(null); }}>Quay lại</button>
        <button type="submit" className="p-button primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Gửi từ chối'}</button>
      </> : <>
        <button type="button" className="p-button primary" disabled={busy || !canApprove} onClick={() => decide('APPROVED')}>{busy ? 'Đang lưu…' : 'Xác nhận lịch'}</button>
        <button type="button" className="p-button" disabled={busy} onClick={() => setRejecting(true)}>Từ chối</button>
      </>}
      {error?.status === 409 && <button type="button" className="p-button" onClick={onRefresh}>Tải lại kết quả</button>}
    </div>
  </form>;
}

function HostViewingDetail({ item, canDecide, onDecision, onRefresh, onBusy }) {
  const load = useCallback(signal => viewingApi.availability(item.bookingId, signal), [item.bookingId]);
  const { data: availableRooms, error, reload } = useViewingData(load, item.bookingId);
  return <>
    <ViewingDetails item={item} />
    <div className="host-viewings-availability">
      {error ? <><p role="alert">{error}</p><button type="button" className="p-button" onClick={reload}>Kiểm tra lại phòng trống</button></>
        : <p role="status">{availableRooms === undefined ? 'Đang kiểm tra phòng trống…' : availableRooms > 0
          ? `Còn ${availableRooms} phòng trống thuộc loại này.` : 'Loại phòng này hiện đã hết phòng trống.'}</p>}
    </div>
    {item.status === 'PENDING' && canDecide && <ViewingDecision item={item} availableRooms={availableRooms}
      onDecision={onDecision} onRefresh={onRefresh} onBusy={onBusy} />}
  </>;
}

function ViewingProperties({ data, onRefresh }) {
  const [params, setParams] = useSearchParams();
  const load = useCallback(signal => hostApi.property(signal), []);
  const { data: portfolio, error, reload } = useViewingData(load, 'property-cards');
  const records = new Map(portfolio?.records.filter(record => record.propertyId != null)
    .map(record => [record.propertyId, record]));
  const counts = new Map();
  for (const item of data.viewings) {
    const count = counts.get(item.propertyId) ?? { total: 0, pending: 0 };
    count.total++;
    if (item.status === 'PENDING') count.pending++;
    counts.set(item.propertyId, count);
  }
  const current = propertyPage(data.properties, params.get('page'));
  function changePage(page) {
    const next = new URLSearchParams(params);
    if (page > 1) next.set('page', page); else next.delete('page');
    setParams(next);
  }

  return <section className="host-viewings-list">
    <div className="host-viewings-heading">
      <div><h2>Yêu cầu xem phòng theo nhà trọ</h2><p>Chọn một nhà trọ để xem và xử lý các lịch đã gửi.</p></div>
      <MotionButton type="button" className="p-button" onClick={onRefresh}><RefreshCw size={16} />Làm mới</MotionButton>
    </div>
    {error && <p role="status" className="host-viewings-empty">Chưa tải được ảnh và thông tin phòng. <button type="button" className="p-button" onClick={reload}>Thử lại</button></p>}
    <p className="hp-portfolio-result">{data.properties.length} nhà trọ</p>
    <div className="hp-property-grid host-viewings-property-grid">{current.items.map(property => {
      const record = records.get(property.propertyId);
      const count = counts.get(property.propertyId) ?? { total: 0, pending: 0 };
      const target = new URLSearchParams(params);
      target.set('propertyId', property.propertyId);
      if (!count.pending && count.total) target.set('tab', 'processed'); else target.delete('tab');
      const href = `/host/viewings?${target}`;
      return <article className="hp-property-card" key={property.propertyId}>
        <PropertyCardCover property={record ?? { name: property.name, photos: [] }} />
        <div className="hp-card-body">
          <div className="hp-card-meta"><span className="host-viewings-pending-count">{count.pending} chờ duyệt</span><small>NT-{property.propertyId}</small></div>
          <h3><Link to={href}>{property.name}</Link></h3>
          {record?.address && <p className="hp-card-address"><MapPin size={14} aria-hidden="true" /><span>{record.address}</span></p>}
          <div className="hp-card-numbers">
            {[['Loại phòng', record?.roomTypeCount], ['Tổng phòng', record?.totalRooms],
              ['Còn trống', record?.vacantRooms], ['Yêu cầu xem phòng', count.total]].map(([label, value]) =>
                <div key={label}><strong>{value ?? '—'}</strong><span>{label}</span></div>)}
          </div>
        </div>
        <footer className="hp-card-actions">
          <Link className="p-button" to={href} aria-label={`Xem yêu cầu của ${property.name}`}><Eye size={16} />Xem yêu cầu</Link>
        </footer>
      </article>;
    })}</div>
    {current.pages > 1 && <nav className="hp-pagination" aria-label="Phân trang nhà trọ">
      <span>Trang {current.page} / {current.pages}</span>
      <div><button type="button" className="p-button" disabled={current.page === 1} onClick={() => changePage(current.page - 1)}><ChevronLeft size={16} />Trước</button>
        <button type="button" className="p-button" disabled={current.page === current.pages} onClick={() => changePage(current.page + 1)}>Sau<ChevronRight size={16} /></button></div>
    </nav>}
  </section>;
}

function ViewingList({ data, property, onRefresh, onDecision, canDecide }) {
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const [decisionBusy, setDecisionBusy] = useState(false);
  const id = params.get('id');
  const ownedRequests = data.viewings.filter(item => item.propertyId === property.propertyId);
  const selected = ownedRequests.find(item => String(item.bookingId) === id);
  function select(bookingId) {
    const next = new URLSearchParams(params);
    next.set('propertyId', property.propertyId);
    if (!next.has('tab') && selected && selected.status !== 'PENDING') next.set('tab', 'processed');
    if (bookingId) next.set('id', bookingId); else next.delete('id');
    setParams(next, { replace: true });
  }
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('NEWEST');
  const tab = params.get('tab') === 'processed' || (!params.has('tab') && selected && selected.status !== 'PENDING') ? 'processed' : 'pending';
  const pendingCount = ownedRequests.filter(item => item.status === 'PENDING').length;
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = ownedRequests.filter(item => (item.status === 'PENDING') === (tab === 'pending')
    && (!date || item.scheduledDate?.slice(0, 10) === date)
    && [item.renterName, item.renterPhone, item.propertyName, item.roomType, item.bookingId]
      .some(value => String(value ?? '').toLocaleLowerCase('vi').includes(query)))
    .sort((a, b) => sort === 'APPOINTMENT'
      ? a.scheduledDate.localeCompare(b.scheduledDate)
      : (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.bookingId - a.bookingId);

  function changeTab(nextTab) {
    const next = new URLSearchParams(params);
    next.set('propertyId', property.propertyId);
    if (nextTab === 'processed') next.set('tab', nextTab); else next.delete('tab');
    next.delete('id');
    setParams(next);
  }

  function finish(item) {
    onDecision(item);
    setSearch('');
    setDate('');
    changeTab('processed');
    notify?.(item.status === 'APPROVED' ? 'Đã xác nhận lịch xem phòng.' : 'Đã gửi phản hồi từ chối.');
  }

  return <section className="host-viewings-list">
    <Link className="hp-back-link" to={params.get('page') ? `/host/viewings?page=${encodeURIComponent(params.get('page'))}` : '/host/viewings'}>
      <ArrowLeft size={16} />Danh sách nhà trọ
    </Link>
    <div className="host-viewings-heading"><h2>{property.name}</h2><MotionButton type="button" className="p-button" onClick={onRefresh}><RefreshCw size={16} />Làm mới</MotionButton></div>
    <div className="host-viewings-tabs" role="group" aria-label="Nhóm trạng thái lịch">
      <button type="button" className={`p-button ${tab === 'pending' ? 'primary' : ''}`} aria-pressed={tab === 'pending'} onClick={() => changeTab('pending')}>Chờ duyệt ({pendingCount})</button>
      <button type="button" className={`p-button ${tab === 'processed' ? 'primary' : ''}`} aria-pressed={tab === 'processed'} onClick={() => changeTab('processed')}>Đã xử lý ({ownedRequests.length - pendingCount})</button>
    </div>
    <div className="host-viewings-filters">
      <label className="host-viewings-search"><Search size={16} /><input aria-label="Tìm yêu cầu" placeholder="Tên khách, số điện thoại, loại phòng…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <input type="date" aria-label="Ngày xem phòng" value={date} onChange={event => setDate(event.target.value)} />
      <select aria-label="Sắp xếp" value={sort} onChange={event => setSort(event.target.value)}><option value="NEWEST">Mới nhất trước</option><option value="APPOINTMENT">Giờ hẹn sớm trước</option></select>
    </div>
    {filtered.length === 0 ? <p className="host-viewings-empty" role="status">Không có yêu cầu phù hợp trong mục này.</p> :
      <div className="host-viewings-group"><div className="host-viewings-table-scroll" tabIndex={0} role="region" aria-label={`Yêu cầu xem phòng của ${property.name}`}><table className="host-viewings-table">
            <thead><tr><th scope="col">Người liên hệ</th><th scope="col">Loại phòng</th><th scope="col">Lịch hẹn</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
            <tbody>{filtered.map(item => <tr key={item.bookingId}>
              <td><strong>{item.renterName || 'Chưa có tên'}</strong>{item.renterPhone && <small>{item.renterPhone}</small>}</td>
              <td>{item.roomType}</td><td>{formatViewingDate(item.scheduledDate)}</td>
              <td><ViewingStatus status={item.status} /></td>
              <td><MotionButton type="button" className="p-button" aria-label={`Chi tiết lịch #${item.bookingId}`} onClick={() => select(item.bookingId)}><Eye size={16} />Chi tiết</MotionButton></td>
            </tr>)}</tbody>
          </table></div></div>}
    <AnimatePresence>{id && <Modal className="viewing-dialog" title={`Yêu cầu xem phòng #${id}`}
      onClose={() => { if (!decisionBusy) select(null); }}>
      {selected ? <HostViewingDetail key={id} item={selected} canDecide={canDecide}
        onDecision={finish} onRefresh={onRefresh} onBusy={setDecisionBusy} /> : <StateView kind="error" message="Không tìm thấy yêu cầu xem phòng thuộc nhà trọ của bạn." />}
    </Modal>}</AnimatePresence>
  </section>;
}

export function ViewingsContent({ data, propertyId, bookingId, onRefresh, onDecision, canDecide }) {
  const requested = bookingId ? data.viewings.find(item => String(item.bookingId) === bookingId) : null;
  const targetId = propertyId ?? requested?.propertyId;
  const property = data.properties.find(item => String(item.propertyId) === String(targetId));
  if ((targetId != null && !property) || (!targetId && bookingId)) return <StateView kind="error"
    message="Không tìm thấy nhà trọ hoặc yêu cầu xem phòng trong danh sách bạn quản lý.">
    <Link className="p-button" to="/host/viewings">Danh sách nhà trọ</Link>
  </StateView>;
  if (!data.properties.length) {
    if (data.pendingRegistrationCount > 0) return <section className="host-viewings-state"><div className="host-viewings-state-icon"><CalendarDays size={30} /></div><h2>Hồ sơ nhà trọ đang chờ xét duyệt</h2><p>Bạn có {data.pendingRegistrationCount} hồ sơ đang chờ xử lý. Yêu cầu xem phòng sẽ khả dụng khi nhà trọ được tạo trong hệ thống.</p><Link className="host-viewings-register" to="/host/property">Xem nhà trọ của tôi</Link></section>;
    return <ViewingsNoProperty />;
  }
  return property
    ? <ViewingList key={property.propertyId} data={data} property={property} onRefresh={onRefresh} onDecision={onDecision} canDecide={canDecide} />
    : <ViewingProperties data={data} onRefresh={onRefresh} />;
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
  const applyDecision = item => setState(current => ({
    ...current,
    data: { ...current.data, viewings: current.data.viewings.map(value => value.bookingId === item.bookingId ? item : value) },
  }));
  return <div className="host-viewings-page">{state.loading ? <StateView kind="loading" /> : state.error ? <StateView kind="error" message={state.error}><MotionButton className="p-button primary" onClick={refresh}>Thử lại</MotionButton></StateView> : <ViewingsContent data={state.data} propertyId={propertyId} bookingId={params.get('id')} onRefresh={refresh} onDecision={applyDecision} canDecide={user?.role === 'ROOM_HOST'} />}</div>;
}
