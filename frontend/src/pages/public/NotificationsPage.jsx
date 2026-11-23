import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Bell,CalendarDays,Check,ChevronRight,FileText,MessageCircle,RefreshCw,Search,ShieldCheck} from 'lucide-react';
import {Modal} from '../../components/PortalUI.jsx';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import ServiceRegistrationModal from '../../components/ServiceRegistrationModal.jsx';
import {Editor as PropertyEditor} from '../host/HostPropertyEditForm.jsx';
import {hostApi} from '../../services/host.js';
import {CopyPhoneButton,useViewingData,ViewingDetails,ViewingLoadState} from '../../components/ViewingUI.jsx';
import {useAuth} from '../../context/AuthContext.jsx';
import {useViewingUpdates} from '../../hooks/useViewingUpdates.js';
import {noticesApi} from '../../services/notices.js';
import {communityApi} from '../../services/community.js';
import {formatViewingDate} from '../../services/viewings.js';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/notification-center.css';

const categories={ALL:'Tất cả',UNREAD:'Chưa đọc',VIEWING:'Lịch xem phòng',APPLICATION:'Đơn duyệt',COMMUNITY:'Cộng đồng',ADMIN:'Từ Admin'};
const kinds={APPROVED:'Đã duyệt',NEEDS_SUPPLEMENT:'Yêu cầu bổ sung',REJECTED:'Đã từ chối',CANCELLED:'Đã hủy',COMMENT:'Bình luận bài đăng',REPLY:'Phản hồi bình luận',REQUESTED:'Yêu cầu mới',EXPIRED:'Quá hạn',ANNOUNCEMENT:'Thông báo Admin'};
const icons={VIEWING:CalendarDays,APPLICATION:FileText,COMMUNITY:MessageCircle,ADMIN:ShieldCheck};
const dayKey=value=>value.slice(0,10);
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
function NoticeViewing({item,onContactChange}){const load=useCallback(signal=>noticesApi.viewing(item.id,signal),[item.id]);const {data,error,reload}=useViewingData(load,item.id);return data?<ViewingDetails item={data} host={item.target?.startsWith('/host')} onContactChange={onContactChange} compact/>:<ViewingLoadState error={error} retry={reload}/>;}
function PropertySupplement({id,onClose}){const load=useCallback(signal=>hostApi.propertyEdit(id,signal),[id]);const {data,error,reload}=useViewingData(load,id);return <Modal className="notice-dialog" title={`Bổ sung hồ sơ #${id}`} onClose={onClose}><div className="notice-dialog-body">{data?<PropertyEditor snapshot={data} onDone={onClose}/>:<ViewingLoadState error={error} retry={reload}/>}</div></Modal>;}

