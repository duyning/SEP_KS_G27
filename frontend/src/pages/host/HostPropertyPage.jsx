import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, DoorOpen, ExternalLink, Eye, FileCheck2, House, ImageOff, Layers, LockKeyhole, MapPin, Pencil, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import PropertyCardCover from '../../components/PropertyCardCover.jsx';
import { hostApi } from '../../services/host.js';
import { Modal, StateView } from '../../components/PortalUI.jsx';
import { AMENITIES, RULES } from '../../services/property-registration.js';
import {filterPropertyRecords,propertyPage,propertyRecordKey,PROPERTY_PAGE_SIZE} from '../../services/host-property-list.js';
import '../../styles/host-property-page.css';

const steps = [
  ['Đăng ký thông tin nhà trọ', 'Điền tên cơ sở, địa chỉ chi tiết tại Hòa Lạc, vị trí bản đồ, tiện ích và nội quy chung.'],
  ['Cấu hình loại phòng & phòng thực tế', 'Tạo các loại phòng (Studio, Gác lửng...), đặt giá niêm yết và đánh dấu phòng còn trống.'],
  ['Gửi hồ sơ để xét duyệt', 'Ban quản trị HL_RCS thẩm định hồ sơ trước khi tin đăng được hiển thị công khai.'],
];

