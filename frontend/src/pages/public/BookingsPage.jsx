import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, CalendarDays, ChevronRight, Clock, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { DetailImage } from '../../components/detail/DetailPrototypeParts.jsx';
import ViewingRequestForm from '../../components/detail/ViewingRequestForm.jsx';
import { Modal, useToast } from '../../components/PortalUI.jsx';
import { useViewingData, ViewingDetails, ViewingLoadState, ViewingPagination } from '../../components/ViewingUI.jsx';
import { formatViewingSlot, viewingApi, viewingStatuses } from '../../services/viewings.js';

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

function BookingDetail({ id, close, onSaved }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
    {data ? <><ViewingDetails item={data} showAccommodationLink />
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
  const load = useCallback(signal => viewingApi.list(page, status, signal), [page, status]);
  const { data, error, reload } = useViewingData(load, `${status}/${page}`);

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'status') next.delete('page');
    setParams(next, { replace: key === 'id' });
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
      <header className="search-header-section">
        <div className="container">
          <div className="search-headline-group">
            <h1 className="search-main-title">Lịch xem phòng của bạn</h1>
            <p className="search-subtitle">Theo dõi lịch đã gửi và phản hồi của chủ trọ.</p>
          </div>
          <div className="search-controls-box bookings-toolbar">
            <div className="bookings-filter">
              <label htmlFor="booking-status">Trạng thái</label>
              <select id="booking-status" className="sort-select" value={status} onChange={event => update('status', event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                {Object.entries(viewingStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="button" className="bookings-button" onClick={reload}><RefreshCw size={16} aria-hidden="true" />Làm mới</button>
            </div>
            <div className="bookings-toolbar-actions">
              <Link className="bookings-button" to="/notifications"><Bell size={16} aria-hidden="true" />Thông báo</Link>
              <Link className="bookings-button primary" to="/search"><Search size={16} aria-hidden="true" />Tìm phòng</Link>
            </div>
          </div>
        </div>
      </header>
      <section className="listing-results-section" aria-label="Danh sách lịch xem phòng" aria-busy={!data && !error}>
        <div className="container bookings-results">
          {!data ? <ViewingLoadState error={error} retry={reload} /> : <>
            {data.items.length === 0 ? <BookingEmpty filtered={Boolean(status || page)}
              onReset={() => update('status', '')} /> :
              <ul className="bookings-list">{data.items.map(item => <li key={item.bookingId} className="bookings-card">
                <div className="bookings-card-main">
                  <div className="bookings-thumbnail" aria-hidden="true">
                    <DetailImage src={data.coverImages?.[item.roomTypeId]} alt="" loading="lazy" />
                  </div>
                  <div className="bookings-card-info">
                    <span className={`bookings-badge ${item.status?.toLowerCase()}`}>{viewingStatuses[item.status] || item.status}</span>
                    <div className="bookings-card-title">
                      <h2>{item.propertyName}</h2>
                      {item.roomType && <span className="bookings-room-tag">{item.roomType}</span>}
                    </div>
                    <p className="bookings-slot">
                      <CalendarDays size={16} aria-hidden="true" /><Clock size={15} aria-hidden="true" />
                      {formatViewingSlot(item.scheduledDate)}
                    </p>
                  </div>
                </div>
                <button type="button" className="bookings-button bookings-detail" aria-label={`Xem chi tiết lịch hẹn #${item.bookingId} tại ${item.propertyName}`}
                  onClick={() => update('id', item.bookingId)}>Xem chi tiết<ChevronRight size={18} aria-hidden="true" /></button>
              </li>)}</ul>}
            <ViewingPagination page={page} hasNext={data.hasNext} onPage={value => update('page', value)} />
          </>}
        </div>
      </section>
      {/^[1-9]\d*$/.test(id || '') && <BookingDetail key={id} id={id} onSaved={reload} close={() => update('id', '')} />}
    </main>
  </DetailPrototypeShell>;
}