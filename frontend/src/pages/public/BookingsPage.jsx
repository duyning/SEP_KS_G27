import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import ViewingRequestForm from '../../components/detail/ViewingRequestForm.jsx';
import { Modal, StateView } from '../../components/PortalUI.jsx';
import { useViewingData, ViewingDetails, ViewingLoadState, ViewingPagination, ViewingStatus } from '../../components/ViewingUI.jsx';
import { formatViewingDate, viewingApi, viewingStatuses } from '../../services/viewings.js';

function BookingDetail({ id, close, onSaved }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const load = useCallback(signal => viewingApi.detail(id, signal), [id]);
  const { data, error, reload } = useViewingData(load, id);
  const closeEditor = () => { setEditing(false); reload(); };
  if (editing && data && user) return <ViewingRequestForm item={{ ...data, roomTypeName: data.roomType }}
    user={user} pending={data} onSaved={onSaved} onClose={closeEditor} onViewSaved={closeEditor} />;
  return <Modal className="viewing-dialog" title={`Lịch xem phòng #${id}`} onClose={close}>
    {data ? <><ViewingDetails item={data} showAccommodationLink />
      {data.status === 'PENDING' && <div className="viewing-actions viewing-details">
        <button type="button" className="p-button primary" onClick={() => setEditing(true)}>Cập nhật lịch xem phòng</button>
      </div>}
    </> : <ViewingLoadState error={error} retry={reload} />}
  </Modal>;
}

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
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

  return <section className="viewing-flow">
    <header className="viewing-heading">
      <div><h1>Lịch xem phòng của bạn</h1><p>Theo dõi lịch đã gửi và phản hồi của chủ trọ.</p></div>
      <div className="viewing-actions">
        <Link className="p-button" to="/notifications">Thông báo</Link>
        <Link className="p-button primary" to="/search">Tìm phòng</Link>
      </div>
    </header>
    <div className="viewing-actions">
      <label>Trạng thái<select value={status} onChange={event => update('status', event.target.value)}>
        <option value="">Tất cả</option>
        {Object.entries(viewingStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" className="p-button" onClick={reload}>Làm mới</button>
    </div>
    {!data ? <ViewingLoadState error={error} retry={reload} /> : <>
      {data.items.length === 0 ? <StateView kind="empty" message="Không có lịch xem phòng trong mục này." /> :
        <div className="viewing-list">{data.items.map(item => <article key={item.bookingId} className="viewing-card">
          <div>
            <ViewingStatus status={item.status} />
            <h2>{item.propertyName} · {item.roomType}</h2>
            <p><CalendarDays size={16} aria-hidden="true" />{formatViewingDate(item.scheduledDate)} · Giờ Việt Nam</p>
          </div>
          <button type="button" className="p-button" onClick={() => update('id', item.bookingId)}>Chi tiết #{item.bookingId}</button>
        </article>)}</div>}
      <ViewingPagination page={page} hasNext={data.hasNext} onPage={value => update('page', value)} />
    </>}
    {/^[1-9]\d*$/.test(id || '') && <BookingDetail key={id} id={id} onSaved={reload} close={() => update('id', '')} />}
  </section>;
}
