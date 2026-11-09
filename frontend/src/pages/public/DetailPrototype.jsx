import {Link} from 'react-router-dom';
import {RoomLocationMap} from '../../components/AccommodationMap.jsx';
import {roomCoordinates} from '../../services/map-location.js';
import {ArrowLeft,MapPin,Share2,Heart,Flag,Phone,MessageCircle,CalendarDays,Images,ShieldCheck,ExternalLink,Check,Wifi,Snowflake,Flame,Sun,ChefHat,Layers,Refrigerator,WashingMachine,BedDouble,Shirt,Armchair,ShowerHead,Bike,KeyRound,Video,Clock,FireExtinguisher,House,Wind,Sparkles,Droplets,ArrowUpDown,Star} from 'lucide-react';
import {ROOM_AMENITIES} from '../../services/room-types.js';
import {AMENITIES} from '../../services/property-registration.js';
import PropertyRoomTypes from '../../components/detail/PropertyRoomTypes.jsx';
import {MotionButton} from '../../components/motion/MotionUI.jsx';
import {DetailImage,DetailRules,DetailDistances,DetailReviews,DetailRatingBars,DetailSimilar} from '../../components/detail/DetailPrototypeParts.jsx';

const amenityIcons={wifi:Wifi,airConditioner:Snowflake,waterHeater:Flame,balcony:Sun,kitchen:ChefHat,loft:Layers,refrigerator:Refrigerator,washingMachine:WashingMachine,bed:BedDouble,wardrobe:Shirt,desk:Armchair,privateBathroom:ShowerHead,parking:Bike,fingerprint:KeyRound,camera:Video,flexibleHours:Clock,fireSafety:FireExtinguisher,separateOwner:House,laundry:WashingMachine,drying:Wind,cleaning:Sparkles,water:Droplets,elevator:ArrowUpDown,security:ShieldCheck};
function RoomAmenities({item}){const entries=[...(item.amenities||[]).map(key=>({key,label:ROOM_AMENITIES.find(([id])=>id===key)?.[1]||key})),...(item.propertyAmenities||[]).map(key=>({key,label:AMENITIES.find(([id])=>id===key)?.[1]||(key==='security'?'An ninh':key)}))];return entries.length?<div className="rtd-amenity-list">{entries.map(({key,label},index)=>{const Icon=amenityIcons[key]||Check;return <div key={index} className="rtd-amenity"><Icon size={21} aria-hidden="true"/><span>{label}</span></div>})}</div>:<p>Chủ trọ chưa cập nhật tiện nghi.</p>}
function Section({id,title,children}){return <section id={id} className="rtd-panel"><h2>{title}</h2>{children}</section>}
export default function DetailPrototype({room,item,isWishlisted,onSave,onShare,onReport,onSchedule,scheduleLabel,scheduleDisabled,onPhoto,onBack,savedIds,onSaveSimilar,saveBusy,isSaveBusy}){
 const photos=item.gallery.length?item.gallery:room.gallery;
 const photoSource=item.gallery.length?'room':'property';
 const fees=[['Tiền điện',room.electric,room.electricNote],['Tiền nước',room.water,room.waterNote],['Internet',room.internet,room.internetNote],['Tiền đặt cọc',room.deposit,'Điều kiện đặt cọc và hoàn cọc theo thỏa thuận thuê.'],['Phí dịch vụ & rác thải',room.serviceFee,room.serviceFeeNote],['Gửi xe máy',room.parkingFee,room.parkingFeeNote]];
 return <main id="detailApp" className="rtd-detail">
  <div className="container">
   <div className="rtd-back-row"><MotionButton className="btn-back-link" onClick={onBack}><ArrowLeft size={17}/>Quay lại tìm kiếm</MotionButton><nav aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><Link to="/search">Phòng trọ</Link><span aria-hidden="true">/</span><span>Chi tiết</span></nav></div>
   <header className="rtd-heading"><div><span className="rtd-property-name">{item.propertyName}</span><h1>{item.roomTypeName}</h1><p><MapPin size={17} aria-hidden="true"/>{room.location}</p></div><div className="rtd-actions"><MotionButton onClick={onShare}><Share2 size={18}/>Chia sẻ</MotionButton><MotionButton onClick={onReport}><Flag size={18}/>Báo cáo</MotionButton></div></header>
   <div className="rtd-layout"><div className="rtd-summary-column">
    <aside className="rtd-summary" aria-label="Thông tin thuê và liên hệ">
     <div className="rtd-status-row"><span className="rtd-approved"><ShieldCheck size={16}/>Hồ sơ đã duyệt</span><span className={`rtd-availability${item.availableRooms===0?' is-full':''}`}>{room.availability}</span></div>
     <div className="rtd-price"><span>Giá thuê / tháng</span><strong>{room.priceDisplay}</strong></div>
     <dl className="rtd-key-facts">{[['Diện tích',room.area],['Sức chứa',room.specs.capacity],['Tiền cọc',room.deposit],['Nhận phòng',room.moveInDate]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
     <div className="rtd-upfront"><span>Tiền phòng + tiền cọc</span><strong>{room.estimateDisplay}</strong><small>Chưa gồm điện, nước và các phí khác.</small></div>
     <div className="rtd-contact-person"><span className="rtd-person-icon"><House size={19}/></span><div><strong>{room.hostInfo.name}</strong><span>{room.hostInfo.role}</span><small>{room.hostInfo.joined}</small></div></div>
     <div className="rtd-contact" id="host-contact"><MotionButton className="rtd-primary" id="btnOpenScheduleModal" onClick={onSchedule} disabled={scheduleDisabled}><CalendarDays size={18}/>{scheduleLabel}</MotionButton>{room.hostInfo.phone?<a href={`tel:${room.hostInfo.phone}`}><Phone size={18}/>Gọi chủ trọ: {room.hostInfo.phone}</a>:<p className="rtd-muted">Chưa cập nhật số điện thoại công khai.</p>}{room.hostInfo.zalo?<a href={`https://zalo.me/${room.hostInfo.zalo}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/>Nhắn Zalo</a>:<p className="rtd-muted">Chưa cập nhật Zalo.</p>}</div>
     <MotionButton type="button" className="rtd-save-room" onClick={onSave} aria-pressed={isWishlisted} disabled={saveBusy} aria-busy={saveBusy}><Heart size={18} fill={isWishlisted?'currentColor':'none'}/>{saveBusy?'Đang xử lý...':isWishlisted?'Bỏ lưu phòng':'Lưu phòng'}</MotionButton>
    </aside>
</div><div className="rtd-primary-content">
   <div className="rtd-hero" id="room-type-details">
    <section className="rtd-gallery" aria-label={photoSource==='room'?'Ảnh loại phòng đang xem':'Ảnh nhà trọ'}>
     {photos.length?<><button className="rtd-cover" onClick={()=>onPhoto(0,photoSource)} aria-label="Phóng to ảnh phòng"><DetailImage src={photos[0].url} alt={room.title} loading="eager"/><span><Images size={16}/>Xem {photos.length} ảnh {photoSource==='room'?'phòng':'nhà trọ'}</span></button><div className="rtd-thumbnails">{photos.slice(1,4).map((photo,index)=><button key={photo.url} onClick={()=>onPhoto(index+1,photoSource)} aria-label={`Xem ảnh ${index+2}`}><DetailImage src={photo.url} alt={`Ảnh ${index+2} — ${item.roomTypeName}`} loading="lazy"/></button>)}</div></>:<div className="rtd-no-photo"><Images size={34}/><p>Chủ trọ chưa cập nhật hình ảnh.</p></div>}
    </section>

   </div>
   <nav className="rtd-section-nav" aria-label="Thông tin phòng"><a href="#rtd-costs">Chi phí thuê</a><a href="#rtd-amenities">Tiện nghi</a><a href="#rtd-description">Mô tả & quy định</a><a href="#rtd-location">Vị trí</a><a href="#rtd-reviews">Đánh giá</a><a href="#property-room-types-title">Loại phòng khác</a></nav>
   <Section id="rtd-costs" title="Chi phí thuê & tiền cần chuẩn bị"><p className="rtd-section-note">Biểu phí do chủ trọ khai báo. Xác nhận cách tính và các khoản phát sinh trước khi thuê.</p><dl className="rtd-fees">{fees.map(([label,value,note])=><div key={label}><dt>{label}</dt><dd>{value}</dd><small>{note}</small></div>)}</dl></Section>
   <div className="rtd-body-grid"><div>
    <Section id="rtd-amenities" title="Tiện nghi & trang thiết bị"><dl className="rtd-room-specs">{[['Phòng ngủ',room.specs.bedroom],['Phòng tắm',room.specs.bathroom]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><RoomAmenities item={item}/></Section>
    <Section id="rtd-description" title="Mô tả & quy định sinh hoạt"><div className="rtd-description">{room.description.split(/\n\n|\n/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div><h3>Quy định tại nhà trọ</h3><ul className="rules-list"><DetailRules items={room.rules}/></ul></Section>
    <Section id="rtd-reviews" title="Đánh giá từ người thuê">{item.reviews.totalReviews>0?<><div className="reviews-summary-card"><div className="reviews-score-col"><div className="score-number">{room.rating}</div><div className="score-count-label">{room.ratingDisplay}</div></div><DetailRatingBars reviews={item.reviews}/></div><div className="reviews-feed-list"><DetailReviews items={room.reviews}/></div></>:<p className="rtd-empty-reviews"><Star size={22} aria-hidden="true"/><span>Chưa có đánh giá. Hãy chia sẻ trải nghiệm sau khi thuê phòng.</span></p>}</Section>
   </div><div>
    <Section id="rtd-location" title="Vị trí nhà trọ"><p className="rtd-address"><MapPin size={19}/>{room.location}</p>{item.nearby&&<p>{item.nearby}</p>}<RoomLocationMap room={item}/>{!roomCoordinates(item)&&<iframe className="rtd-map" title={`Bản đồ theo địa chỉ ${item.propertyName}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(room.location)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>}<p className="rtd-map-note">{roomCoordinates(item)?'Bản đồ hiển thị vị trí ghim do chủ trọ khai báo; vui lòng xác nhận vị trí thực tế.':'Bản đồ tham khảo tìm theo địa chỉ khai báo; chưa có tọa độ ghim. Vui lòng xác nhận vị trí thực tế với chủ trọ.'}</p><a className="rtd-map-link" href={`https://maps.google.com/?q=${encodeURIComponent(room.location)}`} target="_blank" rel="noopener noreferrer">Xem trên Google Maps<ExternalLink size={16}/></a><details className="rtd-reference"><summary>Tham khảo khoảng cách minh họa</summary><p>Khoảng cách từ bản thiết kế, không phải số đo của nhà trọ này. Vui lòng xác nhận thực tế với chủ trọ.</p><DetailDistances items={room.distances}/></details><p className="rtd-safety"><ShieldCheck size={18}/>Xem phòng thực tế, xác nhận chi phí và đối chiếu hợp đồng trước khi đặt cọc.</p><MotionButton className="rtd-report" onClick={onReport}><Flag size={16}/>Báo cáo thông tin sai lệch</MotionButton></Section>

    {room.gallery.length>0&&<Section title="Ảnh tổng thể nhà trọ"><div className="rtd-property-photos">{room.gallery.map((photo,index)=><button key={photo.url} onClick={()=>onPhoto(index,'property')} aria-label={`Xem ảnh nhà trọ ${index+1}`}><DetailImage src={photo.url} alt={`Ảnh nhà trọ ${index+1}`} loading="lazy"/></button>)}</div></Section>}
   </div></div>
   <PropertyRoomTypes item={item} separateCurrent/>
   </div></div>
   <section className="rtd-similar"><div className="rtd-similar-heading"><h2>Nhà trọ tương tự quanh Hòa Lạc</h2><Link to="/search">Xem tất cả phòng</Link></div><DetailSimilar rooms={item.similar} savedIds={savedIds} onSave={onSaveSimilar} isSaveBusy={isSaveBusy}/></section>
  </div>
  <div className="mobile-bottom-cta"><div className="mobile-price-group"><span className="mobile-price-val">{room.priceDisplay}</span><span className="mobile-price-unit">/ tháng</span></div><div className="mobile-actions-group">{room.hostInfo.phone&&<a href={`tel:${room.hostInfo.phone}`} className="btn-mobile-call">Gọi chủ trọ</a>}{room.hostInfo.zalo&&<a href={`https://zalo.me/${room.hostInfo.zalo}`} target="_blank" rel="noopener noreferrer" className="btn-mobile-call">Zalo</a>}<MotionButton className="btn-mobile-book" id="btnMobileBook" onClick={onSchedule} disabled={scheduleDisabled}>{scheduleLabel}</MotionButton></div></div>
 </main>;
}
