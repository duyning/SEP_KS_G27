import {Link} from 'react-router-dom';
import {DetailImage} from './DetailPrototypeParts.jsx';
import {detailMoney} from '../../services/detail-prototype.js';

export default function PropertyRoomTypes({item}) {
 const types=(item.roomTypes||[]).filter(type=>type.propertyId===item.propertyId);
 return <section className="property-room-types" aria-labelledby="property-room-types-title">
  <div className="property-room-types-heading"><div><h2 id="property-room-types-title">Các loại phòng tại nhà trọ</h2><p>Chọn loại phòng để xem hình ảnh, tiện nghi và chi phí tương ứng.</p></div><span>{types.length} loại phòng</span></div>
  {types.length ? <div className="property-room-types-grid">{types.map(type=>{
   const selected=type.roomTypeId===item.roomTypeId;
   return <Link key={type.roomTypeId} className={`property-room-choice${selected?' is-selected':''}`} aria-current={selected?'true':undefined} to={`/properties/detail?${new URLSearchParams({propertyId:item.propertyId,roomTypeId:type.roomTypeId})}#room-type-details`}>
    <div className="property-room-choice-photo"><DetailImage src={type.imageUrl} alt={type.roomTypeName}/></div>
    <div className="property-room-choice-body"><h3>{type.roomTypeName}</h3><strong>{detailMoney(type.price)} <small>/ tháng</small></strong><p>{type.areaSqm} m² · {type.availableRooms>0?`Còn ${type.availableRooms} phòng trống`:'Hết phòng'}</p><span>{selected?'✓ Đang xem loại phòng này':'Xem thông tin loại phòng →'}</span></div>
   </Link>;
  })}</div> : <p className="detail-empty-note">Chưa tải được danh sách loại phòng. Thông tin bên dưới thuộc loại phòng đang xem.</p>}
 </section>;
}
