import {useEffect,useState} from 'react';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {Check,ChevronLeft,ChevronRight,Clipboard,ImageOff,LoaderCircle,Phone} from 'lucide-react';
import {accommodationApi} from '../../services/accommodations.js';
import {toDetailPrototype} from '../../services/detail-prototype.js';
import {useAuth} from '../../context/AuthContext.jsx';
import ViewingRequestForm from '../../components/detail/ViewingRequestForm.jsx';
import {canRequestViewing,viewingApi} from '../../services/viewings.js';
import {Modal,useToast} from '../../components/PortalUI.jsx';
import {AnimatePresence,MotionButton} from '../../components/motion/MotionUI.jsx';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import {DetailImage} from '../../components/detail/DetailPrototypeParts.jsx';
import DetailPrototype from './DetailPrototype.jsx';
import '../../styles/home-prototype.css';
import '../../styles/detail-prototype.css';
import '../../styles/detail-prototype-integration.css';

const savedKey='hlrcs:public-saved-properties';
function savedProperties(){try{const value=JSON.parse(localStorage.getItem(savedKey)||'[]');return Array.isArray(value)?value.filter(Number.isInteger):[]}catch{return []}}
function DetailContent({item}){
 const {user,loading}=useAuth();
 const room=toDetailPrototype(item),notify=useToast(),navigate=useNavigate(),location=useLocation();
 const [saved,setSaved]=useState(savedProperties),[photo,setPhoto]=useState(null),[modal,setModal]=useState(null),[reportReason,setReportReason]=useState('Thông tin giá thuê'),[reportNote,setReportNote]=useState('');
 useEffect(()=>{if(['#host-contact','#room-type-details'].includes(location.hash))document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'});},[location.hash]);
 useEffect(()=>{document.title=`${room.title} | HL_RCS Hòa Lạc`;},[room.title]);
 useEffect(()=>{const update=()=>setSaved(savedProperties());window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update)},[]);
 useEffect(()=>{if(photo==null)return;const keydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setPhoto(value=>(value+(e.key==='ArrowLeft'?-1:1)+room.gallery.length)%room.gallery.length)}};window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown)},[photo,room.gallery.length]);
 function save(propertyId=item.propertyId){const next=saved.includes(propertyId)?saved.filter(id=>id!==propertyId):[...saved,propertyId];try{localStorage.setItem(savedKey,JSON.stringify(next));setSaved(next);notify(next.includes(propertyId)?'Đã lưu nhà trọ trên thiết bị này.':'Đã bỏ lưu nhà trọ trên thiết bị này.')}catch{notify('Thiết bị không cho phép lưu. Vui lòng kiểm tra quyền lưu trữ.','error')}}
 async function copy(text,success){try{await navigator.clipboard.writeText(text);notify(success);return true}catch{notify('Không thể sao chép tự động. Bạn có thể chọn và sao chép nội dung.','error');return false}}
 const viewerId=canRequestViewing(user)?user.userId:null;
 const [pendingState,setPendingState]=useState(null),[pendingRevision,setPendingRevision]=useState(0);
 useEffect(()=>{
  if(!viewerId)return;
  const controller=new AbortController();
  viewingApi.pending(item.propertyId,item.roomTypeId,controller.signal).then(value=>{
   if(!controller.signal.aborted)setPendingState({viewerId,pendingRevision,value});
  }).catch(error=>{
   if(!controller.signal.aborted)setPendingState({viewerId,pendingRevision,error:error.message});
  });
  return()=>controller.abort();
 },[viewerId,item.propertyId,item.roomTypeId,pendingRevision]);
 const currentPending=pendingState?.viewerId===viewerId&&pendingState?.pendingRevision===pendingRevision?pendingState:null;
 const pending=currentPending?.value;
 const checking=loading||Boolean(viewerId&&!currentPending);
 const scheduleLabel=checking?'Đang kiểm tra lịch…':currentPending?.error?'Kiểm tra lại lịch':pending?'Cập nhật lịch xem phòng':'Đặt lịch xem phòng';
 const schedule=()=>{
  if(checking)return;
  if(currentPending?.error){
   setPendingRevision(value=>value+1);
   return;
  }
  if(!user){
   navigate('/login',{state:{from:location.pathname+location.search+'#dat-lich-xem'}});
  }else if(canRequestViewing(user)){
   setModal('schedule');
  }else{
   notify('Chỉ tài khoản thành viên hoặc chủ trọ có thể gửi lịch xem phòng.','error');
  }
 };
 useEffect(()=>{
  if(location.hash==='#dat-lich-xem'&&viewerId&&currentPending&&!currentPending.error){
   setModal('schedule');
   navigate(location.pathname+location.search,{replace:true});
  }
 },[location.hash,location.pathname,location.search,navigate,viewerId,currentPending]);
 const back=()=>{if(window.history.state?.idx>0)navigate(-1);else navigate('/search')};
 return <DetailPrototypeShell savedCount={saved.length}><DetailPrototype {...{room,item}} isWishlisted={saved.includes(item.propertyId)} onSave={()=>save()} savedIds={saved} onSaveSimilar={save} onShare={()=>setModal('share')} onReport={()=>setModal('report')} onSchedule={schedule} scheduleLabel={scheduleLabel} scheduleDisabled={checking} onPhoto={index=>{if(room.gallery.length)setPhoto(Math.min(index,room.gallery.length-1))}} onBack={back}/>
 <AnimatePresence>{photo!=null&&<Modal title={`Hình ảnh nhà trọ · ${photo+1}/${room.gallery.length}`} className="detail-prototype-modal detail-lightbox" onClose={()=>setPhoto(null)}><div className="detail-lightbox-stage"><MotionButton type="button" className="detail-photo-nav" aria-label="Ảnh trước" disabled={room.gallery.length<2} onClick={()=>setPhoto(v=>(v-1+room.gallery.length)%room.gallery.length)}><ChevronLeft/></MotionButton><DetailImage src={room.gallery[photo]?.url} alt={`${room.title} - ảnh ${photo+1}`}/><MotionButton type="button" className="detail-photo-nav" aria-label="Ảnh kế tiếp" disabled={room.gallery.length<2} onClick={()=>setPhoto(v=>(v+1)%room.gallery.length)}><ChevronRight/></MotionButton></div><p>{room.gallery[photo]?.caption||room.title}</p><div className="detail-photo-thumbs">{room.gallery.map((image,index)=><MotionButton key={image.url} type="button" aria-label={`Ảnh ${index+1}`} aria-pressed={photo===index} onClick={()=>setPhoto(index)}><DetailImage src={image.url} alt={`Ảnh thu nhỏ ${index+1}`}/></MotionButton>)}</div></Modal>}</AnimatePresence>
 <AnimatePresence>{modal==='schedule'&&canRequestViewing(user)&&<ViewingRequestForm item={item} user={user} pending={pending} onClose={()=>{setModal(null);setPendingRevision(value=>value+1)}}/>}</AnimatePresence>
 <AnimatePresence>{modal==='share'&&<Modal title="Chia sẻ phòng trọ" className="detail-prototype-modal" onClose={()=>setModal(null)}><p className="detail-modal-subtitle">Gửi liên kết để bạn bè cùng tham khảo nhà trọ.</p><label className="detail-share-label">Liên kết phòng trọ<input readOnly value={window.location.href} aria-label="Liên kết phòng trọ" onFocus={e=>e.target.select()}/></label><div className="detail-modal-actions"><MotionButton className="p-button" onClick={()=>setModal(null)}>Đóng</MotionButton><MotionButton className="p-button primary" onClick={()=>copy(window.location.href,'Đã sao chép liên kết phòng trọ.')}><Clipboard size={16}/>Sao chép liên kết</MotionButton></div></Modal>}</AnimatePresence>
 <AnimatePresence>{modal==='report'&&<Modal title="Báo cáo thông tin nhà trọ" className="detail-prototype-modal" onClose={()=>setModal(null)}><p className="detail-modal-subtitle">{room.title}</p><fieldset className="detail-report-reasons"><legend>Thông tin cần phản ánh</legend>{['Thông tin giá thuê','Địa chỉ / vị trí không chính xác','Hình ảnh không đúng thực tế','Thông tin liên hệ','Vấn đề khác'].map(reason=><label key={reason}><input type="radio" name="detail-report-reason" checked={reportReason===reason} onChange={()=>setReportReason(reason)}/>{reason}</label>)}</fieldset><label className="detail-share-label" htmlFor="detail-report-note">Nội dung phản ánh<textarea id="detail-report-note" rows={4} maxLength={2000} value={reportNote} onChange={e=>setReportNote(e.target.value)} placeholder="Mô tả rõ thông tin bạn muốn phản ánh..."/></label><div className="detail-info-note">Chức năng gửi báo cáo trực tuyến chưa được mở. Bạn có thể sao chép nội dung và liên hệ hotline hỗ trợ.</div><div className="detail-modal-actions"><a className="p-button" href="tel:0912345678"><Phone size={16}/>Hotline hỗ trợ</a><MotionButton className="p-button primary" onClick={()=>copy(`${room.title}\n${window.location.href}\n${reportReason}\n${reportNote}`,'Đã sao chép nội dung phản ánh.')}><Clipboard size={16}/>Sao chép nội dung</MotionButton></div></Modal>}</AnimatePresence>
 </DetailPrototypeShell>;
}
export default function AccommodationDetailPage(){
 const [params]=useSearchParams(),propertyId=params.get('propertyId'),roomTypeId=params.get('roomTypeId'),key=`${propertyId}/${roomTypeId}`;
 const [revision,setRevision]=useState(0),[state,setState]=useState({key,data:null,loading:true,error:''});
 useEffect(()=>{const controller=new AbortController();setState({key,data:null,loading:true,error:''});accommodationApi.detail(propertyId,roomTypeId,controller.signal).then(data=>{if(!controller.signal.aborted)setState({key,data,loading:false,error:''})}).catch(error=>{if(!controller.signal.aborted)setState({key,data:null,loading:false,error:error.message})});return()=>controller.abort()},[key,propertyId,roomTypeId,revision]);
 if(state.loading||state.key!==key)return <DetailPrototypeShell><main className="detail-load-state" role="status"><LoaderCircle className="spin"/><p>Đang tải thông tin chi tiết phòng trọ...</p></main></DetailPrototypeShell>;
 if(state.error)return <DetailPrototypeShell><main className="detail-load-state" role="alert"><ImageOff size={36}/><h1>Không thể xem phòng trọ</h1><p>{state.error}</p><div><MotionButton className="p-button primary" onClick={()=>setRevision(v=>v+1)}>Thử lại</MotionButton><Link className="p-button" to="/search">Về danh sách</Link></div></main></DetailPrototypeShell>;
 return <DetailContent item={state.data} key={key}/>;
}
