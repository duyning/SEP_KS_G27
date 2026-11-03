import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, DoorOpen, Eye, FileCheck2, House, ImageOff, Layers, LockKeyhole, MapPin, MessagesSquare, Pencil, Plus, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { hostApi } from '../../services/host.js';
import { Modal, StateView } from '../../components/PortalUI.jsx';
import { AMENITIES, RULES } from '../../services/property-registration.js';
import {filterPropertyRecords,propertyPage,propertyRecordKey,PROPERTY_PAGE_SIZE} from '../../services/host-property-list.js';
import '../../styles/host-property-page.css';
import '../../styles/host-property-detail.css';
import HostEmptyState from '../../components/HostEmptyState.jsx';

export function HostPropertyEmpty() {
 return <HostEmptyState id="stateNoProperty" title="Bạn chưa có nhà trọ nào" description="Đăng ký nhà trọ để bắt đầu quản lý thông tin, loại phòng và phòng thực tế. Bạn có thể quản lý nhiều nhà trọ trên cùng tài khoản." action={{to:'/host/property/new',label:'Đăng ký nhà trọ'}}>
  <details><summary>Cần chuẩn bị gì để đăng ký?</summary><ul><li>Tên nhà trọ, địa chỉ, vị trí bản đồ và thông tin liên hệ.</li><li>Ảnh thực tế của nhà trọ.</li><li>Giấy tờ sở hữu hoặc ủy quyền quản lý và CCCD người đại diện.</li></ul></details>
 </HostEmptyState>;
}

const stateLabels = { VISIBLE: 'Đang hiển thị', PENDING: 'Hồ sơ đang chờ xét duyệt', NEEDS_SUPPLEMENT: 'Hồ sơ cần bổ sung', REJECTED: 'Hồ sơ chưa được duyệt', INACTIVE: 'Chưa hiển thị', APPROVED: 'Đã duyệt · Chưa hiển thị' };
const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
const documentLabels = [['OWNERSHIP', 'Giấy tờ quyền sở hữu / Hợp đồng ủy quyền'], ['ID_CARD', 'CCCD đại diện quản lý nhà trọ'], ['FIRE_SAFETY', 'Biên bản / Cam kết an toàn PCCC']];

