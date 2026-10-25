import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, money } from '../services/room-types.js';
import { editRoom, emptyRoom, roomPayload, validateRoom } from '../services/rooms.js';

export default function RoomEditorModal({types,defaultTypeId,room,onClose,onSaved}) {
  const [data,setData]=useState(()=>room?editRoom(room):emptyRoom(defaultTypeId));
  const [errors,setErrors]=useState({});const [failure,setFailure]=useState('');const [busy,setBusy]=useState(false);
  const request=useRef();const form=useRef();
  useEffect(()=>()=>request.current?.abort(),[]);
  const type=types.find(item=>String(item.roomTypeId)===data.roomTypeId);
  const update=(key,value)=>{setData(previous=>({...previous,[key]:value}));setErrors(previous=>({...previous,[key]:undefined}));};
  const input=key=>({id:`room-${key}`,value:data[key],onChange:event=>update(key,event.target.value),'aria-invalid':Boolean(errors[key]),'aria-describedby':errors[key]?`room-error-${key}`:undefined});
  const error=key=>errors[key]&&<p className="hr-field-error" id={`room-error-${key}`} role="alert">{errors[key]}</p>;
  const submit=async event=>{
    event.preventDefault();if(request.current)return;
    const invalid=validateRoom(data,types);setErrors(invalid);setFailure('');
    if(Object.keys(invalid).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid=true]')?.focus());return;}
    const controller=new AbortController();request.current=controller;setBusy(true);
    try{const saved=await hostApi.saveRoom(room?.roomId??null,roomPayload(data),controller.signal);if(!controller.signal.aborted)onSaved(saved);}
    catch(cause){if(!controller.signal.aborted){setFailure(cause.message);setErrors(cause.fields||{});}}
    finally{if(request.current===controller)request.current=null;if(!controller.signal.aborted)setBusy(false);}
  };
  return <Modal className="hr-editor" title={room?'Cập nhật phòng thực tế':'Thêm phòng thực tế mới'} onClose={()=>{if(!busy)onClose();}}>
    <p className="hr-modal-subtitle">Phòng sẽ tự động kế thừa đơn giá, diện tích và tiện nghi từ loại phòng được chọn.</p>
    <form onSubmit={submit} noValidate ref={form} aria-busy={busy}><fieldset disabled={busy}>
      <div className="hr-field"><label htmlFor="room-roomTypeId">Loại phòng liên kết <span>(Bắt buộc)</span> <b>*</b></label><select {...input('roomTypeId')} autoFocus required><option value="">Chọn loại phòng đã có</option>{types.map(item=><option key={item.roomTypeId} value={item.roomTypeId}>{item.roomType} ({money(item.price)}/tháng)</option>)}</select>{error('roomTypeId')}</div>
      {type&&<section className="hr-inherited"><h3><Check size={15}/>Thông tin kế thừa từ loại phòng này</h3><dl>{[['Giá niêm yết',`${money(type.price)}/tháng`],['Diện tích',type.areaSqm==null?'Chưa cập nhật':`${type.areaSqm} m²`],['Sức chứa',type.capacity==null?'Chưa cập nhật':`${type.capacity} người`],['Tiền cọc',money(type.deposit)]].map(([label,value])=><div key={label}><dt>{label}:</dt><dd>{value}</dd></div>)}</dl><p>Tiện ích: {type.amenities?.length?type.amenities.map(key=>ROOM_AMENITIES.find(([value])=>key===value)?.[1]||key).join(', '):'Chưa cập nhật'}</p></section>}
      <div className="hr-form-grid"><div className="hr-field"><label htmlFor="room-roomNumber">Số phòng / Ký hiệu phòng <b>*</b></label><input {...input('roomNumber')} placeholder="Ví dụ: P.101" maxLength={30} required/><small>Phải là duy nhất trong nhà trọ này.</small>{error('roomNumber')}</div><div className="hr-field"><label htmlFor="room-floor">Tầng / Khu vực <b>*</b></label><select {...input('floor')}>{!['Tầng trệt','Tầng hầm',...Array.from({length:50},(_,i)=>`Tầng ${i+1}`)].includes(data.floor)&&<option value={data.floor}>{data.floor}</option>}<option>Tầng trệt</option><option>Tầng hầm</option>{Array.from({length:50},(_,index)=><option key={index+1}>Tầng {index+1}</option>)}</select>{error('floor')}</div></div>
      <fieldset className="hr-status-field"><legend>Tình trạng thực tế hiện tại</legend><div className="hr-status-options">{[['VACANT','Còn trống','Phòng sẵn sàng đón khách thuê vào ở ngay'],['OCCUPIED','Đã có người thuê','Đang có khách lưu trú ổn định']].map(([value,label,hint])=><label key={value} className={data.status===value?'selected':''}><input type="radio" name="room-status" checked={data.status===value} onChange={()=>update('status',value)}/><span><strong>{label}</strong><small>{hint}</small></span></label>)}</div>{error('status')}</fieldset>
      <label className="hr-custom-toggle"><input type="checkbox" checked={data.overridePrice} onChange={event=>update('overridePrice',event.target.checked)}/>Tùy chỉnh giá thuê riêng cho phòng này (mặc định lấy theo Loại phòng)</label>
      {data.overridePrice&&<div className="hr-field"><label htmlFor="room-customPrice">Giá thuê riêng (đ/tháng) <b>*</b></label><input {...input('customPrice')} inputMode="numeric" placeholder="Ví dụ: 2400000"/>{error('customPrice')}</div>}{!data.overridePrice&&error('customPrice')}
    </fieldset>{failure&&<p className="hr-error" role="alert">{failure}</p>}<footer className="hr-modal-footer"><button type="button" className="p-button" disabled={busy} onClick={onClose}>Hủy bỏ</button><button type="submit" className="p-button primary" disabled={busy}>{busy?<><LoaderCircle size={15} className="spin"/>Đang lưu...</>:'Lưu phòng'}</button></footer></form>
  </Modal>;
}
