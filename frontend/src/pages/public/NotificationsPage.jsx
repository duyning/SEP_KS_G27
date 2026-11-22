import { useCallback, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StateView } from '../../components/PortalUI.jsx';
import { useViewingData, ViewingLoadState, ViewingPagination } from '../../components/ViewingUI.jsx';
import { formatViewingDate, hostViewingLink, viewingApi, viewingLink } from '../../services/viewings.js';
import CommunityNotificationInbox from '../../components/CommunityNotificationInbox.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function NotificationsPage({ host = false }) {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const community = params.get('tab') === 'community' || !host && !params.has('tab');
  const member = ['USER', 'ROOM_HOST'].includes(user?.role);
  const path = host ? '/host/notifications' : '/notifications';
  if (!member) return <ViewingNotifications host={host} />;
  return <div className="cn-center">
    <h1>Thông báo của bạn</h1>
    <nav className="cn-center-tabs" aria-label="Loại thông báo">
      <Link to={`${path}?tab=community`} aria-current={community ? 'page' : undefined}>Cộng đồng</Link>
      <Link to={`${path}?tab=viewings`} aria-current={!community ? 'page' : undefined}>Lịch xem phòng</Link>
    </nav>
    {community ? <CommunityNotificationInbox /> : <ViewingNotifications host={host} />}
  </div>;
}

function ViewingNotifications({ host = false }) {
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
    setParams({ tab: 'viewings', ...(nextUnread ? { unread: 'true' } : {}), ...(nextPage ? { page: nextPage } : {}) });
  }

  return <section className="viewing-flow">
    <header className="viewing-heading">
      <div><h2>Thông báo lịch xem phòng</h2><p>Yêu cầu mới và phản hồi về lịch xem phòng.</p></div>
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
            <Link className="p-button" to={(item.event === 'REQUESTED' ? hostViewingLink : viewingLink)(item.bookingId)}>Xem lịch #{item.bookingId}</Link>
            {!item.read && <button type="button" className="p-button" disabled={busy !== null} onClick={() => markRead(item.notificationId)}>
              {busy === item.notificationId ? 'Đang lưu…' : 'Đánh dấu đã đọc'}
            </button>}
          </div>
        </article>)}</div>}
      <ViewingPagination page={page} hasNext={data.hasNext} onPage={value => change(unread, value)} />
    </>}
  </section>;
}
