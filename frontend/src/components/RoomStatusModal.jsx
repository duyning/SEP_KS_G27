import {useEffect,useRef,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {Modal} from './PortalUI.jsx';
import {MotionButton} from './motion/MotionUI.jsx';
import {hostApi} from '../services/host.js';
import {validateLeaseDates} from '../services/rooms.js';
import RoomLeaseFields from './RoomLeaseFields.jsx';
import '../styles/room-modals.css';

export default function RoomStatusModal({rooms,propertyId,initialStatus='OCCUPIED',onClose,onSaved}){
 const [data,setData]=useState({status:initialStatus,leaseStartDate:rooms.length===1?rooms[0].leaseStartDate||'':'',leaseEndDate:rooms.length===1?rooms[0].leaseEndDate||'':''});
 const [errors,setErrors]=useState({}),[failure,setFailure]=useState(''),[busy,setBusy]=useState(false);
 const request=useRef(),form=useRef();
 useEffect(()=>()=>request.current?.abort(),[]);
 const update=(key,value)=>{setData(previous=>({...previous,[key]:value}));setErrors({});setFailure('');};
 const submit=async event=>{
  event.preventDefault();if(request.current)return;
  const invalid=validateLeaseDates(data);setErrors(invalid);
  if(Object.keys(invalid).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid=true]')?.focus());return;}
  const controller=new AbortController();request.current=controller;setBusy(true);setFailure('');
  try{
   const saved=await hostApi.updateRoomStatuses({propertyId,roomIds:rooms.map(room=>room.roomId),status:data.status,leaseStartDate:data.status==='OCCUPIED'?data.leaseStartDate:null,leaseEndDate:data.status==='OCCUPIED'?data.leaseEndDate:null},controller.signal);
   if(!controller.signal.aborted)onSaved(saved);
  }catch(error){if(!controller.signal.aborted)setFailure(error.message);}
  finally{if(request.current===controller)request.current=null;if(!controller.signal.aborted)setBusy(false);}
 };
 return <Modal className="hr-editor hm-status-modal" title={`Cập nhật trạng thái ${rooms.length} phòng`} onClose={()=>{if(!busy)onClose();}}>
  <form ref={form} onSubmit={submit} noValidate aria-busy={busy}>
   <fieldset disabled={busy} className="rm-form-lock">
    <p className="rm-muted">{rooms.slice(0,8).map(room=>room.roomNumber).join(', ')}{rooms.length>8?` và ${rooms.length-8} phòng khác`:''}</p>
    <div className="hr-field"><label htmlFor="bulk-room-status">Trạng thái mới</label><select id="bulk-room-status" value={data.status} onChange={event=>update('status',event.target.value)}><option value="VACANT">Còn trống</option><option value="OCCUPIED">Đang thuê</option></select></div>
    {data.status==='OCCUPIED'?<><RoomLeaseFields data={data} onChange={update} errors={errors} prefix="bulk"/><p className="rm-muted">Khoảng thời gian này áp dụng cho tất cả phòng đã chọn. Nếu ngày thuê khác nhau, hãy chia thành từng nhóm phòng.</p></>:<p className="rm-muted">Phòng sẽ sẵn sàng đón khách thuê. Khoảng ngày thuê hiện tại của các phòng đã chọn sẽ được xóa.</p>}
   </fieldset>
   {failure&&<p className="hr-error" role="alert">{failure}</p>}
   <footer className="hr-modal-footer"><MotionButton type="button" className="p-button" disabled={busy} onClick={onClose}>Hủy</MotionButton><MotionButton type="submit" className="p-button primary" disabled={busy}>{busy?<><LoaderCircle size={15} className="spin"/>Đang cập nhật…</>:`Cập nhật ${rooms.length} phòng`}</MotionButton></footer>
  </form>
 </Modal>;
}
