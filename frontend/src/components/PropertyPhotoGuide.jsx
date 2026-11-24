import {Camera,Building2,Trees,DoorOpen,Bath,Check} from 'lucide-react';
import '../styles/property-photo-guide.css';

const angles=[
 [Building2,'Mặt tiền nhà trọ','Chụp toàn cảnh bên ngoài, cổng ra vào và biển tên nếu có.'],
 [Trees,'Khuôn viên & lối vào','Chụp sân, ngõ vào và không gian chung để dễ hình dung đường đi.'],
 [DoorOpen,'Bên trong phòng trọ','Chụp bao quát phòng, cửa sổ và nội thất thực tế; có thể chụp từ hai góc khác nhau.'],
 [Bath,'Bếp & nhà vệ sinh','Chụp rõ khu vực bếp, nhà vệ sinh và thiết bị đi kèm nếu có.'],
];
export default function PropertyPhotoGuide({embedded=false}){return <section className={`property-photo-guide${embedded?' property-photo-guide--embedded':''}`} aria-label="Hướng dẫn chụp ảnh nhà trọ">
 <header><Camera size={20} aria-hidden="true"/><div><h4>Chụp ảnh nhà trọ như thế nào?</h4><p>Ưu tiên ảnh thực tế, rõ nét và đủ sáng. Các góc chụp dưới đây là gợi ý để hồ sơ đầy đủ hơn.</p></div></header>
 <ul className="property-photo-guide-angles">{angles.map(([Icon,title,description])=><li key={title}><Icon size={19} aria-hidden="true"/><div><strong>{title}</strong><p>{description}</p></div></li>)}</ul>
 <p className="property-photo-guide-extra">Có thể thêm ảnh chỗ để xe, hành lang, cầu thang, khu giặt phơi hoặc lối thoát hiểm nếu có.</p>
 <ul className="property-photo-guide-tips"><li><Check size={16} aria-hidden="true"/><span>Chụp ban ngày hoặc bật đủ đèn, giữ máy chắc tay để ảnh không mờ, rung hay ngược sáng.</span></li><li><Check size={16} aria-hidden="true"/><span>Chụp bao quát, tránh cắt mất góc phòng; dùng ảnh đúng hiện trạng, không chỉnh sửa làm sai lệch không gian.</span></li></ul>
 <p className="property-photo-guide-cover"><strong>Ảnh đại diện:</strong> Ưu tiên ảnh mặt tiền hoặc toàn cảnh đẹp, rõ nét. Ảnh đầu tiên trong danh sách được dùng làm ảnh đại diện.</p>
 </section>;}
