import {useEffect,useId,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {MessageSquare} from 'lucide-react';
import {useMessaging} from '../../context/messagingState.js';
import {ConversationItem} from './ConversationList.jsx';

export default function MessagingBell(){
 const chat=useMessaging(),[open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null),id=useId(),location=useLocation();
 useEffect(()=>setOpen(false),[location.key]);
 useEffect(()=>{if(!open)return;const close=e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('keydown',close);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',outside);};},[open]);
 if(!chat?.user)return null;
 return <div className="msg-nav" ref={root}><button type="button" ref={trigger} className="msg-nav-trigger" aria-label={`Tin nhắn${chat.inbox.unreadCount?`, ${chat.inbox.unreadCount} chưa đọc`:''}`} aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(v=>!v)}><MessageSquare size={21} aria-hidden="true"/>{chat.inbox.unreadCount>0&&<span className="msg-badge" aria-hidden="true">{chat.inbox.unreadCount>99?'99+':chat.inbox.unreadCount}</span>}</button>
  {open&&<section className="msg-popover" id={id} aria-label="Tin nhắn gần đây"><header><h2>Tin nhắn</h2><Link to="/messages" onClick={()=>setOpen(false)}>Xem tất cả</Link></header>
   {chat.inboxError&&<p className={chat.inboxReady?'msg-sync-status':'msg-error'} role={chat.inboxReady?'status':'alert'}>{chat.inboxReady?'Chưa đồng bộ được hội thoại mới. Danh sách hiện tại vẫn được giữ.':chat.inboxError}<button type="button" onClick={chat.refresh}>Thử lại</button></p>}
   {!chat.inbox.items.length&&chat.inboxLoading&&<p className="msg-state" role="status">Đang tải hội thoại…</p>}
   {!chat.inbox.items.length&&!chat.inboxError&&!chat.inboxLoading&&<p className="msg-state">Bạn chưa có cuộc trò chuyện nào.</p>}
   {chat.inbox.items.map(c=><ConversationItem key={c.id} item={c} onChoose={id=>{chat.openId(id);setOpen(false);}}/>)}
   <Link className="msg-inbox-link" to="/messages" onClick={()=>setOpen(false)}>Mở trang tin nhắn</Link>
  </section>}
 </div>;
}
