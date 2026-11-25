import {useEffect,useRef,useState} from 'react';
import {Search,MessageSquare} from 'lucide-react';
import {useMessaging} from '../../context/messagingState.js';
import {messagingApi,messageTime} from '../../services/messaging.js';

export function ConversationItem({item,onChoose,selected}){
 return <button type="button" className={`msg-conversation${selected?' is-selected':''}${item.unreadCount?' is-unread':''}`} onClick={()=>onChoose(item.id)}>
  <span className="msg-avatar" aria-hidden="true">{item.peer.name?.charAt(0).toUpperCase()}</span>
  <span className="msg-conversation-copy"><strong>{item.peer.name}</strong><span>{item.lastMessage}</span></span>
  <span className="msg-conversation-meta"><time dateTime={item.updatedAt}>{messageTime(item.updatedAt)}</time>{item.unreadCount>0&&<b aria-label={`${item.unreadCount} tin chưa đọc`}>{item.unreadCount>99?'99+':item.unreadCount}</b>}</span>
 </button>;
}
export default function ConversationList({selected,onChoose}){
 const {revision}=useMessaging(),[q,setQ]=useState(''),[state,setState]=useState({items:[],loading:true}),[retry,setRetry]=useState(0),[moreBusy,setMoreBusy]=useState(false);
 const scope=useRef(''),moreRequest=useRef(null);scope.current=`${q}:${revision}:${retry}`;
 useEffect(()=>{
  const c=new AbortController();setState(previous=>previous.q===q&&!previous.loading?{...previous,refreshError:'',error:''}:{items:[],loading:true,q});
  const timer=setTimeout(()=>messagingApi.inbox(0,q,c.signal).then(data=>{if(!c.signal.aborted)setState({...data,page:0,q,loading:false});}).catch(e=>{if(!c.signal.aborted)setState(previous=>![401,403,404].includes(e.status)&&previous.q===q&&!previous.loading?{...previous,refreshError:e.message}:{items:[],loading:false,q,error:e.message});}),q?250:0);
  return()=>{clearTimeout(timer);c.abort();moreRequest.current?.abort();};
 },[q,revision,retry]);
 async function more(){setMoreBusy(true);const expected=scope.current,c=new AbortController();moreRequest.current=c;try{const data=await messagingApi.inbox(state.page+1,q,c.signal);if(!c.signal.aborted&&scope.current===expected)setState(v=>({...data,q,page:v.page+1,items:[...new Map([...v.items,...data.items].map(c=>[c.id,c])).values()]}));}catch(e){if(!c.signal.aborted&&scope.current===expected)setState(v=>({...v,moreError:e.message}));}finally{setMoreBusy(false);}}
 return <section className="msg-list" aria-label="Hội thoại">
  <label className="msg-search"><Search size={18} aria-hidden="true"/><input aria-label="Tìm người đã trò chuyện" placeholder="Tìm người đã trò chuyện" maxLength={100} value={q} onChange={e=>setQ(e.target.value)}/></label>
  {state.loading&&<p className="msg-state" role="status">Đang tải hội thoại…</p>}
  {state.error&&<div className="msg-state" role="alert">{state.error}<button type="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></div>}
  {state.refreshError&&<p className="msg-error" role="status">Chưa cập nhật được hội thoại. Danh sách hiện tại vẫn được giữ.<button type="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></p>}
  {!state.loading&&!state.error&&!state.items.length&&<div className="msg-state"><MessageSquare size={30} aria-hidden="true"/><p>{q?'Không tìm thấy hội thoại phù hợp.':'Chưa có hội thoại. Bấm Nhắn tin trên bài Community để bắt đầu.'}</p></div>}
  <div className="msg-list-items">{state.items.map(c=><ConversationItem key={c.id} item={c} selected={selected===c.id} onChoose={onChoose}/>)}</div>
  {state.moreError&&<p role="alert">{state.moreError}</p>}
  {state.hasMore&&<button className="msg-load" type="button" disabled={moreBusy} onClick={more}>{moreBusy?'Đang tải…':'Xem thêm hội thoại'}</button>}
 </section>;
}
