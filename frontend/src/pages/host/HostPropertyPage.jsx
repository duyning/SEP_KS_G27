import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, DoorOpen, ExternalLink, FileCheck2, House, ImageOff, Layers, MapPin, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { hostApi } from '../../services/host.js';
import { Modal, StateView } from '../../components/PortalUI.jsx';
import { AMENITIES, RULES } from '../../services/property-registration.js';
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
    <p className="host-property-empty-description">Mỗi chủ trọ trên hệ thống quản lý một nhà trọ duy nhất. Hãy đăng ký nhà trọ để bắt đầu tạo loại phòng, cấu hình từng phòng thực tế, quản lý phòng trống và nhận yêu cầu xem phòng từ hàng nghìn sinh viên &amp; người đi làm tại Hòa Lạc.</p>
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
  const edit = (short = false) => <button type="button" className={short ? 'hp-button small' : 'hp-button primary'} disabled title="Chưa có API cập nhật thông tin nhà trọ"><Pencil size={15} />{short ? 'Chỉnh sửa' : 'Chỉnh sửa thông tin'}</button>;
  const manageLink = (to, label) => canManage ? <Link className="hp-button subtle" to={`${to}${filter}`}>{label}<ArrowRight size={15} /></Link> : <button className="hp-button subtle" disabled title="Chức năng quản lý phòng khả dụng sau khi nhà trọ được tạo và hồ sơ được duyệt">{label}<ArrowRight size={15} /></button>;
  const renderImage = (photo, className) => images[photo.documentId] ? <img className={className} src={images[photo.documentId]} alt={`Ảnh nhà trọ ${property.name}`} onError={() => setImages(previous => ({ ...previous, [photo.documentId]: null }))} /> : <span className="hp-image-placeholder"><ImageOff size={28} /><span>{images[photo.documentId] === null ? 'Không tải được ảnh' : 'Đang tải ảnh'}</span></span>;
  return <article className="hp-detail" data-status={property.displayStatus}>
    <header className="hp-page-heading"><div><h2>{property.name}</h2><p>Quản lý thông tin nhà trọ, các loại phòng, phòng thực tế và cập nhật tính sẵn sàng.</p></div><div className="hp-actions"><button className="hp-button" disabled title={visible ? 'Chưa có trang công khai liên kết với nhà trọ này' : 'Nhà trọ chưa được hiển thị công khai'}><ExternalLink size={15} />Xem trang công khai</button>{edit()}</div></header>
    <div className="hp-sheet">
      <section className="hp-summary"><div className="hp-cover">{cover ? <button type="button" disabled={!images[cover.documentId]} title="Xem ảnh nhà trọ" aria-label="Xem ảnh đại diện nhà trọ" onClick={() => setPreview(cover)}>{renderImage(cover)}</button> : <div className="hp-image-placeholder"><House size={40} /><span>Chưa có ảnh nhà trọ</span></div>}{property.verified && <span className="hp-verified"><ShieldCheck size={12} />Đã xác minh</span>}</div>
        <div className="hp-summary-copy"><div className="hp-name-row"><h3>{property.name}</h3>{badge}</div><p className="hp-address"><MapPin size={14} />{property.address || 'Chưa cập nhật địa chỉ'}</p><div className="hp-summary-counts"><span><Layers size={14} />{property.roomTypeCount} loại phòng</span><span><DoorOpen size={14} />{property.totalRooms == null ? 'Chưa có số liệu phòng thực tế' : `${property.totalRooms} phòng thực tế`}</span>{property.vacantRooms != null && <span>{property.vacantRooms} phòng trống</span>}</div><p className="hp-contact">Quản lý: <strong>{property.managerName || 'Chưa cập nhật'}</strong>{property.contactPhone && <> · Hotline: <strong>{property.contactPhone}</strong></>}{property.zaloPhone && <> · Zalo: <strong>{property.zaloPhone}</strong></>}</p>{!property.managerName && property.contactInfo && <p className="hp-contact">{property.contactInfo}</p>}</div>
      </section>
      <div className="hp-metrics">{[[Layers, 'Loại phòng', property.roomTypeCount, 'Cấu hình giá & diện tích'], [DoorOpen, 'Tổng phòng thực tế', property.totalRooms, 'Số phòng đã được khởi tạo'], [House, 'Phòng còn trống', property.vacantRooms, 'Tình trạng phòng thực tế'], [CalendarDays, 'Yêu cầu xem phòng', property.pendingViewingCount, 'Lịch hẹn chờ phản hồi']].map(([Icon, label, value, hint]) => <div key={label}><div><span>{label}</span><Icon size={17} /></div><strong>{value == null ? '—' : value}</strong><p>{value == null ? 'Chưa có dữ liệu' : hint}</p></div>)}</div>
      <nav className="hp-management" aria-label="Điều hướng quản lý"><strong>Điều hướng quản lý:</strong>{edit(true)}{manageLink('/host/room-types', 'Quản lý loại phòng')}{manageLink('/host/rooms', 'Quản lý danh sách phòng')}</nav>
      <section className="hp-information"><header className="hp-section-heading"><div><h3>Thông tin nhà trọ</h3><p>Chi tiết vị trí, tiện ích chung, quy định và mô tả cơ sở lưu trú của bạn.</p></div>{edit(true)}</header>
        <dl className="hp-facts">{[['Tên nhà trọ', property.name], ['Loại hình', property.propertyType], ['Địa chỉ chi tiết', property.addressDetail || property.address], ['Xã / Khu vực', property.commune]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>
        <div className="hp-tag-section"><h4>Tiện ích chung:</h4><div className="hp-tags">{property.amenities.map(key => <span key={key}><Check size={12} />{AMENITIES.find(([id]) => id === key)?.[1] || key}</span>)}{!property.amenities.length && <p>Chưa cập nhật tiện ích.</p>}</div></div>
        <div className="hp-tag-section"><h4>Quy định nhà trọ:</h4><div className="hp-tags">{property.selectedRules.map(key => <span key={key}><Check size={12} />{RULES.find(([id]) => id === key)?.[1] || key}</span>)}{!property.selectedRules.length && <p>Chưa cập nhật quy định.</p>}</div>{property.rules && <p className="hp-rules">{property.rules}</p>}</div>
        <div className="hp-description"><h4>Mô tả chi tiết:</h4><p>{property.description || 'Chưa cập nhật mô tả.'}</p></div>
        <div className="hp-gallery"><h4>Hình ảnh nhà trọ ({property.photos.length} ảnh):</h4><div>{property.photos.map(photo => <button type="button" key={photo.documentId} title="Xem ảnh nhà trọ" aria-label={`Xem ảnh ${photo.fileName || photo.documentId}`} onClick={() => setPreview(photo)} disabled={!images[photo.documentId]}>{renderImage(photo)}</button>)}{!property.photos.length && <p>Chưa có ảnh nhà trọ.</p>}</div></div>
      </section>
      <section className="hp-review"><header className="hp-section-heading"><div><h3>Hồ sơ & Xét duyệt</h3><p>Thông tin kiểm định pháp lý và hồ sơ tài liệu lưu trữ bảo mật nội bộ.</p></div>{badge}</header>
        <dl className="hp-review-state"><div><dt>Trạng thái tin đăng:</dt><dd>{visible ? 'Đang hiển thị công khai trên hệ thống tìm kiếm' : stateLabels[property.displayStatus]}</dd></div><div><dt>Ngày khởi tạo:</dt><dd>{date(property.createdAt)}</dd></div><div><dt>Cập nhật gần nhất:</dt><dd>{date(property.updatedAt)}</dd></div></dl>
        {pending && <p className="hp-pending-notice" role="status">Hồ sơ đang chờ xét duyệt. Vui lòng chờ Ban Quản Trị HL_RCS kiểm tra. Nhà trọ chưa được hiển thị công khai.</p>}{property.reasonNote && <p className="hp-review-note">Phản hồi xét duyệt: {property.reasonNote}</p>}
        <h4>Hồ sơ xác minh đã gửi (Bảo mật cho Chủ trọ):</h4><div className="hp-documents">{documentLabels.map(([type, label]) => { const file = property.documents.find(item => item.type === type); const approved = file && ['APPROVED', 'VERIFIED'].includes(file.verificationStatus); return <div key={type}><FileCheck2 size={22} /><div><strong>{label}</strong><p className={approved ? 'approved' : file ? 'waiting' : ''}>{approved ? 'Đã xác minh' : file?.verificationStatus === 'REJECTED' ? 'Tài liệu chưa hợp lệ' : file ? 'Đã tiếp nhận · Chờ kiểm tra' : 'Chưa đính kèm'}</p></div></div>; })}</div><p className="hp-privacy"><ShieldCheck size={13} />Tài liệu xác minh được lưu trữ riêng tư, phục vụ xét duyệt và không hiển thị công khai tới người tìm phòng.</p>
      </section>
    </div>
    {preview && images[preview.documentId] && <Modal title="Hình ảnh nhà trọ" onClose={() => setPreview(null)}><img className="hp-lightbox" src={images[preview.documentId]} alt={`Ảnh nhà trọ ${property.name}`} /></Modal>}
  </article>;
}

export function HostPropertyContent({ data, selectedId }) {
  if (selectedId && !data.records.some(record => String(record.propertyId) === selectedId)) return <StateView kind="error" message="Không tìm thấy nhà trọ này trong danh sách bạn được phép quản lý." />;
  if (!data.records.length) return <HostPropertyEmpty />;
  return data.records.map(record => <PropertyDetail key={`${record.propertyId}-${record.registrationId}`} property={record} />);
}

export default function HostPropertyPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  const selectedId = params.get('id');
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
    <div className="host-property-page-content">{state.loading ? <StateView kind="loading" /> : state.error ? <StateView kind="error" message={state.error}><button className="p-button primary" onClick={() => setRevision(value => value + 1)}>Thử lại</button></StateView> : <HostPropertyContent data={state.data} selectedId={selectedId} />}</div>
  </div>;
}
