import {useEffect,useRef,useState} from 'react';
import {MessagingContext as Context} from './messagingState.js';
import {useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from './AuthContext.jsx';
import {getToken} from '../services/auth.js';
import {messagingApi,messagePayload} from '../services/messaging.js';
import MessagingDock from '../components/messaging/MessagingDock.jsx';
import '../styles/messaging.css';

export function MessagingProvider({children}){
 const {user,loading}=useAuth(),navigate=useNavigate(),location=useLocation();
 const token=getToken(),session=`${user?.userId??''}:${token??''}`,identity=useRef(session);identity.current=session;
 const [revision,setRevision]=useState(0),[inbox,setInbox]=useState({items:[],unreadCount:0}),[inboxError,setInboxError]=useState('');
 const [inboxLoading,setInboxLoading]=useState(true);
 const inboxLoaded=useRef('');
 const [active,setActive]=useState(null),[minimized,setMinimized]=useState(false),[drafts,setDrafts]=useState({}),[references,setReferences]=useState({});
 const [replies,setReplies]=useState({}),[files,setFiles]=useState({});
 const openings=useRef(new Set());
 const pendingPayloads=useRef(new Map()),returnFocus=useRef(null);
 useEffect(()=>{setActive(null);setDrafts({});setReferences({});setReplies({});setFiles({});setInbox({items:[],unreadCount:0});setInboxError('');inboxLoaded.current='';pendingPayloads.current.clear();},[session]);
 useEffect(()=>{const update=()=>document.documentElement.style.setProperty('--msg-viewport-height',`${window.visualViewport?.height||window.innerHeight}px`);update();window.visualViewport?.addEventListener('resize',update);return()=>{window.visualViewport?.removeEventListener('resize',update);document.documentElement.style.removeProperty('--msg-viewport-height');};},[]);
 useEffect(()=>{
  let timer;
  const update=e=>{if(!e.detail||['messages','resync'].includes(e.detail.type)){clearTimeout(timer);timer=setTimeout(()=>setRevision(v=>v+1),100);}};
  window.addEventListener('hlrcs:community-live',update);
  return()=>{clearTimeout(timer);window.removeEventListener('hlrcs:community-live',update);};
 },[]);
 useEffect(()=>{
  if(!user||loading)return;
  const c=new AbortController();setInboxLoading(inboxLoaded.current!==session);
  messagingApi.inbox(0,'',c.signal).then(data=>{if(!c.signal.aborted){inboxLoaded.current=session;setInbox(data);setInboxError('');}}).catch(e=>{if(!c.signal.aborted)setInboxError(e.message);}).finally(()=>{if(!c.signal.aborted)setInboxLoading(false);});
  return()=>c.abort();
 },[session,loading,revision]);
 useEffect(()=>()=>{openings.current.forEach(c=>c.abort());openings.current.clear();},[session]);
 const refresh=()=>setRevision(v=>v+1);
 function openId(id){
  returnFocus.current=document.activeElement;
  setActive(Number(id));setMinimized(false);
  if(location.pathname==='/messages'||window.matchMedia('(max-width: 700px)').matches)navigate(`/messages?conversation=${id}`);
 }
 async function openTo(recipientId,context){
  if(!user){navigate('/login',{state:{from:'/messages'}});return;}
  const c=new AbortController(),expected=identity.current;openings.current.add(c);
  try{const opened=await messagingApi.open(recipientId,context,c.signal);
   if(expected!==identity.current||c.signal.aborted)return;
   if(opened.context)setReferences(v=>({...v,[opened.conversation.id]:opened.context}));
   openId(opened.conversation.id);refresh();return opened.conversation.id;
  }finally{openings.current.delete(c);}
 }
 const value={user,revision,inbox,inboxError,inboxLoading,inboxReady:inboxLoaded.current===session,active,minimized,drafts,references,replies,files,openTo,openId,refresh,
  close:()=>{setActive(null);requestAnimationFrame(()=>{if(returnFocus.current?.isConnected)returnFocus.current.focus();});},minimize:()=>setMinimized(v=>!v),
  prepare:(id,text,reference,reply,uploads=[])=>{const context=reference?{kind:reference.kind,referenceId:reference.referenceId}:null,previous=pendingPayloads.current.get(id);if(previous&&previous.payload.content===text.trim()&&JSON.stringify(previous.payload.context)===JSON.stringify(context)&&(previous.payload.replyToId??null)===(reply?.id??null)&&previous.files.length===uploads.length&&previous.files.every((file,i)=>file===uploads[i]))return previous.payload;const payload=messagePayload(text,context,crypto.randomUUID(),reply?.id);pendingPayloads.current.set(id,{payload,files:uploads});return payload;},
  delivered:(id,key,text,ref,reply,uploads)=>{if(pendingPayloads.current.get(id)?.payload.clientMessageId===key)pendingPayloads.current.delete(id);setDrafts(v=>v[id]===text?{...v,[id]:''}:v);setReferences(v=>v[id]===ref?{...v,[id]:null}:v);setReplies(v=>v[id]===reply?{...v,[id]:null}:v);setFiles(v=>v[id]===uploads?{...v,[id]:[]}:v);},
  setDraft:(id,text)=>setDrafts(v=>({...v,[id]:text})),
  setReference:(id,ref)=>setReferences(v=>({...v,[id]:ref})),
  setReply:(id,reply)=>setReplies(v=>({...v,[id]:reply})),setFiles:(id,uploads)=>setFiles(v=>({...v,[id]:uploads})),
 };
 return <Context.Provider value={value}>{children}{user&&active&&location.pathname!=='/messages'&&<MessagingDock key={`${session}:${active}`}/>}</Context.Provider>;
}
