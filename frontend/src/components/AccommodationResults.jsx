import { House, LoaderCircle } from 'lucide-react';
import AccommodationCard from './AccommodationCard.jsx';

export default function AccommodationResults({ data, loading, error, retry }) {
  if (loading) return <div className="acc-state" role="status"><LoaderCircle className="spin" />Đang tải danh sách nhà trọ...</div>;
  if (error) return <div className="acc-state" role="alert"><p>{error}</p><button className="acc-link" onClick={retry}>Thử lại</button></div>;
  if (!data?.items.length) return <div className="acc-state"><House size={36} /><h3>Chưa có nhà trọ phù hợp</h3><p>Chỉ hiển thị nhà trọ đã được duyệt và đang công khai. Bạn có thể thử thay đổi bộ lọc.</p></div>;
  return <div className="acc-grid">{data.items.map(item => <AccommodationCard key={item.roomTypeId} item={item} />)}</div>;
}
