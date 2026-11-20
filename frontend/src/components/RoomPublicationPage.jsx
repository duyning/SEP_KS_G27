import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Eye,EyeOff,ArrowLeft,Check,LoaderCircle} from 'lucide-react';
import {hostApi} from '../services/host.js';
import {MotionButton} from './motion/MotionUI.jsx';
import HostManagementShell from './HostManagementShell.jsx';
import '../styles/room-publication.css';

export default function RoomPublicationPage({property,rooms,onSaved}) {
 const [selected,setSelected]=useState(()=>new Set(rooms.filter(r=>r.publicVisible).map(r=>r.roomId)));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const request=useRef();useEffect(()=>()=>request.current?.abort(),[]);
 const toggle=id=>{setSaved(false);setSelected(previous=>{const next=new Set(previous);next.has(id)?next.delete(id):next.add(id);return next;});};
 async function save(){if(request.current)return;const c=new AbortController();request.current=c;setBusy(true);setError('');setSaved(false);
  try{const updated=await hostApi.publishRooms({propertyId:property.propertyId,roomIds:[...selected]},c.signal);if(!c.signal.aborted){onSaved(updated);setSaved(true);}}
  catch(e){if(!c.signal.aborted)setError(e.message);}finally{if(request.current===c)request.current=null;if(!c.signal.aborted)setBusy(false);}
 }
 const enabled=property.status==='ACTIVE';
 return <HostManagementShell activePath="/host/rooms"><section className="rp-page">
  <Link className="hm-btn hm-btn-subtle" to={`/host/rooms?propertyId=${property.propertyId}`}><ArrowLeft size={16}/>Danh sách phòng</Link>
  <header><span className="rp-icon"><Eye size={24}/></span><div><h1>Chọn phòng công khai</h1><p>{property.name}</p></div></header>
  <p>Chọn những phòng bạn muốn giới thiệu cho người thuê. Phòng không chọn vẫn được giữ trong danh sách quản lý.</p>
  <div className="rp-notice"><EyeOff size={18}/><span>Nhà trọ chỉ xuất hiện với người thuê khi hồ sơ đã được duyệt và có ít nhất một phòng được chọn công khai.</span></div>
  {!enabled&&<p role="alert">Nhà trọ cần được phê duyệt và đang hoạt động trước khi công khai phòng.</p>}
  <div className="rp-selection"><label><input type="checkbox" disabled={busy||!enabled||!rooms.length} checked={rooms.length>0&&selected.size===rooms.length} ref={el=>{if(el)el.indeterminate=selected.size>0&&selected.size<rooms.length;}} onChange={()=>{setSelected(selected.size===rooms.length?new Set():new Set(rooms.map(r=>r.roomId)));setSaved(false);}}/>Chọn tất cả ({rooms.length})</label><strong>{selected.size} phòng được chọn</strong></div>
  {rooms.length ? <div className="rp-grid">{rooms.map(room=><label className={`rp-room ${selected.has(room.roomId)?'is-selected':''}`} key={room.roomId}>
   <input type="checkbox" aria-label={`Công khai phòng ${room.roomNumber}`} checked={selected.has(room.roomId)} disabled={busy||!enabled} onChange={()=>toggle(room.roomId)}/>
   <span><strong>{room.roomNumber}</strong><small>{room.floor} · {room.roomType}</small><small>{room.status==='VACANT'?'Còn trống':'Đang thuê'}</small></span>
   <span className="rp-visibility">{selected.has(room.roomId)?<><Eye size={14}/>Công khai</>:<><EyeOff size={14}/>Riêng tư</>}</span>
  </label>)}</div>:<div className="rp-empty"><h2>Chưa có phòng để công khai</h2><p>Tạo loại phòng và danh sách phòng trước khi chọn phòng công khai.</p><Link className="hm-btn hm-btn-primary" to={`/host/room-types?propertyId=${property.propertyId}`}>Thêm loại phòng &amp; danh sách phòng</Link></div>}
  {error&&<p className="rp-error" role="alert">{error}</p>}
  {saved&&<p className="rp-success" role="status"><Check size={16}/>{selected.size?'Đã lưu các phòng công khai.':'Đã ẩn tất cả phòng và nhà trọ khỏi trang người thuê.'}</p>}
  <footer><p>{selected.size?`${selected.size}/${rooms.length} phòng sẽ hiển thị với người thuê.`:'Không có phòng nào được công khai.'}</p><MotionButton className="hm-btn hm-btn-primary" disabled={busy||!enabled||!rooms.length} onClick={save}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>}Lưu phòng công khai</MotionButton></footer>
 </section></HostManagementShell>;
}
