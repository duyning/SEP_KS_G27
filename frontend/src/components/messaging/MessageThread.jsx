import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowDown,ArrowLeft,ExternalLink,FileText,Send,X,Reply,Paperclip} from 'lucide-react';
import {useMessaging} from '../../context/messagingState.js';
import {messagingApi,mergeMessages,messageTime,messageDay} from '../../services/messaging.js';
import {useCommunityImage} from '../CommunityImageViewer.jsx';
import MessageAttachment,{LocalMessageFile} from './MessageAttachment.jsx';
import {MESSAGE_MEDIA_ACCEPT,validateMessageFiles} from '../../services/messaging-media.js';

const EMPTY_FILES=[];

function ReferencePhoto({reference}){const photo=useCommunityImage(reference.referenceId,reference.imageId);return photo.url?<img className="msg-reference-image" src={photo.url} alt="" onError={photo.fail}/>:<FileText size={23} aria-hidden="true"/>;}

export function MessageReference({reference,onRemove}){
 if(!reference)return null;
 return <div className="msg-reference">{reference.available&&reference.imageId?<ReferencePhoto reference={reference}/>:<FileText size={23} aria-hidden="true"/>}<span><small>Bài Community đang trao đổi</small>{reference.available&&reference.url?<Link to={reference.url}>{reference.title}<ExternalLink size={13} aria-hidden="true"/></Link>:<strong>{reference.title}</strong>}{reference.subtitle&&<small>{reference.subtitle}</small>}</span>{onRemove&&<button type="button" aria-label="Bỏ bài đính kèm" onClick={onRemove}><X size={16}/></button>}</div>;
}
export default function MessageThread({id,onBack,visible=true,onTitle,compact=false}){
 const chat=useMessaging(),text=chat.drafts[id]||'',reference=chat.references[id];
 const reply=chat.replies[id],files=chat.files[id]||EMPTY_FILES;
 const [checking,setChecking]=useState(false),picker=useRef(null),selection=useRef(0),composer=useRef(null),thread=useRef(null);
 const [state,setState]=useState({items:[],loading:true}),[error,setError]=useState(''),[sending,setSending]=useState(false),[retry,setRetry]=useState(0),[newMessages,setNewMessages]=useState(false),[olderBusy,setOlderBusy]=useState(false);
 const viewport=useRef(null),textarea=useRef(null),nearEnd=useRef(true),pending=useRef(null),current=useRef(id),readBusy=useRef(false),prepend=useRef(null);
 const snapshot=useRef(state),alive=useRef(true),requests=useRef(new Set());snapshot.current=state;
 current.current=id;
 useEffect(()=>{if(!window.ResizeObserver)return;const observer=new ResizeObserver(()=>thread.current?.style.setProperty('--msg-composer-height',`${composer.current?.offsetHeight||72}px`));observer.observe(composer.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  const c=new AbortController();
  messagingApi.history(id,null,c.signal).then(data=>{
   if(c.signal.aborted)return;
   onTitle?.(data.conversation.peer.name);
   const hasNew=(data.items.at(-1)?.sequence??0)>(snapshot.current.items.at(-1)?.sequence??0);
   setState(old=>{const items=mergeMessages(old.items,data.items);return {conversation:data.conversation,items,hasMore:old.items.length&&items[0]?.sequence===old.items[0].sequence&&old.items[0].sequence<data.items[0]?.sequence?old.hasMore:data.hasMore};});
   if(nearEnd.current)requestAnimationFrame(()=>{if(viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;});else if(hasNew)setNewMessages(true);
  }).catch(e=>{if(!c.signal.aborted)setState(old=>{
   if([401,403,404].includes(e.status))return {items:[],loading:false,error:e.message};
   return old.conversation?{...old,loading:false,refreshError:e.message}:{...old,loading:false,error:e.message};
  });});
  return()=>c.abort();
 },[id,chat.revision,retry]);
 useLayoutEffect(()=>{if(textarea.current){textarea.current.style.height='auto';const height=textarea.current.scrollHeight;textarea.current.style.height=`${Math.min(120,height)}px`;textarea.current.style.overflowY=height>120?'auto':'hidden';}},[text]);
 async function selectFiles(event){
  const added=[...event.target.files];event.target.value='';if(!added.length)return;
  const version=++selection.current,uploads=[...files,...added];setChecking(true);setError('');
  try{const problem=await validateMessageFiles(uploads);if(!alive.current||selection.current!==version)return;if(problem)setError(problem);else chat.setFiles(id,uploads);}
  catch{if(alive.current&&selection.current===version)setError('Không đọc được tệp. Vui lòng chọn lại ảnh/video.');}
  finally{if(alive.current&&selection.current===version)setChecking(false);}
 }
 async function markRead(){
  const last=state.items.at(-1)?.sequence;
  if(!visible||document.hidden||!document.hasFocus()||!nearEnd.current||!last||last<=(state.conversation?.readSequence??0)||readBusy.current)return;
  readBusy.current=true;
  try{const c=await messagingApi.read(id,last);if(alive.current&&current.current===id){setState(v=>({...v,conversation:c}));chat.refresh();}}catch{/* Retry through the next resync; never claim read on failure. */}finally{readBusy.current=false;}
 }
 useEffect(()=>{markRead();const show=()=>markRead();document.addEventListener('visibilitychange',show);window.addEventListener('focus',show);return()=>{document.removeEventListener('visibilitychange',show);window.removeEventListener('focus',show);};},[state.items.at(-1)?.sequence,state.conversation?.readSequence,visible]);
 async function older(){
  if(olderBusy||!state.hasMore)return;setOlderBusy(true);const selected=id;
  const c=new AbortController();pending.current=c;requests.current.add(c);
  try{const data=await messagingApi.history(id,state.items[0]?.sequence,c.signal);if(current.current!==selected||c.signal.aborted)return;
   prepend.current={height:viewport.current.scrollHeight,top:viewport.current.scrollTop};
   setState(v=>({...v,items:[...new Map([...data.items,...v.items].map(m=>[m.sequence,m])).values()].sort((a,b)=>a.sequence-b.sequence),hasMore:data.hasMore}));
  }catch(e){if(!c.signal.aborted)setError(e.message);}finally{requests.current.delete(c);if(alive.current)setOlderBusy(false);}
 }
 useLayoutEffect(()=>{if(prepend.current&&viewport.current){viewport.current.scrollTop=prepend.current.top+viewport.current.scrollHeight-prepend.current.height;prepend.current=null;}},[state.items]);
 const sendBusy=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;selection.current++;requests.current.forEach(c=>c.abort());requests.current.clear();};},[]);
 async function send(e){
  e.preventDefault();if(sendBusy.current||sending||checking||!state.conversation?.peer.active||(!text.trim()&&!files.length)||text.trim().length>2000)return;
  const selected=id,content=text,ref=reference,quoted=reply,uploads=files;
  const payload=chat.prepare(id,text,ref,quoted,uploads);
  sendBusy.current=true;setSending(true);setError('');
  const c=new AbortController();pending.current=c;requests.current.add(c);
  try{const item=await messagingApi.send(id,payload,c.signal,uploads);
   if(current.current!==selected||c.signal.aborted)return;
   setState(v=>({...v,items:mergeMessages(v.items,[item])}));
   chat.delivered(id,payload.clientMessageId,content,ref,quoted,uploads);nearEnd.current=true;chat.refresh();
   requestAnimationFrame(()=>{if(viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;textarea.current?.focus();});
  }catch(e){if(!c.signal.aborted)setError(`${e.message} Nội dung vẫn được giữ để gửi lại.`);}finally{requests.current.delete(c);sendBusy.current=false;if(alive.current&&current.current===selected)setSending(false);}
 }
 const lastOwn=state.items.findLast(m=>m.senderId===chat.user.userId);
 return <section className="msg-thread" ref={thread} aria-label={state.conversation?`Trò chuyện với ${state.conversation.peer.name}`:'Cuộc trò chuyện'}>
  {!compact&&<header className="msg-thread-header">{onBack&&<button className="msg-mobile-back" type="button" aria-label="Quay lại hội thoại" onClick={onBack}><ArrowLeft size={20}/></button>}<span className="msg-avatar" aria-hidden="true">{state.conversation?.peer.name?.charAt(0)}</span><div><h2>{state.conversation?.peer.name||(state.error?'Không thể mở hội thoại':'Đang tải hội thoại…')}</h2></div></header>}
  {state.conversation?.peer.active===false&&<p className="msg-sync-status">Tài khoản hiện không nhận tin nhắn.</p>}
  {state.error&&<div className="msg-error" role="alert">{state.error}<button type="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></div>}
  {state.refreshError&&<div className="msg-sync-status" role="status">Chưa đồng bộ được tin nhắn mới. Lịch sử đang có vẫn được giữ.<button type="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></div>}
  <div className="msg-history" ref={viewport} tabIndex={0} aria-label="Lịch sử tin nhắn" onScroll={()=>{const el=viewport.current;nearEnd.current=el.scrollHeight-el.scrollTop-el.clientHeight<50;if(nearEnd.current){setNewMessages(false);markRead();}}}>
   {state.loading&&<p className="msg-state" role="status">Đang tải tin nhắn…</p>}
   {state.hasMore&&<button type="button" className="msg-load" disabled={olderBusy} onClick={older}>{olderBusy?'Đang tải…':'Tải tin nhắn cũ hơn'}</button>}
   {!state.loading&&!state.error&&!state.items.length&&<p className="msg-state">Bắt đầu cuộc trò chuyện bằng một lời chào.</p>}
   {state.items.map((m,i)=>{const own=m.senderId===chat.user.userId;return <div key={m.sequence}>{(!i||messageDay(state.items[i-1].createdAt)!==messageDay(m.createdAt))&&<p className="msg-day">{messageDay(m.createdAt)}</p>}<div className={`msg-line${own?' is-own':''}`}>
    <div className="msg-bubble"><MessageReference reference={m.context}/>
     {m.replyTo&&<blockquote className="msg-quote"><strong>{m.replyTo.senderId===chat.user.userId?'Bạn':m.replyTo.senderName}</strong><span>{m.replyTo.content}</span></blockquote>}
     {!!m.attachments?.length&&<div className="msg-attachments">{m.attachments.map(file=><MessageAttachment key={file.id} conversationId={id} file={file} onResize={()=>{if(nearEnd.current&&viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;}}/>)}</div>}
     {m.content&&<p>{m.content}</p>}<time dateTime={m.createdAt}>{messageTime(m.createdAt)}</time></div>
    <button className="msg-reply-action" type="button" aria-label={`Trả lời tin nhắn ${m.sequence}`} title="Trả lời" disabled={sending||!state.conversation?.peer.active} onClick={()=>{chat.setReply(id,{id:m.id,sequence:m.sequence,senderId:m.senderId,senderName:own?'Bạn':state.conversation.peer.name,content:m.content||'Ảnh/video đính kèm'});textarea.current?.focus();}}><Reply size={16}/></button>
   </div>{own&&m.id===lastOwn?.id&&<p className="msg-receipt">{state.conversation?.peerReadSequence>=m.sequence?'Đã đọc':'Đã gửi'}</p>}</div>;})}
  </div>
  <span className="msg-sr-only" role="status" aria-live="polite">{state.items.at(-1)?.senderId!==chat.user.userId&&state.items.length?`Có tin nhắn từ ${state.conversation?.peer.name||'người đang trò chuyện'}.`:''}</span>
  {newMessages&&<button className="msg-new" type="button" onClick={()=>{nearEnd.current=true;viewport.current.scrollTop=viewport.current.scrollHeight;setNewMessages(false);markRead();}}><ArrowDown size={15}/>Có tin nhắn mới</button>}
  <form className="msg-composer" ref={composer} onSubmit={send}>
   <MessageReference reference={reference} onRemove={()=>chat.setReference(id,null)}/>
   {reply&&<div className="msg-reply-draft"><Reply size={17}/><span><strong>Trả lời {reply.senderId===chat.user.userId?'chính bạn':reply.senderName}</strong><span>{reply.content}</span></span><button type="button" aria-label="Hủy trả lời" onClick={()=>chat.setReply(id,null)}><X size={17}/></button></div>}
   {!!files.length&&<div className="msg-file-drafts">{files.map((file,index)=><div key={index}><LocalMessageFile file={file}/><button type="button" aria-label={`Bỏ tệp ${file.name}`} disabled={sending||checking} onClick={()=>chat.setFiles(id,files.filter((_,i)=>i!==index))}><X size={14}/></button></div>)}</div>}
   {error&&<p className="msg-error" role="alert">{error}</p>}
   <input ref={picker} type="file" hidden multiple accept={MESSAGE_MEDIA_ACCEPT} onChange={selectFiles}/>
   <div className="msg-compose-row"><button type="button" className="msg-attach-action" aria-label="Đính kèm ảnh hoặc video" title="JPG/PNG: 5 MB/ảnh, tối đa 6 ảnh. MP4 H.264: 50 MB, 3 phút, tối đa 1 video." disabled={sending||checking||!state.conversation?.peer.active} onClick={()=>picker.current?.click()}><Paperclip size={21}/></button><textarea ref={textarea} aria-label="Nội dung tin nhắn" placeholder="Nhập tin nhắn…" maxLength={2000} rows={1} value={text} disabled={!state.conversation||state.conversation.peer.active===false} onChange={e=>chat.setDraft(id,e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send(e);}}}/><button type="submit" aria-label={sending?'Đang gửi tin':'Gửi tin nhắn'} disabled={sending||checking||(!text.trim()&&!files.length)||!state.conversation?.peer.active}><Send size={20}/></button></div>
   {(sending||checking)&&<span className="msg-upload-status" role="status">{checking?'Đang kiểm tra tệp…':'Đang gửi tin nhắn…'}</span>}
  </form>
 </section>;
}
