import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock, MapPin, Phone, Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { DetailImage } from '../../components/detail/DetailPrototypeParts.jsx';
import ViewingRequestForm from '../../components/detail/ViewingRequestForm.jsx';
import { Modal, useToast } from '../../components/PortalUI.jsx';
import { CopyPhoneButton, useViewingData, ViewingDetails, ViewingLoadState, ViewingPagination } from '../../components/ViewingUI.jsx';
import { accommodationViewingLink, formatViewingSlot, viewingApi, viewingStatuses } from '../../services/viewings.js';
import { money } from '../../services/room-types.js';
import { fetchMemberBookings } from '../../services/member-bookings.js';

import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/search-prototype.css';
import '../../styles/search-prototype-integration.css';
import '../../styles/bookings-page.css';

const savedKey = 'hlrcs:public-saved-properties';
function readSavedCount() {
  try {
    const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
    return Array.isArray(saved) ? saved.filter(Number.isInteger).length : 0;
  } catch {
    return 0;
  }
}

function BookingEmpty({ filtered, onReset }) {
  return <div className="search-empty-container bookings-empty" role="status">
    <div className="search-empty-icon bookings-illustration" aria-hidden="true">
      <CalendarDays size={38} strokeWidth={1.5} /><Clock size={20} />
    </div>
    <h2 className="search-empty-title">{filtered ? 'Không có lịch phù hợp' : 'Bạn chưa có lịch hẹn xem phòng nào'}</h2>
    <p className="search-empty-desc">{filtered ? 'Đổi bộ lọc để xem các lịch hẹn khác.' : 'Khám phá nhà trọ phù hợp và gửi lịch xem trực tiếp cho chủ trọ.'}</p>
    {filtered
      ? <button type="button" className="bookings-button" onClick={onReset}>Xem tất cả lịch</button>
      : <Link to="/search" className="bookings-button primary"><Search size={17} aria-hidden="true" />Đi tìm phòng ngay</Link>}
  </div>;
}

