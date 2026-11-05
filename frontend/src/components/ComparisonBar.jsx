import {Link} from 'react-router-dom';
import {ArrowLeftRight,X} from 'lucide-react';
export default function ComparisonBar({ids,onClear}) {
  if(!ids.length)return null;
  return <aside className="comparison-bar" aria-label="Các phòng đã chọn so sánh">
    <div><span className="comparison-bar-icon"><ArrowLeftRight size={22}/></span><div><strong role="status">Đã chọn {ids.length}/4 phòng</strong><p>{ids.length===4?'Đã đủ 4 phòng. Bỏ chọn một phòng để thay lựa chọn.':'Chọn từ 2 đến 4 loại phòng để đối chiếu.'}</p></div></div>
    <div className="comparison-bar-actions"><button type="button" className="p-button" onClick={onClear}><X size={16}/>Bỏ chọn tất cả</button>{ids.length>=2?<Link className="p-button primary" to={`/favorites/compare?ids=${ids.join(',')}`}><ArrowLeftRight size={17}/>So sánh ngay</Link>:<button type="button" className="p-button primary" disabled>So sánh ngay</button>}</div>
  </aside>;
}
