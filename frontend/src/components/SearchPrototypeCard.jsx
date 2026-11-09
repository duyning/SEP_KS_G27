import {Link} from 'react-router-dom';
import {Heart,MapPin,Phone,Check} from 'lucide-react';
import {DetailImage} from './detail/DetailPrototypeParts.jsx';
import {ROOM_AMENITIES} from '../services/room-types.js';
import {detailMoney} from '../services/detail-prototype.js';
export default function SearchPrototypeCard({item,saved,onSave,saveBusy=false,comparisonControl}){
 const url=`/properties/detail?${new URLSearchParams({propertyId:item.propertyId,roomTypeId:item.roomTypeId})}`;
 const amenities=(item.amenities||[]).map(key=>ROOM_AMENITIES.find(([id])=>id===key)?.[1]||key);
 return <article className="room-card" data-id={item.roomTypeId}>
  <div className="room-thumb-wrap"><Link to={url} className="room-thumb-link" aria-label={`Xem ${item.propertyName} — ${item.roomTypeName}`}><DetailImage src={item.imageUrl} alt={`${item.propertyName} — ${item.roomTypeName}`} className="room-img" loading="lazy"/></Link>
   <span className="room-badge-top"><Check size={12}/>Hồ sơ đã xác minh</span><span className="room-badge-avail">{item.availableRooms>0?`Còn ${item.availableRooms} phòng trống`:'Hết phòng'}</span>
   <button type="button" className={`btn-card-wishlist${saved?' active':''}`} aria-label={`${saved?'Bỏ lưu':'Lưu'} ${item.propertyName} — ${item.roomTypeName}`} aria-pressed={saved} title={saved?'Bỏ lưu loại phòng':'Lưu loại phòng'} disabled={saveBusy} aria-busy={saveBusy} onClick={()=>onSave(item.roomTypeId)}><Heart size={18}/></button>
  </div>
  <div className="room-body"><div className="room-location"><MapPin size={14}/><span>{item.address||'Chưa cập nhật địa chỉ'}</span></div>
   <h3 className="room-title" title={`${item.propertyName} — ${item.roomTypeName}`}><Link to={url}>{item.propertyName} — {item.roomTypeName}</Link></h3>
   <div className="room-amenities"><span className="amenity-pill">📐 {item.areaSqm} m²</span>{amenities.slice(0,3).map((text,index)=><span className="amenity-pill" key={index}>{text}</span>)}{amenities.length>3&&<span className="amenity-pill">+{amenities.length-3}</span>}</div>
   <div className="room-price-row"><div><span className="price-main">{detailMoney(item.price)}</span><span className="price-unit">/tháng</span></div><div className="utility-rates">⚡ {Number.isFinite(item.electricityPrice)?`${detailMoney(item.electricityPrice)}/kWh`:'Chưa cập nhật'}<br/>💧 {Number.isFinite(item.waterPrice)?`${detailMoney(item.waterPrice)}/m³`:'Chưa cập nhật'}</div></div>
   <div className="room-actions"><Link to={url} className="btn-card-detail">Chi tiết phòng</Link><Link to={`${url}#host-contact`} className="btn-card-contact"><Phone size={14}/><span>Gọi chủ trọ</span></Link></div>
  </div>
  {comparisonControl}
 </article>;
}
