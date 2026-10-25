import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Trash2, Upload } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, editRoomType, emptyRoomType, money, roomTypePayload, validateRoomPhotos, validateRoomType } from '../services/room-types.js';
import RoomTypePhoto from './RoomTypePhoto.jsx';

function LocalPhoto({file}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{const value=URL.createObjectURL(file);setUrl(value);return()=>URL.revokeObjectURL(value);},[file]);
  return <img src={url||undefined} alt={file.name}/>;
}

export default function RoomTypeCreateModal({ property, onClose, onCreated, type = null }) {
  const [data, setData] = useState(()=>type?editRoomType(type):emptyRoomType());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef();
  const form = useRef();
  const filePicker = useRef();
  const addPhotos = event => {
    const files=Array.from(event.target.files||[]);event.target.value='';
    const combined=[...data.photos];
    for(const file of files)if(!combined.some(item=>item.name===file.name&&item.size===file.size&&item.lastModified===file.lastModified))combined.push(file);
    const failure=validateRoomPhotos(combined,data.retainedImages);
    if(failure){setErrors(previous=>({...previous,photos:failure}));return;}
    update('photos',combined);
  };
  useEffect(() => () => request.current?.abort(), []);
  const update = (name,value) => { setData(previous => ({ ...previous, [name]:value })); setErrors(previous => ({ ...previous, [name]:undefined })); };
  const input = name => ({ id:`rt-${name}`, name, value:data[name], disabled:busy, onChange:event=>update(name,event.target.value), 'aria-invalid':Boolean(errors[name]), 'aria-describedby':errors[name]?`rt-error-${name}`:undefined });
  const field = (name,label,control,required=false,hint=null) => <div className="rt-field"><label htmlFor={`rt-${name}`}>{label}{required&&<span> *</span>}</label>{control}{hint&&<small>{hint}</small>}{errors[name]&&<p id={`rt-error-${name}`} className="rt-error" role="alert">{errors[name]}</p>}</div>;
  const amount = (name,label,unit,required=false,hint=null) => field(name,label,<div className="rt-input-unit"><input {...input(name)} type="text" inputMode="numeric" placeholder={name==='deposit'?'Mặc định bằng 1 tháng tiền thuê':'0'} required={required}/><span>{unit}</span></div>,required,hint);
  const submit = async event => {
    event.preventDefault();
    if (request.current) return;
    const invalid = validateRoomType(data);
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) { requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus()); return; }
    const controller = new AbortController(); request.current=controller; setBusy(true);
    try { const created=await hostApi.saveRoomType(type?.roomTypeId??null,roomTypePayload(data,property.propertyId),data.photos,controller.signal); if(!controller.signal.aborted)onCreated(created); }
    catch(failure) { if(!controller.signal.aborted){setError(failure.message);setErrors(failure.fields || {});} }
    finally { if(request.current===controller)request.current=null;if(!controller.signal.aborted)setBusy(false); }
  };
  return <Modal className="rt-create-modal" title={type?'Chỉnh sửa loại phòng':'Thêm loại phòng mới'} onClose={()=>{if(!busy)onClose();}}>
    <p className="rt-modal-subtitle">{type?'Cập nhật':'Tạo'} cấu hình nhóm phòng cho “{property.name}”</p>
    <form noValidate onSubmit={submit} ref={form} aria-busy={busy}>
      <fieldset disabled={busy}><legend>1. Thông tin cơ bản &amp; Quy mô</legend>
        {field('roomType','Tên loại phòng',<input {...input('roomType')} autoFocus maxLength={100} placeholder="Ví dụ: Studio tiêu chuẩn ban công, Phòng đơn gác lửng..." required/>,true)}
        <div className="rt-form-grid three">{field('areaSqm','Diện tích (m²)',<div className="rt-input-unit"><input {...input('areaSqm')} inputMode="decimal" placeholder="25" required/><span>m²</span></div>,true)}
          {field('capacity','Sức chứa tối đa',<select {...input('capacity')}>{Array.from({length:20},(_,index)=><option key={index+1} value={index+1}>{index+1} người</option>)}</select>,true)}
          {amount('price','Giá thuê niêm yết','đ / tháng',true,data.price&&/^\d+$/.test(data.price)?`≈ ${money(data.price)} / tháng`:null)}</div>
        {amount('deposit','Tiền đặt cọc','đ',false,'Mặc định: 1 tháng tiền thuê')}
        <div className="rt-field"><label htmlFor="rt-photos">Hình ảnh loại phòng</label><input ref={filePicker} className="rt-file-input" id="rt-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} aria-invalid={Boolean(errors.photos)} aria-describedby="rt-photo-hint"/><div className="rt-file-chooser"><button type="button" className="p-button" onClick={()=>filePicker.current?.click()}><Upload size={15}/>Chọn ảnh từ máy</button><span>{data.photos.length+data.retainedImages.length}/10 ảnh</span></div>
          <small id="rt-photo-hint"><Upload size={12}/> Chọn nhiều ảnh từ máy · Tối đa 10 ảnh, 5 MB/ảnh · Ảnh đầu tiên là ảnh đại diện.</small>
          <div className="rt-upload-previews">{data.retainedImages.map((image,index)=><figure key={image.imageId}><RoomTypePhoto typeId={type.roomTypeId} image={image}/>{index===0&&<span>Ảnh đại diện</span>}<button type="button" className="p-icon" title="Bỏ ảnh này" aria-label={`Bỏ ảnh ${image.fileName||image.imageId}`} onClick={()=>update('retainedImages',data.retainedImages.filter(item=>item.imageId!==image.imageId))}><Trash2 size={14}/></button></figure>)}{data.photos.map((file,index)=><figure key={`${file.name}-${file.lastModified}`}><LocalPhoto file={file}/>{index===0&&!data.retainedImages.length&&<span>Ảnh đại diện</span>}<button type="button" className="p-icon" title="Bỏ ảnh này" aria-label={`Bỏ ảnh ${file.name}`} onClick={()=>update('photos',data.photos.filter((_,position)=>position!==index))}><Trash2 size={14}/></button></figure>)}</div>
          {errors.photos&&<p className="rt-error" role="alert">{errors.photos}</p>}</div>
        {field('description','Mô tả tóm tắt loại phòng',<textarea {...input('description')} rows={3} maxLength={2000} placeholder="Mô tả không gian, nội thất và đặc điểm nổi bật của loại phòng..."/>)}
      </fieldset>
      <fieldset disabled={busy}><legend>2. Tiện nghi trong phòng</legend><div className="rt-amenities">{ROOM_AMENITIES.map(([key,label])=><label key={key} className={data.amenities.includes(key)?'selected':''}><input type="checkbox" checked={data.amenities.includes(key)} onChange={event=>update('amenities',event.target.checked?[...data.amenities,key]:data.amenities.filter(value=>value!==key))}/>{label}</label>)}</div>{errors.amenities&&<p className="rt-error" role="alert">{errors.amenities}</p>}</fieldset>
      <fieldset disabled={busy}><legend>3. Chi phí dịch vụ khác (tùy chọn)</legend><div className="rt-form-grid four">{amount('electricityPrice','Tiền điện','đ/kWh')}{amount('waterPrice','Tiền nước','đ/m³')}{amount('internetPrice','Internet / Wifi','đ/phòng')}{amount('servicePrice','Dịch vụ chung','đ/người')}</div></fieldset>
      {error&&<p className="rt-submit-error" role="alert">{error}</p>}
      <footer className="rt-modal-footer"><button type="button" className="p-button" disabled={busy} onClick={onClose}>Hủy</button><button type="submit" className="p-button primary" disabled={busy}>{busy?<><LoaderCircle className="spin" size={16}/>Đang lưu...</>:type?'Lưu thay đổi':'Tạo loại phòng'}</button></footer>
    </form>
  </Modal>;
}
