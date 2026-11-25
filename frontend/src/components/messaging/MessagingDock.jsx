import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Maximize2,Minus,X} from 'lucide-react';
import {useMessaging} from '../../context/messagingState.js';
import MessageThread from './MessageThread.jsx';

export default function MessagingDock(){
 const chat=useMessaging(),[title,setTitle]=useState('Tin nhắn');
 return <aside className={`msg-dock${chat.minimized?' is-minimized':''}`} aria-label="Hộp trò chuyện">
  <header className="msg-dock-bar"><strong>{title}</strong><Link to={`/messages?conversation=${chat.active}`} aria-label="Mở trang tin nhắn"><Maximize2 size={17}/></Link><button type="button" aria-label={chat.minimized?'Mở lại hội thoại':'Thu nhỏ hội thoại'} onClick={chat.minimize}><Minus size={17}/></button><button type="button" aria-label="Đóng hội thoại" onClick={chat.close}><X size={18}/></button></header>
  {!chat.minimized&&<MessageThread key={chat.active} id={chat.active} onTitle={setTitle} compact/>}
 </aside>;
}
