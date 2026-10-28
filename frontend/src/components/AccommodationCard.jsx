import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, MapPin, ShieldCheck } from 'lucide-react';
import '../styles/accommodations.css';

export const rent = value => value == null ? 'Chưa cập nhật giá' : `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
export function AccommodationPhoto({ item }) {
  const [failedUrl, setFailedUrl] = useState(null);
  return item.imageUrl && failedUrl !== item.imageUrl
    ? <img src={item.imageUrl} alt={`${item.propertyName} - ${item.roomTypeName}`} loading="lazy" onError={() => setFailedUrl(item.imageUrl)} />
    : <div className="acc-no-photo"><ImageOff size={32} /><span>Chưa có ảnh phòng</span></div>;
}
export default function AccommodationCard({ item }) {
  const detailUrl = `/properties/detail?propertyId=${item.propertyId}&roomTypeId=${item.roomTypeId}`;
  return <article className="acc-card">
    <Link className="acc-photo" to={detailUrl} aria-label={`Xem ${item.propertyName} - ${item.roomTypeName}`}><AccommodationPhoto item={item} />
      {item.verificationStatus === 'APPROVED' && <span className="acc-verified"><ShieldCheck size={14} />Đã xác minh</span>}
      <span className="acc-vacancy">{item.availableRooms > 0 ? `Còn ${item.availableRooms} phòng trống` : 'Hết phòng'}</span>
    </Link>
    <div className="acc-card-body"><span className="acc-area">{item.areaSqm} m²</span><h3><Link to={detailUrl}>{item.propertyName}</Link></h3><p className="acc-type">{item.roomTypeName}</p><p className="acc-address"><MapPin size={15} />{item.address || 'Chưa cập nhật địa chỉ'}</p>
      <div className="acc-card-footer"><div><strong>{rent(item.price)}</strong><small>/tháng</small></div><Link className="acc-link" to={detailUrl}>Xem phòng</Link></div>
    </div>
  </article>;
}
