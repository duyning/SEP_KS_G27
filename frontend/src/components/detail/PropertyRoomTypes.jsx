import { ArrowRight, BedDouble, Check, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';
import AvailabilityNotice from '../AvailabilityNotice.jsx';
import { DetailImage } from './DetailPrototypeParts.jsx';
import { detailMoney } from '../../services/detail-prototype.js';
import { accommodationDetailUrl } from '../../services/map-location.js';
import { withSearchOrigin } from '../../services/search-origin.js';

export default function PropertyRoomTypes({ item, origin }) {
  const listedTypes = (item.roomTypes ?? []).filter(type => type.propertyId === item.propertyId);
  const types = listedTypes.some(type => type.roomTypeId === item.roomTypeId) ? listedTypes : [item, ...listedTypes];

  return <section className="property-room-types" aria-labelledby="property-room-types-title">
    <div className="property-room-types-heading">
      <h2 id="property-room-types-title">Các loại phòng tại nhà trọ</h2>
      {listedTypes.length > 0 && <span>{types.length} loại phòng</span>}
    </div>
    <ul className="property-room-types-grid" role="list">
      {types.map(type => {
        const selected = type.roomTypeId === item.roomTypeId;
        const titleId = `property-room-type-${type.roomTypeId}`;
        const photo = selected ? item.gallery[0]?.url ?? type.imageUrl : type.imageUrl;
        return <li key={type.roomTypeId}>
          <Link className="property-room-choice" aria-labelledby={titleId} aria-current={selected ? 'true' : undefined}
            to={withSearchOrigin(`${accommodationDetailUrl(type)}#room-type-details`, origin)}>
            <div className="property-room-choice-photo">
              <DetailImage src={photo} alt="" loading="lazy" decoding="async" />
              {selected && <span className="property-room-current"><Check size={16} aria-hidden="true" />Đang xem</span>}
            </div>
            <div className="property-room-choice-body">
              <h3 id={titleId}>{type.roomTypeName}</h3>
              <p className="property-room-choice-price"><strong>{detailMoney(type.price)}</strong> <span>/ tháng</span></p>
              <div className="property-room-choice-facts">
                <span><Ruler size={16} aria-hidden="true" />{type.areaSqm} m²</span>
                <span><BedDouble size={16} aria-hidden="true" />{type.availableRooms > 0 ? `Còn ${type.availableRooms} phòng trống` : 'Hết phòng'}</span>
              </div>
              <AvailabilityNotice value={type} />
              <span className="property-room-choice-action">Xem chi tiết<ArrowRight size={17} aria-hidden="true" /></span>
            </div>
          </Link>
        </li>;
      })}
    </ul>
    {!listedTypes.length && <p className="detail-empty-note">Chưa tải được danh sách các loại phòng khác.</p>}
  </section>;
}
