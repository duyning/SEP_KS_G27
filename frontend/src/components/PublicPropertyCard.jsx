import {useEffect,useState} from 'react';
import {ArrowRight,Building2,Check,CheckCircle2,Heart,House,ImageOff,MapPin} from 'lucide-react';
import {Modal} from './PortalUI.jsx';
import {AMENITIES,RULES} from '../services/property-registration.js';
import {ROOM_AMENITIES,money} from '../services/room-types.js';
export const publicAmenityLabel=key=>[...ROOM_AMENITIES,...AMENITIES].find(([id])=>id===key)?.[1]||key;
export function PublicListingImage({src,name,className=''}){
 const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);
 return src&&!failed?<img className={className} src={src} alt={name} loading="lazy" onError={()=>setFailed(true)}/>:<div className={`hl-image-placeholder ${className}`}><ImageOff size={32}/><span>Chưa có hình ảnh</span></div>;
}
export function PublicPropertyDetail({property,onClose}){
 const [photo,setPhoto]=useState(property.photos[0]);
 return <Modal className="hl-property-modal" title={property.name} onClose={onClose}>
  <p className="hl-address"><MapPin size={15}/>{property.address}</p><PublicListingImage src={photo} name={property.name} className="hl-detail-photo"/>
  {property.photos.length>1&&<div className="hl-detail-thumbs">{property.photos.map((src,index)=><button type="button" key={src} aria-label={`Xem ảnh ${index+1}`} aria-pressed={photo===src} onClick={()=>setPhoto(src)}><PublicListingImage src={src} name={`Ảnh nhà trọ ${index+1}`}/></button>)}</div>}
  <div className="hl-detail-summary"><span><Building2 size={17}/>{property.roomTypes.length} loại phòng</span><span><House size={17}/>{property.totalRooms} phòng thực tế</span><span><CheckCircle2 size={17}/>{property.vacantRooms} phòng trống</span></div>
  <h3>Thông tin nhà trọ</h3><p className="hl-detail-description">{property.description||'Chưa cập nhật mô tả.'}</p><div className="hl-tags">{property.amenities.map(key=><span key={key}><Check size={12}/>{publicAmenityLabel(key)}</span>)}</div>
  {property.rules.length>0&&<><h3>Quy định nhà trọ</h3><div className="hl-tags">{property.rules.map(key=><span key={key}>{RULES.find(([id])=>id===key)?.[1]||key}</span>)}</div></>}
  <h3>Loại phòng & Giá niêm yết</h3>{!property.roomTypes.length?<p>Chủ trọ chưa cập nhật loại phòng.</p>:<div className="hl-detail-types">{property.roomTypes.map(type=><article key={type.roomTypeId}><div><h4>{type.name}</h4><p>{type.area!=null?`${type.area} m² · `:''}{type.capacity!=null?`${type.capacity} người · `:''}{type.vacantRooms}/{type.totalRooms} phòng trống</p><div className="hl-tags">{type.amenities.map(key=><span key={key}>{publicAmenityLabel(key)}</span>)}</div><p>{type.electricityPrice!=null?`Điện: ${money(type.electricityPrice)}/kWh`:''}{type.waterPrice!=null?` · Nước: ${money(type.waterPrice)}`:''}</p></div><strong>{type.price==null?'Chưa cập nhật giá':money(type.price)}<small>/ tháng</small></strong></article>)}</div>}
  <footer><button className="hl-btn" onClick={onClose}>Đóng chi tiết</button></footer>
 </Modal>;
}
export default function PublicPropertyCard({property,saved,onSave,onDetail}){
 const tags=[...new Set([...property.roomTypes.flatMap(t=>t.amenities),...property.amenities])];
 const type=property.roomTypes.find(t=>t.vacantRooms>0)||property.roomTypes[0];
 return <article className="hl-listing"><div className="hl-listing-image">
  <button className="hl-image-button" onClick={onDetail} aria-label={`Xem ${property.name}`}><PublicListingImage src={property.photos[0]} name={property.name}/></button><span className="hl-verified"><CheckCircle2 size={12}/>Đã xác minh chính chủ</span><span className={`hl-availability ${property.vacantRooms>0?'vacant':''}`}>{property.vacantRooms>0?`Còn ${property.vacantRooms} phòng`:property.totalRooms?'Đã hết phòng':'Chưa cập nhật phòng'}</span><button className={`hl-save ${saved?'saved':''}`} aria-label={`${saved?'Bỏ lưu':'Lưu'} ${property.name} trên thiết bị`} aria-pressed={saved} onClick={onSave}><Heart size={17} fill={saved?'currentColor':'none'}/></button>
 </div><div className="hl-listing-content"><p className="hl-card-address"><MapPin size={12}/>{property.address||property.commune||'Hòa Lạc'}</p><h3><button onClick={onDetail}>{property.name}</button></h3><div className="hl-tags">{type?.area!=null&&<span>{type.area} m²</span>}{tags.slice(0,3).map(key=><span key={key}>{publicAmenityLabel(key)}</span>)}{tags.length>3&&<span>+{tags.length-3}</span>}</div><div className="hl-card-price"><div><small>Giá tham khảo từ</small><strong>{property.minPrice==null?'Chưa cập nhật giá':money(property.minPrice)}</strong>{property.minPrice!=null&&<small>/ tháng</small>}</div><span>{property.roomTypes.length} loại phòng<br/>{property.totalRooms} phòng thực tế</span></div><div className="hl-card-actions"><button onClick={onDetail}>Chi tiết nhà trọ</button><button className="hl-btn" onClick={onDetail}>Xem loại phòng<ArrowRight size={14}/></button></div></div></article>;
}