export default function NotificationsPage({host=false}){
 const {user}=useAuth();
 const [params,setParams]=useSearchParams();
 const category=Object.hasOwn(categories,params.get('category'))?params.get('category'):params.get('unread')==='true'?'UNREAD':'ALL';
 const kind=params.get('kind')||'',query=params.get('q')||'';
 const [q,setQ]=useState(query);
 const setCategory=value=>setParams(previous=>{const next=new URLSearchParams(previous);next.set('category',value);next.delete('unread');next.delete('kind');return next;});
 const setKind=value=>setParams(previous=>{const next=new URLSearchParams(previous);if(value)next.set('kind',value);else next.delete('kind');return next;});
 const [revision,setRevision]=useState(0),[state,setState]=useState({items:[],loading:true}),[selected,setSelected]=useState(null),[supplement,setSupplement]=useState(null);
 const [contactPhone,setContactPhone]=useState(null); const [busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[reply,setReply]=useState(''),[success,setSuccess]=useState('');
 const next=useRef(()=>{}),sentinel=useRef(null),mutating=useRef(false),loadedPages=useRef(1),previousFilter=useRef('');
 const reload=()=>setRevision(v=>v+1);
 useViewingUpdates(user?.userId,reload);
 useEffect(()=>setQ(query),[query]);
 useEffect(()=>{if(q===query)return;const timer=setTimeout(()=>setParams(previous=>{const next=new URLSearchParams(previous);if(q.trim())next.set('q',q.trim());else next.delete('q');return next;},{replace:true}),300);return()=>clearTimeout(timer);},[q,query,setParams]);
 useEffect(()=>{
  const controller=new AbortController();let loading=false,more=true,cursor='',initial=true;
  const filter=JSON.stringify([category,kind,query]);const sameFilter=previousFilter.current===filter;const depth=sameFilter?loadedPages.current:1;
  previousFilter.current=filter;loadedPages.current=depth;
  setState(old=>sameFilter?{...old,loading:true}:{items:[],loading:true});
  next.current=async()=>{if(loading||!more||controller.signal.aborted)return;loading=true;setState(old=>({...old,loading:true,error:''}));
   try{let data,items=[];const pages=initial?depth:1;for(let i=0;i<pages;i++){data=await noticesApi.feed({category,kind,q:query,...(cursor?{before:cursor}:{})},controller.signal);items.push(...data.items);cursor=data.nextCursor;if(!cursor)break;}if(controller.signal.aborted)return;more=Boolean(cursor);const replacing=initial;initial=false;if(!replacing)loadedPages.current++;setState(old=>({...data,items:[...new Map([...(replacing?[]:old.items),...items].map(n=>[n.id,n])).values()],loading:false}));}
   catch(e){if(!controller.signal.aborted)setState(old=>({...old,loading:false,error:e.message}));}finally{loading=false;}
  };next.current();return()=>controller.abort();
 },[category,kind,query,revision]);
 useEffect(()=>{if(!state.nextCursor||state.loading||state.error||!window.IntersectionObserver)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))next.current();},{rootMargin:'250px'});if(sentinel.current)observer.observe(sentinel.current);return()=>observer.disconnect();},[state.nextCursor,state.loading,state.error]);
 async function mutate(action){if(mutating.current)return;mutating.current=true;setBusy(true);setActionError('');try{await action();}catch(e){setActionError(e.message);}finally{setBusy(false);mutating.current=false;}}
 function open(item){setContactPhone(null);setSelected(item);setReply('');setSuccess('');setActionError('');if(!item.read)mutate(async()=>{const updated=await noticesApi.read(item.id);setSelected(current=>current?.id===item.id?updated:current);reload();});}
 const content=<main className={`notice-center${host?' notice-host':''}`}>
  <nav className="notice-breadcrumb" aria-label="Đường dẫn"><Link to={host?'/host':'/'}>Trang chủ</Link><span>/</span><span>Thông báo</span></nav>
  <header className="notice-heading"><div><h1>Thông báo</h1><span className="notice-unread" aria-live="polite">{state.unreadCount??'…'} chưa đọc</span></div><div><button className="notice-button primary" disabled={busy||!state.unreadCount} onClick={()=>mutate(async()=>{await noticesApi.readAll();reload();})}><Check size={16}/>Đọc tất cả</button><button className="notice-button" disabled={state.loading} onClick={reload}><RefreshCw size={16}/>Làm mới</button></div></header>
  <section className="notice-filters" aria-label="Lọc thông báo"><div>{Object.entries(categories).map(([key,label])=><button key={key} type="button" aria-pressed={category===key} onClick={()=>setCategory(key)}>{label}<span>{state.counts?.[key]??(state.loading?'…':0)}</span></button>)}</div><label><Search size={16}/><input aria-label="Tìm thông báo" placeholder="Tìm tên, mã #…" value={q} maxLength={100} onChange={e=>setQ(e.target.value)}/></label></section>
  {['APPLICATION','COMMUNITY'].includes(category)&&<div className="notice-subfilters" role="group" aria-label="Loại thông báo">{[['',category==='APPLICATION'?'Tất cả đơn':'Tất cả'],...(category==='APPLICATION'?['APPROVED','NEEDS_SUPPLEMENT','CANCELLED','REJECTED']:['COMMENT','REPLY']).map(key=>[key,kinds[key]])].map(([key,label])=><button key={key} aria-pressed={kind===key} onClick={()=>setKind(key)}>{label}</button>)}</div>}
  {actionError&&<p role="alert" className="notice-error">{actionError}</p>}
  <section aria-label="Danh sách thông báo" aria-busy={state.loading}>{state.items.map((item,index)=>{const Icon=icons[item.category]||Bell;const day=dayKey(item.createdAt);return <div key={item.id}>{(index===0||dayKey(state.items[index-1].createdAt)!==day)&&<h2 className="notice-day">{day===today()?'Hôm nay · ':''}{day.split('-').reverse().join('/')}</h2>}<article className={`notice-card${item.read?'':' unread'}`}><span className="notice-dot" aria-label={item.read?'Đã đọc':'Chưa đọc'}/><span className={`notice-icon ${item.category.toLowerCase()}`}><Icon size={25}/></span><button className="notice-content" disabled={busy} onClick={()=>open(item)}><span><strong>{item.title}</strong><em>{kinds[item.kind]||item.kind}</em>{item.referenceId&&<small>#{item.referenceId}</small>}</span><span>{item.content} · {formatViewingDate(item.createdAt)}</span></button><button className="notice-button notice-open" disabled={busy} onClick={()=>open(item)}>Chi tiết<ChevronRight size={15}/></button><button className={`notice-button ${item.read?'':'primary'}`} aria-label={item.read?'Đã đọc':'Đánh dấu đã đọc'} disabled={busy||item.read} onClick={()=>mutate(async()=>{await noticesApi.read(item.id);reload();})}><Check size={16}/></button></article></div>;})}</section>
  {state.error&&<p className="notice-error" role="alert">{state.error}<button className="notice-button" onClick={()=>next.current()}>Thử lại</button></p>}
  {state.loading&&<p role="status">Đang tải thông báo…</p>}{!state.loading&&!state.error&&!state.items.length&&<p className="notice-empty">Không có thông báo phù hợp.</p>}
  <div ref={sentinel}>{state.nextCursor&&!state.loading&&!state.error&&<button className="notice-button" onClick={()=>next.current()}>Tải thêm thông báo</button>}</div>
  {selected&&<Modal className="notice-dialog" title={`${categories[selected.category]}${selected.referenceId?' #'+selected.referenceId:''}`} onClose={()=>setSelected(null)}><div className="notice-dialog-body"><h3>{selected.title}</h3><span className="notice-kind">{kinds[selected.kind]||selected.kind} · {selected.read?'Đã đọc':'Đang đánh dấu đã đọc'}</span>
   {selected.category==='VIEWING'?<NoticeViewing item={selected} onContactChange={setContactPhone}/>:selected.category==='ADMIN'?<><ul>{selected.content.split(/\n+/).filter(Boolean).map((text,i)=><li key={i}>{text}</li>)}</ul>{selected.quote&&<p>Thời gian áp dụng: {selected.quote}</p>}</>:<>{selected.quote&&<blockquote>{selected.quote}</blockquote>}<p className="notice-full-text">{selected.content}</p></>}
   {selected.category==='COMMUNITY'&&<label className="notice-reply">Phản hồi nhanh<textarea value={reply} maxLength={2000} rows={3} onChange={e=>setReply(e.target.value)} disabled={busy}/></label>}
   {success&&<p role="status">{success}</p>}{actionError&&<p role="alert" className="notice-error">{actionError}</p>}</div>
   <footer><button className="notice-button" onClick={()=>setSelected(null)}>Đóng</button>{selected.category==='VIEWING'&&contactPhone?<CopyPhoneButton phone={contactPhone}/>:selected.category==='COMMUNITY'?<button className="notice-button primary" disabled={busy||!reply.trim()} onClick={()=>mutate(async()=>{if(selected.commentId)await communityApi.reply(selected.postId,selected.commentId,reply.trim());else await communityApi.addComment(selected.postId,reply.trim());setReply('');setSuccess('Đã gửi phản hồi.');})}>{busy?'Đang gửi…':'Gửi phản hồi'}</button>:selected.category==='APPLICATION'&&selected.kind==='NEEDS_SUPPLEMENT'&&(selected.target?.startsWith('/services')||selected.target?.startsWith('/host/property/edit'))?<button className="notice-button primary" onClick={()=>{setSupplement(selected);setSelected(null);}}>Bổ sung hồ sơ</button>:selected.target&&<Link className="notice-button primary" to={selected.target}>Xem {selected.category==='VIEWING'?'lịch hẹn':'chi tiết'}</Link>}{selected.category==='ADMIN'&&<button className="notice-button primary" onClick={()=>setSelected(null)}>Đã hiểu</button>}</footer></Modal>}
  {supplement&&(supplement.target.startsWith('/services')?<ServiceRegistrationModal applicationId={supplement.referenceId} onClose={()=>{setSupplement(null);reload();}}/>:<PropertySupplement id={supplement.referenceId} onClose={()=>{setSupplement(null);reload();}}/>)}
 </main>;
 return host?content:<DetailPrototypeShell className="prototype-notifications">{content}</DetailPrototypeShell>;
}