function BookingDetail({ id, close, onSaved, initialCancel = false }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [contactPhone,setContactPhone]=useState(null);
  const [confirming, setConfirming] = useState(initialCancel);
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const cancelling = useRef(false);
  const notify = useToast();
  const load = useCallback(signal => viewingApi.detail(id, signal), [id]);
  const { data, error, reload } = useViewingData(load, id);
  const closeEditor = () => { setEditing(false); reload(); };
  async function cancel(event) {
    event.preventDefault();
    if (cancelling.current) return;
    const reason = new FormData(event.currentTarget).get('reason').trim();
    cancelling.current = true;
    setBusy(true);
    setCancelError(null);
    try {
      await viewingApi.cancel(id, { reason });
      setConfirming(false);
      reload();
      onSaved();
      notify?.('Đã hủy lịch xem phòng và gửi thông báo cho chủ trọ.');
    } catch (err) {
      setCancelError(err);
    } finally {
      cancelling.current = false;
      setBusy(false);
    }
  }

  if (editing && data && user) return <ViewingRequestForm item={{ ...data, roomTypeName: data.roomType }}
    user={user} pending={data} onSaved={onSaved} onClose={closeEditor} onViewSaved={closeEditor} />;
  return <Modal className="viewing-dialog" title={`Lịch xem phòng #${id}`} onClose={() => { if (!cancelling.current) close(); }}>
    {data ? <><ViewingDetails item={data} showAccommodationLink onContactChange={setContactPhone} />
      {data.status === 'PENDING' && confirming && <form className="viewing-decision" onSubmit={cancel}>
        <p><strong>Xác nhận hủy lịch xem phòng?</strong> Chủ trọ sẽ nhận được thông báo.</p>
        <label>Lý do hủy (không bắt buộc)<textarea autoFocus name="reason" rows={3} maxLength={500} disabled={busy} /></label>
        {cancelError && <p className="viewing-error" role="alert">{cancelError.message}</p>}
        <div className="viewing-actions">
          <button type="button" className="p-button" disabled={busy} onClick={() => { setConfirming(false); setCancelError(null); }}>Giữ lịch</button>
          {cancelError?.status === 409
            ? <button type="button" className="p-button" onClick={() => { setConfirming(false); reload(); onSaved(); }}>Tải lại trạng thái</button>
            : <button type="submit" className="p-button bookings-cancel" disabled={busy}>{busy ? 'Đang hủy…' : 'Xác nhận hủy lịch'}</button>}
        </div>
      </form>}
      {data.status === 'PENDING' && !confirming && <div className="viewing-actions viewing-details">
        <button type="button" className="p-button primary" onClick={() => setEditing(true)}>Cập nhật lịch xem phòng</button>
        <button type="button" className="p-button bookings-cancel" onClick={() => setConfirming(true)}>Hủy lịch xem phòng</button>
      </div>}
    </> : <ViewingLoadState error={error} retry={reload} />}
    <footer className="notice-viewing-footer"><CopyPhoneButton phone={contactPhone}/><button type="button" className="notice-button" disabled={busy} onClick={close}>Đóng</button></footer>
  </Modal>;
}

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const [savedCount, setSavedCount] = useState(readSavedCount);
  useEffect(() => {
    const syncSaved = () => setSavedCount(readSavedCount());
    window.addEventListener('storage', syncSaved);
    return () => window.removeEventListener('storage', syncSaved);
  }, []);
  const status = Object.hasOwn(viewingStatuses, params.get('status')) ? params.get('status') : '';
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const id = params.get('id');
  const q = params.get('q') || '';
  const sort = ['oldest', 'appointment'].includes(params.get('sort')) ? params.get('sort') : 'newest';
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => setParams(previous => {
      const next = new URLSearchParams(previous);
      if (search.trim()) next.set('q', search.trim()); else next.delete('q');
      next.delete('page');
      return next;
    }, { replace: true }), 300);
    return () => clearTimeout(timer);
  }, [search, q, setParams]);
  const load = useCallback(signal => fetchMemberBookings(page, status, signal, { q, sort }), [page, status, q, sort]);
  const { data, error, reload } = useViewingData(load, JSON.stringify([status, page, q, sort]));
  const counts = data?.summary?.counts;
  const count = value => counts ? counts[value] || 0 : '—';
  const total = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : '—';

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (['status', 'sort'].includes(key)) next.delete('page');
    if (key === 'id') next.delete('action');
    setParams(next, { replace: key === 'id' });
  }
  function openCancellation(bookingId) {
    const next = new URLSearchParams(params);
    next.set('id', bookingId); next.set('action', 'cancel');
    setParams(next, { replace: true });
  }
  function resetFilters() {
    const next = new URLSearchParams(params);
    for (const key of ['status', 'page', 'q', 'sort']) next.delete(key);
    setSearch(''); setParams(next);
  }

  return <DetailPrototypeShell savedCount={savedCount} className="prototype-search prototype-bookings">
    <main id="main-content" className="bookings-main">
      <div className="search-breadcrumb-bar">
        <nav className="container search-breadcrumb-inner" aria-label="Đường dẫn">
          <ul className="search-breadcrumb-list"><li><Link to="/">Trang chủ</Link></li>
            <li className="search-breadcrumb-sep" aria-hidden="true">/</li>
            <li className="search-breadcrumb-active" aria-current="page">Lịch xem phòng</li></ul>
        </nav>
      </div>
      <header className="bookings-header-section">
        <div className="container">
          <div className="bookings-hero">
            <div><h1>Lịch xem phòng của bạn</h1><p>Theo dõi lịch hẹn đã gửi, thời gian xem trực tiếp và phản hồi từ chủ trọ.</p>
              <div className="bookings-summary" aria-label="Tổng quan lịch xem phòng"><span className="upcoming">{data?.summary?.upcoming ?? '—'} Lịch sắp tới</span><span className="pending">{count('PENDING')} Chờ xác nhận</span><span>{data?.summary?.ended ?? '—'} Đã kết thúc</span></div>
            </div>
            <div className="bookings-toolbar-actions"><Link className="bookings-button" to="/notifications?category=VIEWING">Thông báo lịch hẹn</Link><Link className="bookings-button primary" to="/search"><Plus size={18} aria-hidden="true" />Tìm thêm phòng</Link></div>
          </div>
          <div className="bookings-toolbar">
            <div className="bookings-status-tabs" role="group" aria-label="Trạng thái lịch hẹn">{[['', 'Tất cả'], ['APPROVED', 'Đã xác nhận'], ['PENDING', 'Chờ xác nhận'], ['CANCELLED', 'Đã hủy'], ['REJECTED', 'Đã từ chối']].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => update('status', value)}>{label}<span>{value ? count(value) : total}</span></button>)}</div>
            <div className="bookings-filter-tools">
              <label className="bookings-search"><Search size={16} aria-hidden="true" /><input aria-label="Tìm tên nhà trọ, loại phòng" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên nhà trọ, loại phòng…" /></label>
              <label className="bookings-sort"><span className="sr-only">Sắp xếp lịch hẹn</span><select value={sort} onChange={event => update('sort', event.target.value)}><option value="newest">Sắp xếp: Mới nhất</option><option value="oldest">Sắp xếp: Cũ nhất</option><option value="appointment">Sắp xếp: Thời gian hẹn</option></select></label>
            </div>
          </div>
        </div>
      </header>
      <section className="listing-results-section" aria-label="Danh sách lịch xem phòng" aria-busy={!data && !error}>
        <div className="container bookings-results">
          {!data ? <ViewingLoadState error={error} retry={reload} /> : <>
            {data.items.length === 0 ? <BookingEmpty filtered={Boolean(status || page || q)}
              onReset={resetFilters} /> :
              <ul className="bookings-list">{data.items.map(item => <li key={item.bookingId} className="bookings-card">
                <div className="bookings-card-main">
                  <div className="bookings-thumbnail" aria-hidden="true">
                    <DetailImage src={data.coverImages?.[item.roomTypeId]} alt="" loading="lazy" />
                  </div>
                  <div className="bookings-card-info">
                    <div className="bookings-card-title">
                      <h2>{item.propertyName}</h2>
                      {item.roomType && <span className="bookings-room-tag">{item.roomType}</span>}
                    </div>
                    <p className="bookings-room-meta">{data.rooms?.[item.roomTypeId]?.price > 0 && <strong>{money(data.rooms[item.roomTypeId].price)}/tháng</strong>}{data.rooms?.[item.roomTypeId]?.areaSqm > 0 && <span>{data.rooms[item.roomTypeId].areaSqm} m²</span>}</p>
                    {data.rooms?.[item.roomTypeId]?.address && <p className="bookings-address"><MapPin size={15} aria-hidden="true" />{data.rooms[item.roomTypeId].address}</p>}
                    {data.rooms?.[item.roomTypeId]?.unavailable && <p>Thông tin phòng hiện không khả dụng.</p>}
                  </div>
                </div>
                <div className="bookings-card-schedule"><div className="bookings-schedule-heading"><span>THỜI GIAN HẸN XEM</span><span className={`bookings-badge ${item.status?.toLowerCase()}`}>{viewingStatuses[item.status] || item.status}</span></div><p className="bookings-slot"><CalendarDays size={17} aria-hidden="true" /><strong>{formatViewingSlot(item.scheduledDate)}</strong></p><p className={`bookings-status-note ${item.status?.toLowerCase()}`}>{item.status === 'PENDING' ? 'Đang chờ chủ trọ phản hồi' : item.status === 'APPROVED' ? 'Chủ trọ đã xác nhận lịch xem phòng' : item.decisionReason || viewingStatuses[item.status]}</p></div>
                <div className="bookings-card-actions">{item.status === 'PENDING' && <button type="button" className="bookings-button bookings-cancel" onClick={() => openCancellation(item.bookingId)}>Hủy lịch</button>}{item.status === 'APPROVED' && <Link className="bookings-button primary" to={accommodationViewingLink(item)}><Phone size={16} aria-hidden="true" />Liên hệ chủ trọ</Link>}<button type="button" className="bookings-button bookings-detail" aria-label={`Xem chi tiết lịch hẹn #${item.bookingId} tại ${item.propertyName}`}
                  onClick={() => update('id', item.bookingId)}>Xem chi tiết<ChevronRight size={18} aria-hidden="true" /></button></div>
              </li>)}</ul>}
            <ViewingPagination page={page} hasNext={data.hasNext} onPage={value => update('page', value)} />
          </>}
        </div>
      </section>
      {/^[1-9]\d*$/.test(id || '') && <BookingDetail key={`${id}/${params.get('action')}`} id={id} initialCancel={params.get('action') === 'cancel'} onSaved={reload} close={() => update('id', '')} />}
    </main>
  </DetailPrototypeShell>;
}