function PropertyDetail({ property }) {
  const [images, setImages] = useState({});
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const urls = [];
    setImages({});
    for (const photo of property.photos) hostApi.propertyPhoto(photo.documentId, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urls.push(url);
      setImages(previous => ({ ...previous, [photo.documentId]: url }));
    }).catch(() => { if (!controller.signal.aborted) setImages(previous => ({ ...previous, [photo.documentId]: null })); });
    return () => { controller.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [property.photos]);
  const cover = property.photos[0];
  const visible = property.displayStatus === 'VISIBLE';
  const pending = property.displayStatus === 'PENDING';
  const badge = <span className={`hp-status ${property.displayStatus.toLowerCase()}`}>{pending ? <Clock3 size={13} /> : visible ? <Check size={13} /> : null}{stateLabels[property.displayStatus]}</span>;
  const filter = property.propertyId == null ? '' : `?${new URLSearchParams({ propertyId: property.propertyId })}`;
  const canManage = property.propertyId != null && !pending && property.displayStatus !== 'REJECTED';
  const change=property.changeRequest;
  const changePending=change?.status==='PENDING';
  const changeEditable=change&&['NEEDS_SUPPLEMENT','REJECTED'].includes(change.status);
  const editId=changeEditable?change.registrationId:property.registrationId;
  const canEdit=editId&&!changePending&&(['NEEDS_SUPPLEMENT','REJECTED'].includes(property.displayStatus)||visible||property.displayStatus==='APPROVED');
  const editLabel=changeEditable?(change.status==='NEEDS_SUPPLEMENT'?'Bổ sung đề nghị thay đổi':'Sửa đề nghị bị từ chối'):property.displayStatus==='NEEDS_SUPPLEMENT'?'Bổ sung hồ sơ':property.displayStatus==='REJECTED'?'Chỉnh sửa & Gửi lại':'Đề nghị thay đổi thông tin';
  const edit = () => canEdit?<Link className="hp-button primary" to={`/host/property/edit?registrationId=${editId}`}><Pencil size={15}/>{editLabel}</Link>:<MotionButton type="button" className="hp-button" disabled title={changePending?'Đề nghị thay đổi đang chờ xét duyệt':pending?'Hồ sơ đang chờ xét duyệt, tạm khóa chỉnh sửa':'Hồ sơ chưa đủ điều kiện chỉnh sửa'}><LockKeyhole size={15}/>{changePending?'Đề nghị đang chờ duyệt':'Tạm khóa chỉnh sửa'}</MotionButton>;
  const feedback=change?change.reasonNote:property.reasonNote;
  const reviewStatus=change?.status||property.displayStatus;
  const showReview=Boolean(change||feedback||['PENDING','NEEDS_SUPPLEMENT','REJECTED'].includes(property.displayStatus));
  const metricRows=[[Layers,'Loại phòng',property.roomTypeCount,'Giá & tiện nghi','/host/room-types'],[DoorOpen,'Tổng số phòng',property.totalRooms,'Phòng thực tế','/host/rooms'],[House,'Phòng còn trống',property.vacantRooms,'Tình trạng hiện tại','/host/rooms'],[CalendarDays,'Yêu cầu xem phòng',property.pendingViewingCount,'Đang chờ phản hồi','/host/viewings']];
  const renderImage = (photo, className) => images[photo.documentId] ? <img className={className} src={images[photo.documentId]} alt={`Ảnh nhà trọ ${property.name}`} onError={() => setImages(previous => ({ ...previous, [photo.documentId]: null }))} /> : <span className="hp-image-placeholder"><ImageOff size={28} /><span>{images[photo.documentId] === null ? 'Không tải được ảnh' : 'Đang tải ảnh'}</span></span>;
  return <article className="hp-detail" data-status={property.displayStatus}>
    <div className="hp-sheet">
      <section className="hp-summary"><div className="hp-cover">{cover ? <MotionButton type="button" disabled={!images[cover.documentId]} title="Xem ảnh nhà trọ" aria-label="Xem ảnh đại diện nhà trọ" onClick={() => setPreview(cover)}>{renderImage(cover)}</MotionButton> : <div className="hp-image-placeholder"><House size={40} /><span>Chưa có ảnh nhà trọ</span></div>}{property.verified && <span className="hp-verified"><ShieldCheck size={12} />Đã xác minh</span>}</div>
        <div className="hp-summary-copy"><div className="hp-summary-top"><div><div className="hp-name-row"><h2>{property.name}</h2>{badge}</div><p className="hp-address"><MapPin size={15}/><span>{property.address||'Chưa cập nhật địa chỉ'}</span></p></div><div className="hp-summary-actions">{edit()}</div></div>
          <dl className="hp-contact-grid">{[['Người quản lý',property.managerName],['Điện thoại',property.contactPhone],['Zalo',property.zaloPhone]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{label==='Điện thoại'&&value?<a href={`tel:${value.replace(/[^+0-9]/g,'')}`}>{value}</a>:value||'Chưa cập nhật'}</dd></div>)}</dl>
          {!property.managerName&&property.contactInfo&&<p className="hp-contact-fallback">{property.contactInfo}</p>}
        </div>
      </section>
      {showReview&&<aside className={`hp-review-feedback ${reviewStatus==='REJECTED'?'is-rejected':reviewStatus==='NEEDS_SUPPLEMENT'?'is-supplement':reviewStatus==='PENDING'?'is-pending':'is-reviewed'}`} aria-label="Phản hồi xét duyệt"><span className="hp-feedback-icon"><MessagesSquare size={20}/></span><div><h3>{feedback?'Phản hồi xét duyệt':change?'Đề nghị thay đổi đang được xử lý':'Trạng thái xét duyệt'}</h3>{change&&<span className="hp-feedback-meta">Đề nghị #{change.registrationId} · {change.status==='PENDING'?'Chờ xét duyệt':change.status==='NEEDS_SUPPLEMENT'?'Cần bổ sung':'Đã từ chối'}</span>}{feedback&&<p className="hp-feedback-message">{feedback}</p>}{change?<p className="hp-feedback-context">Thông tin đã duyệt của nhà trọ tiếp tục hiển thị trong khi đề nghị thay đổi được xử lý.</p>:pending?<p className="hp-feedback-context">Hồ sơ đang được kiểm tra. Nhà trọ chưa hiển thị công khai.</p>:reviewStatus==='NEEDS_SUPPLEMENT'?<p className="hp-feedback-context">Chọn Bổ sung hồ sơ để cập nhật các mục được yêu cầu và gửi lại xét duyệt.</p>:null}</div></aside>}
      <section className="hp-overview-metrics" aria-label="Tổng quan nhà trọ">{metricRows.map(([Icon,label,value,hint,to])=>{const Tag=canManage?Link:'div';return <Tag key={label} className="hp-overview-stat" {...(canManage?{to:`${to}${filter}`}:{})}><div className="hp-stat-heading"><span>{label}</span><span className="hp-stat-icon"><Icon size={18}/></span></div><strong>{value==null?'—':value}</strong><span className="hp-stat-hint">{value==null?'Chưa có dữ liệu':hint}</span></Tag>;})}</section>
      <section className="hp-information"><header className="hp-section-heading"><div><h3>Thông tin nhà trọ</h3><p>Chi tiết vị trí, tiện ích chung, quy định và mô tả cơ sở lưu trú của bạn.</p></div></header>
        <dl className="hp-facts">{[['Tên nhà trọ', property.name], ['Loại hình', property.propertyType], ['Địa chỉ chi tiết', property.addressDetail || property.address], ['Xã / Khu vực', property.commune]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>
        <div className="hp-tag-section"><h4>Tiện ích chung:</h4><div className="hp-tags">{property.amenities.map(key => <span key={key}><Check size={12} />{AMENITIES.find(([id]) => id === key)?.[1] || key}</span>)}{!property.amenities.length && <p>Chưa cập nhật tiện ích.</p>}</div></div>
        <div className="hp-tag-section"><h4>Quy định nhà trọ:</h4><div className="hp-tags">{property.selectedRules.map(key => <span key={key}><Check size={12} />{RULES.find(([id]) => id === key)?.[1] || key}</span>)}{!property.selectedRules.length && <p>Chưa cập nhật quy định.</p>}</div>{property.rules && <p className="hp-rules">{property.rules}</p>}</div>
        <div className="hp-description"><h4>Mô tả chi tiết:</h4><p>{property.description || 'Chưa cập nhật mô tả.'}</p></div>
        <div className="hp-gallery"><h4>Hình ảnh nhà trọ ({property.photos.length} ảnh):</h4><div>{property.photos.map(photo => <MotionButton type="button" key={photo.documentId} title="Xem ảnh nhà trọ" aria-label={`Xem ảnh ${photo.fileName || photo.documentId}`} onClick={() => setPreview(photo)} disabled={!images[photo.documentId]}>{renderImage(photo)}</MotionButton>)}{!property.photos.length && <p>Chưa có ảnh nhà trọ.</p>}</div></div>
      </section>
      <section className="hp-review"><header className="hp-section-heading"><div><h3>Hồ sơ & Xét duyệt</h3><p>Thông tin kiểm định pháp lý và hồ sơ tài liệu lưu trữ bảo mật nội bộ.</p></div>{badge}</header>
        <dl className="hp-review-state"><div><dt>Trạng thái tin đăng:</dt><dd>{visible ? 'Đang hiển thị công khai trên hệ thống tìm kiếm' : stateLabels[property.displayStatus]}</dd></div><div><dt>Ngày khởi tạo:</dt><dd>{date(property.createdAt)}</dd></div><div><dt>Cập nhật gần nhất:</dt><dd>{date(property.updatedAt)}</dd></div></dl>
        <h4>Hồ sơ xác minh đã gửi (Bảo mật cho Chủ trọ):</h4><div className="hp-documents">{documentLabels.map(([type, label]) => { const file = property.documents.find(item => item.type === type); const approved = file && ['APPROVED', 'VERIFIED'].includes(file.verificationStatus); return <div key={type}><FileCheck2 size={22} /><div><strong>{label}</strong><p className={approved ? 'approved' : file ? 'waiting' : ''}>{approved ? 'Đã xác minh' : file?.verificationStatus === 'REJECTED' ? 'Tài liệu chưa hợp lệ' : file ? 'Đã tiếp nhận · Chờ kiểm tra' : 'Chưa đính kèm'}</p></div></div>; })}</div><p className="hp-privacy"><ShieldCheck size={13} />Tài liệu xác minh được lưu trữ riêng tư, phục vụ xét duyệt và không hiển thị công khai tới người tìm phòng.</p>
      </section>
    </div>
    <AnimatePresence>{preview && images[preview.documentId] && <Modal title="Hình ảnh nhà trọ" onClose={() => setPreview(null)}><img className="hp-lightbox" src={images[preview.documentId]} alt={`Ảnh nhà trọ ${property.name}`} /></Modal>}</AnimatePresence>
  </article>;
}

function PropertyCardCover({property}){
 const id=property.photos[0]?.documentId;const [image,setImage]=useState('');
 useEffect(()=>{
  setImage('');if(!id)return;const controller=new AbortController();let url;
  hostApi.propertyPhoto(id,controller.signal).then(blob=>{if(!controller.signal.aborted){url=URL.createObjectURL(blob);setImage(url);}}).catch(()=>{});
  return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
 },[id]);
 return <div className="hp-card-cover">{image?<img src={image} alt={`Ảnh nhà trọ ${property.name}`} onError={()=>setImage('')}/>:<div className="hp-card-placeholder"><House size={30}/><span>{id?'Ảnh nhà trọ chưa tải được':'Chưa có ảnh nhà trọ'}</span></div>}{property.verified&&<span className="hp-verified"><ShieldCheck size={12}/>Đã xác minh</span>}</div>;
}

export function HostPropertyContent({ data, selectedId, selectedRegistrationId, onRefresh }) {
 const [params,setParams]=useSearchParams();
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[selectedId,selectedRegistrationId]);
 const selected=selectedId?data.records.find(record=>record.propertyId!=null&&String(record.propertyId)===selectedId):selectedRegistrationId?data.records.find(record=>String(record.registrationId)===selectedRegistrationId):null;
 const change=(key,value)=>{const next=new URLSearchParams(params);if(value===''||value==='ALL'||(key==='sort'&&value==='NEWEST'))next.delete(key);else next.set(key,value);if(key!=='page')next.delete('page');setParams(next,{replace:key==='search'});};
 const reset=()=>{const next=new URLSearchParams(params);for(const key of ['search','status','sort','page'])next.delete(key);setParams(next);};
 if(selectedId||selectedRegistrationId){
  const back=new URLSearchParams(params);back.delete('id');back.delete('registrationId');
  return <><Link className="hp-back-link" to={`/host/property${back.size?`?${back}`:''}`}><ArrowLeft size={16}/>Danh sách nhà trọ</Link>{selected?<PropertyDetail key={propertyRecordKey(selected)} property={selected}/>:<StateView kind="error" message="Không tìm thấy nhà trọ hoặc hồ sơ này trong danh sách bạn được phép quản lý."/>}</>;
 }
 if (!data.records.length) return <HostPropertyEmpty onRefresh={onRefresh} />;
 const search=params.get('search')||'',status=params.get('status')||'ALL',sort=params.get('sort')||'NEWEST';
 const filtered=filterPropertyRecords(data.records,{search,status,sort});const current=propertyPage(filtered,params.get('page')||1);
 const detailLink=record=>{const next=new URLSearchParams(params);next.set(record.propertyId!=null?'id':'registrationId',record.propertyId??record.registrationId);return `/host/property?${next}`;};
 return <section className="hp-portfolio">
  <header className="hp-portfolio-heading"><div className="hp-actions"><Link className="hp-button primary" to="/host/property/new"><Plus size={16}/>Đăng ký thêm nhà trọ</Link></div></header>
  <div className="hp-portfolio-stats">{[['ALL','Tất cả nhà trọ & hồ sơ',House],['VISIBLE','Đang hiển thị',ShieldCheck],['PENDING','Chờ xét duyệt',Clock3],['NEEDS_SUPPLEMENT','Cần bổ sung',FileCheck2]].map(([key,label,Icon])=><MotionButton type="button" key={key} aria-pressed={status===key} className={status===key?'selected':''} onClick={()=>change('status',key)}><span>{label}<Icon size={18}/></span><strong>{key==='ALL'?data.records.length:data.records.filter(record=>record.displayStatus===key).length}</strong></MotionButton>)}</div>
  <div className="hp-portfolio-toolbar"><label className="hp-portfolio-search"><Search size={17}/><input aria-label="Tìm nhà trọ" placeholder="Tìm tên nhà trọ, địa chỉ, người quản lý..." value={search} onChange={event=>change('search',event.target.value)}/></label><select aria-label="Lọc trạng thái nhà trọ" value={status} onChange={event=>change('status',event.target.value)}><option value="ALL">Tất cả trạng thái</option>{Object.entries(stateLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select aria-label="Sắp xếp nhà trọ" value={sort} onChange={event=>change('sort',event.target.value)}><option value="NEWEST">Mới đăng ký trước</option><option value="NAME">Tên A–Z</option><option value="ROOMS">Nhiều phòng trước</option></select>{(search||status!=='ALL'||sort!=='NEWEST')&&<MotionButton type="button" className="hp-button" onClick={reset}>Đặt lại</MotionButton>}</div>
  <div className="hp-portfolio-result"><strong>{filtered.length} nhà trọ & hồ sơ</strong><span>Tối đa {PROPERTY_PAGE_SIZE} mục mỗi trang</span></div>
  {current.items.length?<div className="hp-property-grid">{current.items.map(record=><article className="hp-property-card" key={propertyRecordKey(record)} data-status={record.displayStatus}>
   <PropertyCardCover property={record}/><div className="hp-card-body"><div className="hp-card-meta"><span className={`hp-status ${record.displayStatus.toLowerCase()}`}>{stateLabels[record.displayStatus]}</span><small>{record.propertyId!=null?`NT-${record.propertyId}`:`HS-${record.registrationId}`}</small></div><h3><Link to={detailLink(record)}>{record.name}</Link></h3><p className="hp-card-address"><MapPin size={14}/><span>{record.address||'Chưa cập nhật địa chỉ'}</span></p><div className="hp-card-numbers">{[['Loại phòng',record.roomTypeCount],['Tổng phòng',record.totalRooms],['Còn trống',record.vacantRooms]].map(([label,value])=><div key={label}><strong>{value??'—'}</strong><span>{label}</span></div>)}</div><p className="hp-card-date">Đăng ký: {date(record.createdAt)}</p></div><footer className="hp-card-actions"><Link className="hp-button" to={detailLink(record)}><Eye size={14}/>Xem chi tiết</Link>{record.propertyId!=null&&['VISIBLE','APPROVED','INACTIVE'].includes(record.displayStatus)?<Link className="hp-button subtle" to={`/host/rooms?propertyId=${record.propertyId}`}><DoorOpen size={14}/>Quản lý phòng</Link>:<span className="hp-card-waiting">{record.displayStatus==='NEEDS_SUPPLEMENT'?'Xem phản hồi trong chi tiết':record.displayStatus==='REJECTED'?'Xem kết quả xét duyệt':'Chờ xét duyệt'}</span>}</footer>
  </article>)}</div>:<div className="hp-portfolio-empty"><Search size={32}/><h3>Không có nhà trọ phù hợp</h3><p>Thử thay đổi từ khóa hoặc trạng thái.</p><MotionButton type="button" className="hp-button" onClick={reset}>Đặt lại bộ lọc</MotionButton></div>}
  <nav className="hp-pagination" aria-label="Phân trang nhà trọ"><span>{filtered.length?`${(current.page-1)*PROPERTY_PAGE_SIZE+1}–${Math.min(current.page*PROPERTY_PAGE_SIZE,filtered.length)} trong ${filtered.length} mục`:'0 mục'}</span><div><MotionButton type="button" className="hp-button" disabled={current.page<=1} onClick={()=>change('page',current.page-1)}><ChevronLeft size={15}/>Trước</MotionButton><span>Trang {current.page} / {current.pages}</span><MotionButton type="button" className="hp-button" disabled={current.page>=current.pages} onClick={()=>change('page',current.page+1)}>Sau<ChevronRight size={15}/></MotionButton></div></nav>
 </section>;
}

export default function HostPropertyPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  const selectedId = params.get('id');
  const selectedRegistrationId=params.get('registrationId');
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    hostApi.property(controller.signal, selectedId).then(data => {
      if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [user?.userId, revision, selectedId]);
  return <div className="host-property-page">
    <div className="host-property-page-content">{state.loading ? <StateView kind="loading" /> : state.error ? <StateView kind="error" message={state.error}><MotionButton className="p-button primary" onClick={() => setRevision(value => value + 1)}>Thử lại</MotionButton></StateView> : <HostPropertyContent data={state.data} selectedId={selectedId} selectedRegistrationId={selectedRegistrationId} onRefresh={()=>setRevision(value=>value+1)} />}</div>
  </div>;
}
