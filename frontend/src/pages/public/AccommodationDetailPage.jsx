import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bath, BedDouble, CalendarDays, Check, CheckCircle2, ChevronRight, CircleCheck, Clipboard, Droplets, FileText, Grid2X2, Heart, House, ImageOff, Info, LampDesk, LoaderCircle, MapPin, MessageCircle, Navigation, Phone, Ruler, Share2, ShieldCheck, Star, UserRound, Users, Utensils, Wallet, Wifi, Zap } from 'lucide-react';
import { accommodationApi } from '../../services/accommodations.js';
import { detailDate, detailPhone, moveInEstimate, zaloLink } from '../../services/accommodation-detail.js';
import { ROOM_AMENITIES } from '../../services/room-types.js';
import { AMENITIES, RULES } from '../../services/property-registration.js';
import AccommodationGallery from '../../components/AccommodationGallery.jsx';
import AccommodationReviews from '../../components/AccommodationReviews.jsx';
import AccommodationCard, { rent } from '../../components/AccommodationCard.jsx';
import { Modal, useToast } from '../../components/PortalUI.jsx';
import '../../styles/accommodation-detail.css';

function ContactActions({ contact, onSchedule }) {
  const phone = detailPhone(contact?.phone);
  const zalo = zaloLink(contact?.zaloPhone);
  return <div className="rd-contact-actions">
    {onSchedule && <button type="button" className="rd-button rd-button-primary" onClick={onSchedule}><CalendarDays size={18} />Đặt lịch xem phòng trực tiếp</button>}
    {phone ? <a className="rd-button rd-button-call" href={`tel:${phone}`}><Phone size={17} />Gọi chủ trọ: {phone}</a> : <button type="button" className="rd-button rd-button-call" disabled><Phone size={17} />Chưa cập nhật số điện thoại</button>}
    {zalo ? <a className="rd-button rd-button-zalo" href={zalo} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />Nhắn tin Zalo trực tiếp</a> : <button type="button" className="rd-button rd-button-zalo" disabled><MessageCircle size={17} />Chưa cập nhật số Zalo</button>}
  </div>;
}

function OverviewItem({ icon: Icon, label, children }) {
  return <div className="rd-overview-item"><Icon size={21} /><div><span>{label}</span><strong>{children}</strong></div></div>;
}
function FeeItem({ icon: Icon, name, value, unit, note }) {
  return <div className="rd-fee-item"><div><span><Icon size={15} />{name}</span><strong>{value == null ? 'Chưa cập nhật' : `${rent(value)}${unit || ''}`}</strong></div><p>{note}</p></div>;
}

