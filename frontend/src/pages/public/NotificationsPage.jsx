import { useCallback, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StateView } from '../../components/PortalUI.jsx';
import { useViewingData, ViewingLoadState, ViewingPagination } from '../../components/ViewingUI.jsx';
import { formatViewingDate, hostViewingLink, viewingApi, viewingLink } from '../../services/viewings.js';

export default function NotificationsPage({ host = false }) {
  const [params, setParams] = useSearchParams();
  const unread = params.get('unread') === 'true';
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const load = useCallback(signal => viewingApi.inbox(page, unread, signal), [page, unread]);
  const { data, error, reload } = useViewingData(load, `${unread}/${page}`);

  async function markRead(id) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(id);
    setActionError('');
    try {
      await viewingApi.markRead(id);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  function change(nextUnread, nextPage = 0) {
    setActionError('');
    setParams({ ...(nextUnread ? { unread: 'true' } : {}), ...(nextPage ? { page: nextPage } : {}) });
  }

  return <section className="viewing-flow">
    <header className="viewing-heading">
      <div>{!host && <h1>Thông báo của bạn</h1>}<p>Yêu cầu mới, phản hồi và lịch xem phòng đã hủy.</p></div>
      <button type="button" className="p-button" disabled={busy !== null} onClick={reload}>Làm mới</button>
    </header>
    <div className="viewing-actions">
      <button type="button" className={unread ? 'p-button' : 'p-button primary'} aria-pressed={!unread} onClick={() => change(false)}>Tất cả</button>
      <button type="button" className={unread ? 'p-button primary' : 'p-button'} aria-pressed={unread} onClick={() => change(true)}>Chưa đọc{data ? ` (${data.unreadCount})` : ''}</button>
    </div>
    {actionError && <p className="viewing-error" role="alert">{actionError}</p>}
    {!data ? <ViewingLoadState error={error} retry={reload} /> : <>
      {!data.items.length ? <StateView kind="empty" message={unread ? 'Không có thông báo chưa đọc trong trang này.' : 'Chưa có thông báo lịch xem phòng trong trang này.'} /> :
        <div className="viewing-list">{data.items.map(item => <article className={`viewing-card${item.read ? '' : ' unread'}`} key={item.notificationId}>
          <div><h2>{item.content}</h2><p>{item.read ? 'Đã đọc' : 'Chưa đọc'} · {formatViewingDate(item.createdAt)}</p></div>
          <div className="viewing-actions">
            <Link className="p-button" to={(['REQUESTED', 'CANCELLED'].includes(item.event) ? hostViewingLink : viewingLink)(item.bookingId)}>Xem lịch #{item.bookingId}</Link>
            {!item.read && <button type="button" className="p-button" disabled={busy !== null} onClick={() => markRead(item.notificationId)}>
              {busy === item.notificationId ? 'Đang lưu…' : 'Đánh dấu đã đọc'}
            </button>}
          </div>
        </article>)}</div>}
      <ViewingPagination page={page} hasNext={data.hasNext} onPage={value => change(unread, value)} />
    </>}
  </section>;
}
