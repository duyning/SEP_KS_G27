import { MotionButton } from './motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, Wallet } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, money } from '../services/room-types.js';
import '../styles/room-modals.css';
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
  return <Modal className="hr-editor rm-dialog" title={room?'Cập nhật phòng thực tế':'Thêm phòng thực tế mới'} onClose={()=>{if(!busy)onClose();}}>
    <p className="hr-modal-subtitle">Cập nhật thông tin phòng, tình trạng thực tế và giá thuê áp dụng.</p>
    <form onSubmit={submit} noValidate ref={form} aria-busy={busy}><div className="rm-scroll"><fieldset disabled={busy} className="rm-form-lock">
      <div className="rm-editor-grid"><section className="rm-section"><header><h3>Thông tin phòng</h3></header>
      <div className="hr-field"><label htmlFor="room-roomTypeId">Loại phòng liên kết <b>*</b></label><select {...input('roomTypeId')} autoFocus required><option value="">Chọn loại phòng đã có</option>{types.map(item=><option key={item.roomTypeId} value={item.roomTypeId}>{item.roomType} ({money(item.price)}/tháng)</option>)}</select>{error('roomTypeId')}</div>

      <div className="hr-form-grid"><div className="hr-field"><label htmlFor="room-roomNumber">Số phòng / Ký hiệu phòng <b>*</b></label><input {...input('roomNumber')} placeholder="Ví dụ: P.101" maxLength={30} required/><small>Phải là duy nhất trong nhà trọ này.</small>{error('roomNumber')}</div><div className="hr-field"><label htmlFor="room-floor">Tầng / Khu vực <b>*</b></label><select {...input('floor')}>{!['Tầng trệt','Tầng hầm',...Array.from({length:50},(_,i)=>`Tầng ${i+1}`)].includes(data.floor)&&<option value={data.floor}>{data.floor}</option>}<option>Tầng trệt</option><option>Tầng hầm</option>{Array.from({length:50},(_,index)=><option key={index+1}>Tầng {index+1}</option>)}</select>{error('floor')}</div></div>
      </section><section className="rm-section rm-inherited"><header><h3><Check size={15}/>Cấu hình từ loại phòng</h3></header>{type?<><dl className="rm-facts">{[['Giá niêm yết',`${money(type.price)} / tháng`],['Diện tích',type.areaSqm==null?'Chưa cập nhật':`${type.areaSqm} m²`],['Sức chứa',type.capacity==null?'Chưa cập nhật':`${type.capacity} người`],['Tiền đặt cọc',money(type.deposit)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><details className="rm-amenity-details"><summary>{type.amenities?.length||0} tiện nghi từ loại phòng</summary><ul className="rm-amenities">{(type.amenities||[]).map(key=><li key={key}><Check size={14}/>{ROOM_AMENITIES.find(([value])=>value===key)?.[1]||key}</li>)}</ul>{!type.amenities?.length&&<p className="rm-muted">Chưa cập nhật tiện nghi.</p>}</details></>:<p className="rm-muted">Chọn loại phòng để xem cấu hình kế thừa.</p>}</section></div>
      <div className="rm-editor-grid"><section className="rm-section rm-status-section"><header><h3>Tình trạng thực tế</h3></header>
      <fieldset className="hr-status-field"><legend className="rm-sr-only">Tình trạng thực tế hiện tại</legend><div className="hr-status-options">{[['VACANT','Còn trống','Phòng sẵn sàng đón khách thuê vào ở ngay'],['OCCUPIED','Đã có người thuê','Đang có khách lưu trú ổn định']].map(([value,label,hint])=><label key={value} className={data.status===value?'selected':''}><input type="radio" name="room-status" checked={data.status===value} onChange={()=>update('status',value)}/><span><strong>{label}</strong><small>{hint}</small></span></label>)}</div>{error('status')}</fieldset>
      </section><section className="rm-section"><header><h3><Wallet size={16}/>Giá thuê áp dụng</h3></header>
      <label className="hr-custom-toggle"><input type="checkbox" checked={data.overridePrice} onChange={event=>update('overridePrice',event.target.checked)}/><span><strong>Đặt giá riêng cho phòng</strong><small>Bỏ chọn để sử dụng giá của loại phòng.</small></span></label>
      {data.overridePrice&&<div className="hr-field"><label htmlFor="room-customPrice">Giá thuê riêng (đ/tháng) <b>*</b></label><input {...input('customPrice')} inputMode="numeric" maxLength={9} required placeholder="Nhập giá thuê riêng"/>{error('customPrice')}</div>}{!data.overridePrice&&error('customPrice')}
      <div className="rm-effective-price"><span>Giá sẽ áp dụng</span><output htmlFor="room-customPrice room-roomTypeId">{data.overridePrice?(/^\d+$/.test(data.customPrice)&&+data.customPrice>0&&+data.customPrice<=999999999?`${money(+data.customPrice)} / tháng`:'Nhập giá riêng hợp lệ'):type?`${money(type.price)} / tháng`:'Chưa chọn loại phòng'}</output></div>
      </section></div>
    </fieldset>{failure&&<p className="hr-error" role="alert">{failure}</p>}</div><footer className="hr-modal-footer rm-footer"><MotionButton type="button" className="p-button" disabled={busy} onClick={onClose}>Hủy bỏ</MotionButton><MotionButton type="submit" className="p-button primary" disabled={busy}>{busy?<><LoaderCircle size={15} className="spin"/>Đang lưu...</>:'Lưu phòng'}</MotionButton></footer></form>
  </Modal>;
}
