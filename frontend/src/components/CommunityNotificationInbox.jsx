import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, MessageCircle, ShieldCheck, MoreHorizontal, Trash2 } from 'lucide-react';
import { StateView } from './PortalUI.jsx';
import useCommunityLive from './useCommunityLive.js';
import { communityNotifications, notificationChanged, notificationDate, notificationLabels, notificationText } from '../services/community-notifications.js';
import '../styles/community-notifications.css';

export default function CommunityNotificationInbox({ compact = false, onOpen }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({});
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const menu = useRef(null);
  const menuTrigger = useRef(null);
  const inFlight = useRef(false);
  const key = `${page}:${unread}:${revision}`;
  const scope = `${page}:${unread}`;
  useCommunityLive('notifications', () => setRevision(value => value + 1));
  useEffect(() => {
    const controller = new AbortController();
    communityNotifications.inbox(page, unread, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, scope, data });
    }).catch(error => { if (!controller.signal.aborted) setState(current=>({...([401,403,404].includes(error.status)||current.scope!==scope?{}:current),key,error:error.message})); });
    return () => controller.abort();
  }, [key, page, unread]);
  const data = state.scope === scope ? state.data : null;
  useEffect(() => { if (page > 0 && data && !data.items.length) setPage(0); }, [page, data]);
  const error = state.key === key ? state.error : null;
  useEffect(() => {
    if (!menuOpen) return;
    menu.current?.querySelector('.cn-options button:not(:disabled)')?.focus();
    const outside = event => { if (!menu.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen]);
  async function act(id, open = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(id);
    setActionError('');
    setSuccess('');
    try {
      const destination = open ? await communityNotifications.destination(id) : null;
      if (id === 'delete-read') {
        const deleted = await communityNotifications.deleteRead();
        setSuccess(deleted ? `Đã xóa ${deleted} thông báo đã đọc.` : 'Không có thông báo đã đọc để xóa.');
      } else if (id === 'all') await communityNotifications.readAll();
      else await communityNotifications.read(id);
      notificationChanged();
      if (open) {
        onOpen?.();
        navigate(destination);
      } else if ((unread || id === 'delete-read') && page > 0) setPage(0);
      else setRevision(value => value + 1);
    } catch (failure) { setActionError(failure.message); }
    finally { inFlight.current = false; setBusy(null); }
  }
  function filter(value) { setUnread(value); setPage(0); setActionError(''); }
  function menuAction(action) {
    setMenuOpen(false);
    menuTrigger.current?.focus();
    if (action === 'delete-read' && !window.confirm('Xóa tất cả thông báo cộng đồng đã đọc? Thao tác này không thể khôi phục. Thông báo chưa đọc sẽ được giữ lại.')) return;
    act(action);
  }
  return <section className={`community-inbox${compact ? ' is-compact' : ''}`} aria-label="Thông báo cộng đồng">
    <header className="community-inbox-heading">
      <h2>Thông báo cộng đồng</h2>
      <div className="cn-menu" ref={menu} onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
      }} onKeyDown={event => {
        if (event.key === 'Escape' && menuOpen) { event.stopPropagation(); setMenuOpen(false); menuTrigger.current?.focus(); }
      }}>
        <button ref={menuTrigger} type="button" className="cn-action" aria-label="Tùy chọn thông báo" aria-expanded={menuOpen}
          disabled={busy !== null} onClick={() => setMenuOpen(value => !value)}><MoreHorizontal size={22} aria-hidden="true" /></button>
        {menuOpen && <div className="cn-options">
          <button type="button" disabled={busy !== null || !data?.unreadCount} onClick={() => menuAction('all')}><CheckCheck size={18} aria-hidden="true" />Đọc tất cả</button>
          <button type="button" disabled={busy !== null || !data} onClick={() => menuAction('delete-read')}><Trash2 size={18} aria-hidden="true" />Xóa tất cả thông báo đã đọc</button>
        </div>}
      </div>
    </header>
    <div className="cn-filters" role="group" aria-label="Lọc thông báo cộng đồng">
      <button type="button" aria-pressed={!unread} onClick={() => filter(false)}>Tất cả</button>
      <button type="button" aria-pressed={unread} onClick={() => filter(true)}>Chưa đọc{data ? ` (${data.unreadCount})` : ''}</button>
    </div>
    {actionError && <p role="alert" className="cn-error">{actionError}</p>}
    {success && <p role="status" className="cn-success">{success}</p>}
    {error ? <StateView kind="error" message={error}><button type="button" className="cn-action" onClick={() => setRevision(value => value + 1)}>Thử lại</button></StateView>
      : !data ? <p className="cn-empty" role="status">Đang tải thông báo…</p> : <>
        {!data.items.length && <div className="cn-empty" role="status"><Bell size={25} aria-hidden="true" /><p>{unread ? 'Bạn đã đọc hết thông báo ở trang này.' : 'Chưa có thông báo cộng đồng ở trang này.'}</p></div>}
        <ul className="cn-list">{data.items.map(item => {
          const interaction = ['COMMENT', 'REPLY'].includes(item.kind);
          const Icon = interaction ? MessageCircle : ShieldCheck;
          return <li key={item.notificationId} className={item.read ? '' : 'is-unread'}>
            <button className="cn-open" type="button" disabled={busy !== null} onClick={() => act(item.notificationId, true)}>
              <span className={`cn-avatar${interaction ? '' : ' is-system'}`} aria-hidden="true">{interaction ? item.actor?.slice(0, 2).toUpperCase() : <Icon size={22} />}</span>
              <span className="cn-copy"><strong>{notificationLabels[item.kind]}</strong><span>{notificationText(item)}</span>
                {item.reason && <span className="cn-reason">{item.reason}</span>}
                <time dateTime={item.createdAt}>{notificationDate(item.createdAt)}</time>
              </span>
              {!item.read && <span className="cn-unread-dot" aria-label="Chưa đọc" />}
            </button>
            {!item.read && <button className="cn-read" type="button" disabled={busy !== null} onClick={() => act(item.notificationId)}>
              {busy === item.notificationId ? 'Đang lưu…' : 'Đánh dấu đã đọc'}
            </button>}
          </li>;
        })}</ul>
        {(page > 0 || data.hasNext) && <nav className="cn-pagination" aria-label="Phân trang thông báo cộng đồng">
          <button type="button" disabled={!page || busy !== null} onClick={() => setPage(value => value - 1)}>Trang trước</button>
          <span>Trang {page + 1}</span>
          <button type="button" disabled={!data.hasNext || busy !== null} onClick={() => setPage(value => value + 1)}>Trang sau</button>
        </nav>}
      </>}
  </section>;
}