export function HostPropertyEmpty() {
  return <section id="stateNoProperty" className="host-property-empty">
    <span className="host-property-intro-badge">Cơ sở lưu trú · Bắt đầu cùng HL_RCS</span>
    <h2>Bạn chưa đăng ký nhà trọ</h2>
    <p className="host-property-empty-description">Bạn có thể đăng ký và quản lý nhiều nhà trọ. Hãy đăng ký nhà trọ để bắt đầu tạo loại phòng, cấu hình từng phòng thực tế, quản lý phòng trống và nhận yêu cầu xem phòng từ hàng nghìn sinh viên &amp; người đi làm tại Hòa Lạc.</p>
    <div className="host-property-empty-steps">{steps.map(([title, description], index) => <article key={title}><span className="host-property-step-number">{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    <div className="host-property-register-action"><Link id="btnStartRegisterProperty" to="/host/property/new"><Plus size={18} /><span>Đăng ký nhà trọ của bạn ngay</span></Link></div>
  </section>;
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
  const edit = (short = false) => canEdit?<Link className={short?'hp-button small':'hp-button primary'} to={`/host/property/edit?registrationId=${editId}`}><Pencil size={15}/>{short?'Chỉnh sửa':editLabel}</Link>:<MotionButton type="button" className={short?'hp-button small':'hp-button primary'} disabled title={changePending?'Đề nghị thay đổi đang chờ xét duyệt':pending?'Hồ sơ đang chờ xét duyệt, tạm khóa chỉnh sửa':'Hồ sơ chưa đủ điều kiện chỉnh sửa'}><LockKeyhole size={15}/>{changePending?'Đề nghị đang chờ duyệt':'Tạm khóa chỉnh sửa'}</MotionButton>;
  const manageLink = (to, label) => canManage ? <Link className="hp-button subtle" to={`${to}${filter}`}>{label}<ArrowRight size={15} /></Link> : <MotionButton className="hp-button subtle" disabled title="Chức năng quản lý phòng khả dụng sau khi nhà trọ được tạo và hồ sơ được duyệt">{label}<ArrowRight size={15} /></MotionButton>;
  const renderImage = (photo, className) => images[photo.documentId] ? <img className={className} src={images[photo.documentId]} alt={`Ảnh nhà trọ ${property.name}`} onError={() => setImages(previous => ({ ...previous, [photo.documentId]: null }))} /> : <span className="hp-image-placeholder"><ImageOff size={28} /><span>{images[photo.documentId] === null ? 'Không tải được ảnh' : 'Đang tải ảnh'}</span></span>;
  return <article className="hp-detail" data-status={property.displayStatus}>
    <header className="hp-page-heading"><div><h2>{property.name}</h2><p>Quản lý thông tin nhà trọ, các loại phòng, phòng thực tế và cập nhật tính sẵn sàng.</p></div><div className="hp-actions"><MotionButton className="hp-button" disabled title={visible ? 'Chưa có trang công khai liên kết với nhà trọ này' : 'Nhà trọ chưa được hiển thị công khai'}><ExternalLink size={15} />Xem trang công khai</MotionButton>{edit()}</div></header>
    {change&&<aside className="hp-change-notice"><strong>Đề nghị thay đổi #{change.registrationId} · {change.status==='PENDING'?'Chờ xét duyệt':change.status==='NEEDS_SUPPLEMENT'?'Cần bổ sung':'Đã từ chối'}</strong><p>Bản đã duyệt của nhà trọ tiếp tục hiển thị. Giá và tình trạng phòng vẫn quản lý bình thường.</p>{change.reasonNote&&<p className="hp-review-note">{change.reasonNote}</p>}{changeEditable&&edit()}</aside>}
    <div className="hp-sheet">
      <section className="hp-summary"><div className="hp-cover">{cover ? <MotionButton type="button" disabled={!images[cover.documentId]} title="Xem ảnh nhà trọ" aria-label="Xem ảnh đại diện nhà trọ" onClick={() => setPreview(cover)}>{renderImage(cover)}</MotionButton> : <div className="hp-image-placeholder"><House size={40} /><span>Chưa có ảnh nhà trọ</span></div>}{property.verified && <span className="hp-verified"><ShieldCheck size={12} />Đã xác minh</span>}</div>
        <div className="hp-summary-copy"><div className="hp-name-row"><h3>{property.name}</h3>{badge}</div><p className="hp-address"><MapPin size={14} />{property.address || 'Chưa cập nhật địa chỉ'}</p><div className="hp-summary-counts"><span><Layers size={14} />{property.roomTypeCount} loại phòng</span><span><DoorOpen size={14} />{property.totalRooms == null ? 'Chưa có số liệu phòng thực tế' : `${property.totalRooms} phòng thực tế`}</span>{property.vacantRooms != null && <span>{property.vacantRooms} phòng trống</span>}</div><p className="hp-contact">Quản lý: <strong>{property.managerName || 'Chưa cập nhật'}</strong>{property.contactPhone && <> · Hotline: <strong>{property.contactPhone}</strong></>}{property.zaloPhone && <> · Zalo: <strong>{property.zaloPhone}</strong></>}</p>{!property.managerName && property.contactInfo && <p className="hp-contact">{property.contactInfo}</p>}</div>
      </section>
      <div className="hp-metrics">{[[Layers, 'Loại phòng', property.roomTypeCount, 'Cấu hình giá & diện tích'], [DoorOpen, 'Tổng phòng thực tế', property.totalRooms, 'Số phòng đã được khởi tạo'], [House, 'Phòng còn trống', property.vacantRooms, 'Tình trạng phòng thực tế'], [CalendarDays, 'Yêu cầu xem phòng', property.pendingViewingCount, 'Lịch hẹn chờ phản hồi']].map(([Icon, label, value, hint]) => <div key={label}><div><span>{label}</span><Icon size={17} /></div><strong>{value == null ? '—' : value}</strong><p>{value == null ? 'Chưa có dữ liệu' : hint}</p></div>)}</div>
      <nav className="hp-management" aria-label="Điều hướng quản lý"><strong>Điều hướng quản lý:</strong>{edit(true)}{manageLink('/host/room-types', 'Quản lý loại phòng')}{manageLink('/host/rooms', 'Quản lý danh sách phòng')}</nav>
      <section className="hp-information"><header className="hp-section-heading"><div><h3>Thông tin nhà trọ</h3><p>Chi tiết vị trí, tiện ích chung, quy định và mô tả cơ sở lưu trú của bạn.</p></div>{edit(true)}</header>
        <dl className="hp-facts">{[['Tên nhà trọ', property.name], ['Loại hình', property.propertyType], ['Địa chỉ chi tiết', property.addressDetail || property.address], ['Xã / Khu vực', property.commune]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>
        <div className="hp-tag-section"><h4>Tiện ích chung:</h4><div className="hp-tags">{property.amenities.map(key => <span key={key}><Check size={12} />{AMENITIES.find(([id]) => id === key)?.[1] || key}</span>)}{!property.amenities.length && <p>Chưa cập nhật tiện ích.</p>}</div></div>
        <div className="hp-tag-section"><h4>Quy định nhà trọ:</h4><div className="hp-tags">{property.selectedRules.map(key => <span key={key}><Check size={12} />{RULES.find(([id]) => id === key)?.[1] || key}</span>)}{!property.selectedRules.length && <p>Chưa cập nhật quy định.</p>}</div>{property.rules && <p className="hp-rules">{property.rules}</p>}</div>
        <div className="hp-description"><h4>Mô tả chi tiết:</h4><p>{property.description || 'Chưa cập nhật mô tả.'}</p></div>
        <div className="hp-gallery"><h4>Hình ảnh nhà trọ ({property.photos.length} ảnh):</h4><div>{property.photos.map(photo => <MotionButton type="button" key={photo.documentId} title="Xem ảnh nhà trọ" aria-label={`Xem ảnh ${photo.fileName || photo.documentId}`} onClick={() => setPreview(photo)} disabled={!images[photo.documentId]}>{renderImage(photo)}</MotionButton>)}{!property.photos.length && <p>Chưa có ảnh nhà trọ.</p>}</div></div>
      </section>
      <section className="hp-review"><header className="hp-section-heading"><div><h3>Hồ sơ & Xét duyệt</h3><p>Thông tin kiểm định pháp lý và hồ sơ tài liệu lưu trữ bảo mật nội bộ.</p></div>{badge}</header>
        <dl className="hp-review-state"><div><dt>Trạng thái tin đăng:</dt><dd>{visible ? 'Đang hiển thị công khai trên hệ thống tìm kiếm' : stateLabels[property.displayStatus]}</dd></div><div><dt>Ngày khởi tạo:</dt><dd>{date(property.createdAt)}</dd></div><div><dt>Cập nhật gần nhất:</dt><dd>{date(property.updatedAt)}</dd></div></dl>
        {pending && <p className="hp-pending-notice" role="status">Hồ sơ đang chờ xét duyệt. Vui lòng chờ Ban Quản Trị HL_RCS kiểm tra. Nhà trọ chưa được hiển thị công khai.</p>}{property.reasonNote && <p className="hp-review-note">Phản hồi xét duyệt: {property.reasonNote}</p>}
        <h4>Hồ sơ xác minh đã gửi (Bảo mật cho Chủ trọ):</h4><div className="hp-documents">{documentLabels.map(([type, label]) => { const file = property.documents.find(item => item.type === type); const approved = file && ['APPROVED', 'VERIFIED'].includes(file.verificationStatus); return <div key={type}><FileCheck2 size={22} /><div><strong>{label}</strong><p className={approved ? 'approved' : file ? 'waiting' : ''}>{approved ? 'Đã xác minh' : file?.verificationStatus === 'REJECTED' ? 'Tài liệu chưa hợp lệ' : file ? 'Đã tiếp nhận · Chờ kiểm tra' : 'Chưa đính kèm'}</p></div></div>; })}</div><p className="hp-privacy"><ShieldCheck size={13} />Tài liệu xác minh được lưu trữ riêng tư, phục vụ xét duyệt và không hiển thị công khai tới người tìm phòng.</p>
      </section>
    </div>
    <AnimatePresence>{preview && images[preview.documentId] && <Modal title="Hình ảnh nhà trọ" onClose={() => setPreview(null)}><img className="hp-lightbox" src={images[preview.documentId]} alt={`Ảnh nhà trọ ${property.name}`} /></Modal>}</AnimatePresence>
  </article>;
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
 if (!data.records.length) return <HostPropertyEmpty />;
 const search=params.get('search')||'',status=params.get('status')||'ALL',sort=params.get('sort')||'NEWEST';
 const filtered=filterPropertyRecords(data.records,{search,status,sort});const current=propertyPage(filtered,params.get('page')||1);
 const detailLink=record=>{const next=new URLSearchParams(params);next.set(record.propertyId!=null?'id':'registrationId',record.propertyId??record.registrationId);return `/host/property?${next}`;};
 return <section className="hp-portfolio">
  <header className="hp-portfolio-heading"><div><span className="hp-eyebrow">QUẢN LÝ CƠ SỞ LƯU TRÚ</span><h2>Nhà trọ của tôi</h2><p>Theo dõi nhà trọ, phòng trống và tiến độ xét duyệt tại một nơi.</p></div><div className="hp-actions"><MotionButton type="button" className="hp-button" onClick={onRefresh}><RefreshCw size={15}/>Làm mới</MotionButton><Link className="hp-button primary" to="/host/property/new"><Plus size={16}/>Đăng ký thêm nhà trọ</Link></div></header>
  <div className="hp-portfolio-stats">{[['ALL','Tất cả nhà trọ & hồ sơ',House],['VISIBLE','Đang hiển thị',ShieldCheck],['PENDING','Chờ xét duyệt',Clock3],['NEEDS_SUPPLEMENT','Cần bổ sung',FileCheck2]].map(([key,label,Icon])=><MotionButton type="button" key={key} aria-pressed={status===key} className={status===key?'selected':''} onClick={()=>change('status',key)}><span>{label}<Icon size={18}/></span><strong>{key==='ALL'?data.records.length:data.records.filter(record=>record.displayStatus===key).length}</strong></MotionButton>)}</div>
  <div className="hp-portfolio-toolbar"><label className="hp-portfolio-search"><Search size={17}/><input aria-label="Tìm nhà trọ" placeholder="Tìm tên nhà trọ, địa chỉ, người quản lý..." value={search} onChange={event=>change('search',event.target.value)}/></label><select aria-label="Lọc trạng thái nhà trọ" value={status} onChange={event=>change('status',event.target.value)}><option value="ALL">Tất cả trạng thái</option>{Object.entries(stateLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select aria-label="Sắp xếp nhà trọ" value={sort} onChange={event=>change('sort',event.target.value)}><option value="NEWEST">Mới đăng ký trước</option><option value="NAME">Tên A–Z</option><option value="ROOMS">Nhiều phòng trước</option></select>{(search||status!=='ALL'||sort!=='NEWEST')&&<MotionButton type="button" className="hp-button" onClick={reset}>Đặt lại</MotionButton>}</div>
  <div className="hp-portfolio-result"><strong>{filtered.length} nhà trọ & hồ sơ</strong><span>Tối đa {PROPERTY_PAGE_SIZE} mục mỗi trang</span></div>
  {current.items.length?<div className="hp-property-grid">{current.items.map(record=><article className="hp-property-card" key={propertyRecordKey(record)} data-status={record.displayStatus}>
   <PropertyCardCover property={record}/><div className="hp-card-body"><div className="hp-card-meta"><span className={`hp-status ${record.displayStatus.toLowerCase()}`}>{stateLabels[record.displayStatus]}</span><small>{record.propertyId!=null?`NT-${record.propertyId}`:`HS-${record.registrationId}`}</small></div><h3><Link to={detailLink(record)}>{record.name}</Link></h3><p className="hp-card-address"><MapPin size={14}/><span>{record.address||'Chưa cập nhật địa chỉ'}</span></p><div className={`hp-card-numbers${record.propertyId!=null?' hp-card-numbers-with-viewings':''}`}>{[['Loại phòng',record.roomTypeCount],['Tổng phòng',record.totalRooms],['Còn trống',record.vacantRooms],...(record.propertyId!=null?[['Chờ duyệt lịch',record.pendingViewingCount]]:[])].map(([label,value])=><div key={label}>{label==='Chờ duyệt lịch'?<Link to={`/host/viewings?propertyId=${record.propertyId}`} aria-label={`Xem lịch của ${record.name}, ${value} yêu cầu chờ duyệt`}><strong>{value}</strong><span>{label}</span></Link>:<><strong>{value??'—'}</strong><span>{label}</span></>}</div>)}</div><p className="hp-card-date">Đăng ký: {date(record.createdAt)}</p></div><footer className="hp-card-actions"><Link className="hp-button" to={detailLink(record)}><Eye size={14}/>Xem chi tiết</Link>{record.propertyId!=null&&['VISIBLE','APPROVED','INACTIVE'].includes(record.displayStatus)?<Link className="hp-button subtle" to={`/host/rooms?propertyId=${record.propertyId}`}><DoorOpen size={14}/>Quản lý phòng</Link>:<span className="hp-card-waiting">{record.displayStatus==='NEEDS_SUPPLEMENT'?'Xem phản hồi trong chi tiết':record.displayStatus==='REJECTED'?'Xem kết quả xét duyệt':'Chờ xét duyệt'}</span>}</footer>
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
