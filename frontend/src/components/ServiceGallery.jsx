import { useState } from 'react';
import ServicePhoto from './ServicePhoto.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ServiceGallery({ application, urls, alt = 'Ảnh dịch vụ' }) {
  const [selected, setSelected] = useState(0);
  const count = application ? application.imageCount ?? (application.hasImage ? 1 : 0) : urls?.length || 0;
  const active = Math.min(selected, Math.max(0, count - 1));
  return <div className="svc-gallery">
    {count > 0 && <div className="svc-gallery-heading"><span>Ảnh dịch vụ</span><span aria-live="polite">{active + 1} / {count}</span></div>}
    <ServicePhoto key={`${application?.registrationId}-${application?.revision}-${active}-${urls?.[active]}`} application={application} index={active} url={urls?.[active]} alt={`${alt} ${active + 1}`} />
    {count > 1 && <div className="svc-gallery-navigation"><button type="button" aria-label="Ảnh trước" disabled={active === 0} onClick={() => setSelected(active - 1)}><ChevronLeft size={16} aria-hidden="true" />Ảnh trước</button><button type="button" aria-label="Ảnh tiếp theo" disabled={active === count - 1} onClick={() => setSelected(active + 1)}>Ảnh tiếp theo<ChevronRight size={16} aria-hidden="true" /></button></div>}
    {count > 1 && <div className="svc-gallery-thumbnails" aria-label="Các ảnh dịch vụ">{Array.from({ length: count }, (_, index) => <button key={index} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-pressed={index === active} onClick={() => setSelected(index)}><ServicePhoto application={application} index={index} url={urls?.[index]} alt={`Ảnh ${index + 1}`} /></button>)}</div>}
  </div>;
}
