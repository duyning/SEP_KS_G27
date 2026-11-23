import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { communityNotifications } from '../services/community-notifications.js';
import CommunityNotificationInbox from './CommunityNotificationInbox.jsx';
import useCommunityLive from './useCommunityLive.js';
import '../styles/community-notifications.css';

export default function CommunityNotificationBell() {
  const { user } = useAuth();
  return ['USER', 'ROOM_HOST'].includes(user?.role) ? <MemberBell key={user.userId} /> : null;
}
function MemberBell() {
  const [count, setCount] = useState(null);
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const location = useLocation();
  useCommunityLive('notifications', () => window.dispatchEvent(new Event('hlrcs:community-notifications')));
  useEffect(() => setOpen(false), [location.key]);
  useEffect(() => {
    let request;
    const refresh = () => {
      if (document.hidden) return;
      request?.abort();
      request = new AbortController();
      const current = request;
      communityNotifications.count(current.signal).then(value => { if (!current.signal.aborted) setCount(value); })
        .catch(() => { if (!current.signal.aborted) setCount(null); });
    };
    refresh();
    window.addEventListener('hlrcs:community-notifications', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      request?.abort();
      window.removeEventListener('hlrcs:community-notifications', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    root.current?.querySelector('.cn-popover button:not(:disabled)')?.focus();
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="cn-bell" ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="cn-bell-trigger" aria-label={`Thông báo cộng đồng${count == null ? '' : `, ${count} chưa đọc`}`}
      aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
      <Bell size={21} aria-hidden="true" />{count > 0 && <span className="cn-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <div className="cn-popover" id={id}>
      <CommunityNotificationInbox compact onOpen={() => setOpen(false)} />
      <Link className="cn-all" to="/notifications?tab=community" onClick={() => setOpen(false)}>Mở hộp thư cộng đồng</Link>
      <Link className="cn-all" to="/notifications" onClick={() => setOpen(false)}>Mở trung tâm thông báo</Link>
    </div>}
  </div>;
}