function RoomDetailContent({ item }) {
  const notify = useToast();
  const [contactOpen, setContactOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const title = `${item.propertyName} – ${item.roomTypeName}`;
  const vacantText = item.availableRooms > 0 ? `Còn ${item.availableRooms} phòng` : 'Hết phòng';
  const amenityLabels = ROOM_AMENITIES.filter(([key]) => item.amenities.includes(key));
  const propertyAmenities = AMENITIES.filter(([key]) => item.propertyAmenities.includes(key));
  const rules = RULES.filter(([key]) => item.selectedRules.includes(key));
  const furniture = ROOM_AMENITIES.filter(([key]) => ['bed', 'wardrobe', 'desk', 'refrigerator'].includes(key) && item.amenities.includes(key)).map(([,label]) => label);
  const estimate = moveInEstimate(item.price, item.deposit);
  const publicContact = item.publicContact || null;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); notify('Đã sao chép liên kết phòng trọ.'); }
    catch { setShareOpen(true); }
  };
  return <div className="rental-detail">
    <div className="rd-breadcrumb-band"><div className="rd-container rd-breadcrumb-row"><nav aria-label="Đường dẫn chi tiết"><Link to="/">Trang chủ</Link><ChevronRight size={13} /><Link to="/search">Phòng trọ Hòa Lạc</Link><ChevronRight size={13} /><span>{item.propertyName}</span></nav><Link className="rd-back" to="/search"><ArrowLeft size={15} />Quay lại tìm kiếm</Link></div></div>
    <div className="rd-container rd-main">
      <header className="rd-heading"><div className="rd-heading-top"><div className="rd-badges"><span className="rd-badge rd-badge-verified"><Check size={14} />Hồ sơ nhà trọ đã xác minh</span><span className={`rd-badge ${item.availableRooms > 0 ? 'rd-badge-vacant' : 'rd-badge-muted'}`}><span className="rd-status-dot" />{vacantText}</span>{item.propertyName.startsWith('DEMO') && <span className="rd-badge rd-badge-demo">Dữ liệu demo · Ảnh minh họa</span>}</div><div className="rd-heading-actions"><button type="button" className="rd-button rd-button-plain" onClick={copyLink}><Share2 size={17} />Chia sẻ</button><button type="button" className="rd-button rd-button-plain" disabled title="Chức năng lưu tin chưa được mở"><Heart size={17} />Lưu tin</button></div></div>
        <h1 className="rd-title">{title}</h1><div className="rd-subtitle"><span><MapPin size={16} />{item.address || 'Chưa cập nhật địa chỉ'}</span>{item.nearby && <span className="rd-nearby-text">{item.nearby}</span>}<a href="#room-reviews" className="rd-rating-link"><Star size={15} fill="currentColor" />{item.reviews.totalReviews > 0 ? `${item.reviews.averageRating.toFixed(1)} (${item.reviews.totalReviews} đánh giá)` : 'Chưa có đánh giá'}</a></div>
      </header>
      <AccommodationGallery key={item.roomTypeId} photos={item.gallery} title={title} />
      <div className="rd-content-grid"><div className="rd-main-column">
        <section className="rd-section"><h2 className="rd-section-title"><Grid2X2 size={22} />Tổng quan phòng trọ</h2><div className="rd-overview-grid">
          <OverviewItem icon={House} label="Loại hình">{item.roomTypeName}</OverviewItem><OverviewItem icon={Ruler} label="Diện tích">{item.areaSqm} m²</OverviewItem><OverviewItem icon={Users} label="Sức chứa">{item.capacity ? `Tối đa ${item.capacity} người` : 'Chưa cập nhật'}</OverviewItem>
          <OverviewItem icon={Bath} label="Phòng tắm">{item.amenities.includes('privateBathroom') ? 'Vệ sinh khép kín riêng biệt' : 'Chưa cập nhật'}</OverviewItem><OverviewItem icon={Utensils} label="Khu bếp">{item.amenities.includes('kitchen') ? 'Có khu vực nấu ăn' : 'Chưa cập nhật'}</OverviewItem><OverviewItem icon={BedDouble} label="Nội thất">{furniture.length ? furniture.join(', ') : 'Chưa cập nhật'}</OverviewItem>
          <OverviewItem icon={CircleCheck} label="Tình trạng">{vacantText}</OverviewItem><OverviewItem icon={CalendarDays} label="Nhận phòng">Liên hệ chủ trọ xác nhận</OverviewItem>
        </div>{amenityLabels.length > 0 && <div className="rd-amenity-tags">{amenityLabels.map(([key,label]) => <span key={key}><Check size={13} />{label}</span>)}</div>}</section>
        <section className="rd-section"><h2 className="rd-section-title"><Wallet size={22} />Chi phí thuê &amp; Biểu phí dịch vụ</h2><div className="rd-cost-card"><div className="rd-rent-banner"><div><span>GIÁ THUÊ NIÊM YẾT</span><strong>{rent(item.price)}<small>/ tháng</small></strong></div><span className="rd-price-note"><Check size={14} />Giá theo thông tin loại phòng</span></div><div className="rd-fees-grid">
          <FeeItem icon={Zap} name="Tiền điện sinh hoạt" value={item.electricityPrice} unit="/kWh" note="Tính theo lượng điện sử dụng thực tế." /><FeeItem icon={Droplets} name="Tiền nước sinh hoạt" value={item.waterPrice} unit="/m³" note="Xác nhận chỉ số và cách tính với chủ trọ." />
          <FeeItem icon={Wifi} name="Mạng Internet / Wifi" value={item.internetPrice} unit="/phòng/tháng" note="Mức phí Internet của loại phòng." /><FeeItem icon={Wallet} name="Tiền đặt cọc" value={item.deposit} note="Điều kiện cọc và hoàn cọc theo thỏa thuận thuê." />
          <FeeItem icon={LampDesk} name="Phí dịch vụ chung" value={item.servicePrice} unit="/người/tháng" note="Xác nhận các dịch vụ được bao gồm trước khi thuê." /><FeeItem icon={House} name="Phí gửi xe" value={null} note={item.propertyAmenities.includes('parking') ? 'Có khu vực để xe; liên hệ chủ trọ để biết mức phí.' : 'Chưa có thông tin về chỗ để xe.'} />
        </div><div className="rd-estimate"><span><Info size={16} />Tiền phòng + tiền cọc ban đầu</span><strong>{estimate == null ? 'Cần xác nhận thêm' : rent(estimate)}</strong><small>Chưa bao gồm điện, nước và các phí dịch vụ.</small></div></div></section>
        <section className="rd-section"><h2 className="rd-section-title"><FileText size={22} />Mô tả chi tiết phòng trọ</h2><div className="rd-description">{item.description && <p>{item.description}</p>}{item.propertyDescription && item.propertyDescription !== item.description && <p>{item.propertyDescription}</p>}{!item.description && !item.propertyDescription && <p>Chủ trọ chưa bổ sung mô tả chi tiết.</p>}</div>{propertyAmenities.length > 0 && <><h3 className="rd-subheading">Tiện ích tại nhà trọ</h3><ul className="rd-rule-list">{propertyAmenities.map(([key,label]) => <li key={key}><Check size={17} />{label}</li>)}</ul></>}
          <h3 className="rd-subheading">Quy định sinh hoạt tại nhà trọ</h3>{rules.length > 0 && <ul className="rd-rule-list">{rules.map(([key,label]) => <li key={key}><Check size={17} />{label}</li>)}</ul>}{item.rules ? <p className="rd-rules-text">{item.rules}</p> : rules.length === 0 && <p className="rd-muted">Chưa có quy định được cung cấp. Hãy trao đổi với chủ trọ trước khi thuê.</p>}</section>
        <section className="rd-section"><h2 className="rd-section-title"><MapPin size={22} />Vị trí &amp; Khoảng cách tiện ích</h2><div className="rd-location-card"><h3><MapPin size={20} />{item.address || 'Chưa cập nhật địa chỉ'}</h3><div className="rd-nearby-grid"><div><Navigation size={18} /><span>Thông tin khu vực<strong>{item.nearby || 'Chưa cập nhật tiện ích lân cận'}</strong></span></div><div><MapPin size={18} /><span>Khoảng cách đến tiện ích<strong>Chưa có khoảng cách được xác nhận</strong></span></div></div></div><div className="rd-map-preview"><span className="rd-map-pin"><MapPin size={30} /></span><strong>Tra cứu vị trí nhà trọ</strong><p>{item.address || 'Chủ trọ chưa cập nhật địa chỉ'}</p>{item.mapUrl && <a className="rd-button rd-map-button" href={item.mapUrl} target="_blank" rel="noopener noreferrer"><Navigation size={17} />Xem trên Google Maps</a>}</div></section>
        <section className="rd-section rd-owner-section" id="property-owner"><h2 className="rd-section-title"><UserRound size={22} />Thông tin chủ nhà trọ</h2><div className="rd-owner-card"><div className="rd-owner-heading"><span className="rd-owner-avatar"><UserRound size={32} /></span><div><h3>{publicContact?.name || 'Chủ nhà trọ'}<CheckCircle2 size={17} /></h3><p>Quản lý {item.propertyName}</p><small>Hồ sơ nhà trọ đã được duyệt{item.publishedAt ? ` · ${detailDate(item.publishedAt)}` : ''}</small></div></div><ContactActions contact={publicContact} />{!publicContact && <p className="rd-contact-note">Chủ trọ chưa bổ sung số điện thoại/Zalo trong hồ sơ.</p>}</div></section>
        <AccommodationReviews reviews={item.reviews} />
      </div><aside className="rd-sidebar" aria-label="Giá thuê và liên hệ chủ trọ"><div className="rd-booking-card"><div className="rd-sidebar-price"><strong>{rent(item.price)}<small>/ tháng</small></strong><span className={`rd-badge ${item.availableRooms > 0 ? 'rd-badge-vacant' : 'rd-badge-muted'}`}>{vacantText}</span></div><ul className="rd-sidebar-facts"><li><Check size={16} /><span><b>Tiền cọc:</b> {item.deposit == null ? 'Chưa cập nhật' : rent(item.deposit)}</span></li><li><Check size={16} /><span><b>Điện &amp; Nước:</b> {item.electricityPrice == null ? 'Chưa cập nhật' : `${rent(item.electricityPrice)}/kWh`} · {item.waterPrice == null ? 'Chưa cập nhật' : `${rent(item.waterPrice)}/m³`}</span></li><li><Check size={16} /><span><b>Lịch xem:</b> Trao đổi với chủ trọ để hẹn thời gian phù hợp.</span></li></ul><ContactActions contact={publicContact} onSchedule={() => setContactOpen(true)} /><div className="rd-assurance"><ShieldCheck size={22} /><p>Nên xem phòng trực tiếp, xác nhận giá và điều kiện thuê trước khi đặt cọc.</p></div></div></aside></div>
    </div>
    {item.similar.length > 0 && <section className="rd-similar-band"><div className="rd-container"><div className="rd-similar-heading"><div><span>GỢI Ý DÀNH CHO BẠN</span><h2>Nhà trọ khác quanh khu vực Hòa Lạc</h2></div><Link to="/search">Xem tất cả phòng<ArrowRight size={16} /></Link></div><div className="rd-similar-grid">{item.similar.map(room => <AccommodationCard item={room} key={room.roomTypeId} />)}</div></div></section>}
    {contactOpen && <Modal title="Hẹn xem phòng trực tiếp" className="rd-contact-modal" onClose={() => setContactOpen(false)}><p className="rd-modal-intro">Liên hệ chủ trọ để thống nhất ngày, giờ xem phòng tại {item.propertyName}.</p><ContactActions contact={publicContact} />{!publicContact && <p className="rd-contact-note">Chủ trọ chưa bổ sung số điện thoại hoặc Zalo. Bạn có thể quay lại kiểm tra sau.</p>}</Modal>}
    {shareOpen && <Modal title="Chia sẻ phòng trọ" className="rd-contact-modal" onClose={() => setShareOpen(false)}><p className="rd-modal-intro">Sao chép đường dẫn dưới đây để chia sẻ phòng trọ:</p><input className="rd-share-input" readOnly value={window.location.href} aria-label="Liên kết phòng trọ" onFocus={event => event.target.select()} /><button type="button" className="rd-button rd-button-primary" onClick={copyLink}><Clipboard size={17} />Sao chép liên kết</button></Modal>}
  </div>;
}

export default function AccommodationDetailPage() {
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId'), roomTypeId = params.get('roomTypeId');
  const key = `${propertyId}/${roomTypeId}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key, data: null, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, data: null, loading: true, error: '' });
    accommodationApi.detail(propertyId, roomTypeId, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, data: null, loading: false, error: error.message });
    });
    return () => controller.abort();
  }, [key, propertyId, roomTypeId, revision]);
  if (state.loading || state.key !== key) return <div className="rd-container rd-state" role="status"><LoaderCircle className="spin" />Đang tải thông tin phòng trọ...</div>;
  if (state.error) return <div className="rd-container rd-state" role="alert"><ImageOff size={34} /><h1>Không thể xem phòng trọ</h1><p>{state.error}</p><div><button className="rd-button rd-button-primary" onClick={() => setRevision(value => value + 1)}>Thử lại</button><Link className="rd-button rd-button-plain" to="/search"><ArrowLeft size={16} />Về danh sách</Link></div></div>;
  return <RoomDetailContent item={state.data} key={key} />;
}