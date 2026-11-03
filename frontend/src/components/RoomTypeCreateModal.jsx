import { MotionButton } from './motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, ROOM_AMENITY_GROUPS, editRoomType, emptyRoomType, money, roomTypePayload, validateRoomPhotos, validateRoomType } from '../services/room-types.js';
import RoomTypePhoto from './RoomTypePhoto.jsx';
import RoomBatchSetup from './RoomBatchSetup.jsx';
import '../styles/room-type-form.css';
import {blankRoomGroup,roomBatchPayload,validateRoomDrafts} from '../services/room-batch.js';

function LocalPhoto({file}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{const value=URL.createObjectURL(file);setUrl(value);return()=>URL.revokeObjectURL(value);},[file]);
  return <img src={url||undefined} alt={file.name}/>;
}

export default function RoomTypeCreateModal({ property, onClose, onCreated, type = null, existingRoomNumbers = [], initialDraft = null }) {
  const [data, setData] = useState(()=>type?editRoomType(type):initialDraft?.data||emptyRoomType());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step,setStep]=useState(0);
  const [groups,setGroups]=useState(()=>[blankRoomGroup()]);
  const [batchMode,setBatchMode]=useState(initialDraft?'MANUAL':'GROUPS');
  const [rows,setRows]=useState(initialDraft?.rooms||[]);
  const [batchErrors,setBatchErrors]=useState({rows:{},list:''});
  const request = useRef();
  const form = useRef();
  const filePicker = useRef();
  const goTo=value=>{setStep(value);setError('');requestAnimationFrame(()=>{form.current?.querySelector('.rtc-scroll')?.scrollTo({top:0,behavior:'instant'});});};
  const changeRows=value=>{setRows(value);setBatchErrors(validateRoomDrafts(value,existingRoomNumbers));setError('');};
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
  const amount = (name,label,unit,required=false,hint=null) => field(name,label,<div className="rt-input-unit"><input {...input(name)} type="text" inputMode="numeric" placeholder={name==='deposit'?'Theo giá thuê':name==='price'?'Nhập giá thuê':'Chưa nhập'} required={required}/><span>{unit}</span></div>,required,hint);
  const submit = async event => {
    event.preventDefault();
    if (request.current) return;
    const invalid = validateRoomType(data);
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) { requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus()); return; }
    if(!type&&step===0){goTo(1);return;}
    if(!type){const issues=validateRoomDrafts(rows,existingRoomNumbers);setBatchErrors(issues);if(issues.list||Object.keys(issues.rows).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return;}}
    const controller = new AbortController(); request.current=controller; setBusy(true);
    try { const payload=roomTypePayload(data,property.propertyId);const created=type?await hostApi.saveRoomType(type.roomTypeId,payload,data.photos,controller.signal):await hostApi.createRoomTypeWithRooms(payload,roomBatchPayload(rows),data.photos,controller.signal); if(!controller.signal.aborted)onCreated(created); }
    catch(failure) { if(!controller.signal.aborted){setError(failure.message);setErrors(failure.fields || {});} }
    finally { if(request.current===controller)request.current=null;if(!controller.signal.aborted)setBusy(false); }
  };
  return <Modal className="rt-create-modal rtc-dialog" title={type?'Chỉnh sửa loại phòng':'Thêm loại phòng mới'} onClose={()=>{if(!busy)onClose();}}>
    <p className="rt-modal-subtitle">{type?'Cập nhật cấu hình nhóm phòng':'Thông tin loại phòng và danh sách phòng'} cho “{property.name}”</p>
    {!type&&<nav className="rt-wizard-steps" aria-label="Các bước thêm loại phòng">{['Thông tin loại phòng','Thiết lập danh sách phòng'].map((label,index)=><MotionButton key={label} type="button" disabled={busy||index>step} aria-current={index===step?'step':undefined} onClick={()=>goTo(index)}><span>{step>index?<Check size={13}/>:index+1}</span><div><small>BƯỚC {index+1}</small><strong>{label}</strong></div></MotionButton>)}</nav>}
    <form noValidate onSubmit={submit} ref={form} aria-busy={busy}>
      <div className="rtc-scroll">
      {(type||step===0)&&<>
      <div className="rtc-basic-layout"><fieldset disabled={busy} className="rtc-basic"><legend>Thông tin &amp; Giá thuê</legend>
        {field('roomType','Tên loại phòng',<input {...input('roomType')} autoFocus maxLength={100} placeholder="Ví dụ: Studio tiêu chuẩn ban công, Phòng đơn gác lửng..." required/>,true)}
        <div className="rt-form-grid rtc-specifications">{field('areaSqm','Diện tích (m²)',<div className="rt-input-unit"><input {...input('areaSqm')} inputMode="decimal" placeholder="25" required/><span>m²</span></div>,true)}
          {field('capacity','Sức chứa tối đa',<select {...input('capacity')}>{Array.from({length:20},(_,index)=><option key={index+1} value={index+1}>{index+1} người</option>)}</select>,true)}
        </div>
        <div className="rt-form-grid rtc-pricing">{amount('price','Giá thuê niêm yết','đ / tháng',true,data.price&&/^\d+$/.test(data.price)?`≈ ${money(data.price)} / tháng`:null)}
        {amount('deposit','Tiền đặt cọc','đ',false,'Để trống: bằng 1 tháng tiền thuê')}</div>
        {field('description','Mô tả tóm tắt loại phòng',<textarea {...input('description')} rows={3} maxLength={2000} placeholder="Mô tả không gian, nội thất và đặc điểm nổi bật của loại phòng..."/>)}
      </fieldset>
      <fieldset disabled={busy} className="rtc-photos"><legend>Hình ảnh loại phòng</legend>
        <div className="rt-field"><label className="rtc-photo-label" htmlFor="rt-photos">Chọn ảnh thực tế của loại phòng</label><input ref={filePicker} className="rt-file-input" id="rt-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} aria-invalid={Boolean(errors.photos)} aria-describedby="rt-photo-hint"/><div className="rt-file-chooser"><MotionButton type="button" className="p-button" onClick={()=>filePicker.current?.click()}><Upload size={15}/>Chọn ảnh từ máy</MotionButton><span>{data.photos.length+data.retainedImages.length}/10 ảnh</span></div>
          <small id="rt-photo-hint"><Upload size={12}/> Chọn nhiều ảnh từ máy · Tối đa 10 ảnh, 5 MB/ảnh · Ảnh đầu tiên là ảnh đại diện.</small>
          {!data.photos.length&&!data.retainedImages.length&&<div className="rtc-photo-empty"><Upload size={28}/><strong>Ảnh giúp người thuê hiểu rõ không gian</strong><p>Chọn ảnh đại diện và các góc chụp của loại phòng này.</p></div>}
          <div className="rt-upload-previews">{data.retainedImages.map((image,index)=><figure key={image.imageId}><RoomTypePhoto typeId={type.roomTypeId} image={image}/>{index===0&&<span>Ảnh đại diện</span>}<MotionButton type="button" className="p-icon" title="Bỏ ảnh này" aria-label={`Bỏ ảnh ${image.fileName||image.imageId}`} onClick={()=>update('retainedImages',data.retainedImages.filter(item=>item.imageId!==image.imageId))}><Trash2 size={14}/></MotionButton></figure>)}{data.photos.map((file,index)=><figure key={`${file.name}-${file.lastModified}`}><LocalPhoto file={file}/>{index===0&&!data.retainedImages.length&&<span>Ảnh đại diện</span>}<MotionButton type="button" className="p-icon" title="Bỏ ảnh này" aria-label={`Bỏ ảnh ${file.name}`} onClick={()=>update('photos',data.photos.filter((_,position)=>position!==index))}><Trash2 size={14}/></MotionButton></figure>)}</div>
          {errors.photos&&<p className="rt-error" role="alert">{errors.photos}</p>}</div>
      </fieldset></div>
      <fieldset disabled={busy} className="rtc-amenity-section"><legend>Tiện nghi trong phòng</legend>
        <div className="rtc-section-intro"><p>Chọn những trang bị có sẵn trong loại phòng này.</p><span>{data.amenities.length} đã chọn</span></div>
        <div className="rtc-amenity-groups">{ROOM_AMENITY_GROUPS.map(([title,keys])=><div className="rtc-amenity-group" key={title}><h3>{title}</h3><div className="rt-amenities">{keys.map(key=>{const label=ROOM_AMENITIES.find(([value])=>value===key)[1];return <label key={key} className={data.amenities.includes(key)?'selected':''}><input type="checkbox" checked={data.amenities.includes(key)} onChange={event=>update('amenities',event.target.checked?[...data.amenities,key]:data.amenities.filter(value=>value!==key))}/><span>{label}</span></label>;})}</div></div>)}</div>
        {errors.amenities&&<p className="rt-error" role="alert">{errors.amenities}</p>}
      </fieldset>
      <fieldset disabled={busy}><legend>Chi phí dịch vụ <span className="rtc-optional">Tùy chọn</span></legend><p className="rtc-service-hint">Để trống nếu chưa xác định chi phí. Nhập 0 nếu không thu phí.</p><div className="rt-form-grid four">{amount('electricityPrice','Tiền điện','đ/kWh')}{amount('waterPrice','Tiền nước','đ/m³')}{amount('internetPrice','Internet / Wifi','đ/phòng')}{amount('servicePrice','Dịch vụ chung','đ/người')}</div></fieldset>
      </>}
      {!type&&step===1&&<RoomBatchSetup data={data} groups={groups} setGroups={setGroups} rows={rows} setRows={changeRows} mode={batchMode} setMode={setBatchMode} errors={batchErrors} busy={busy} onEdit={()=>goTo(0)}/>}
      {error&&<p className="rt-submit-error" role="alert">{error}</p>}
      </div>
      <footer className="rt-modal-footer">{!type&&step===1&&<MotionButton type="button" className="p-button rt-wizard-back" disabled={busy} onClick={()=>goTo(0)}><ArrowLeft size={14}/>Quay lại</MotionButton>}<MotionButton type="button" className="p-button" disabled={busy} onClick={onClose}>Hủy</MotionButton><MotionButton type="submit" className="p-button primary" disabled={busy}>{busy?<><LoaderCircle className="spin" size={16}/>Đang lưu...</>:type?'Lưu thay đổi':step===0?<>Tiếp theo: Thiết lập danh sách phòng<ArrowRight size={14}/></>:`Tạo loại phòng và ${rows.length} phòng`}</MotionButton></footer>
    </form>
  </Modal>;
}
