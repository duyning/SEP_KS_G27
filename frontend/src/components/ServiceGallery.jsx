import UIButton from './common/Button.jsx';
import { useEffect, useRef, useState } from 'react';
import Modal from './common/Modal.jsx';
import ServicePhoto from './ServicePhoto.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function DetailGallery({ urls = [], alt }) {
  const [selected, setSelected] = useState(0), [expanded, setExpanded] = useState(false);
  const thumbnails = useRef(null);
  const count = urls.length;
  const active = Math.min(selected, Math.max(0, count - 1));
  const move = delta => setSelected(index => (index + delta + count) % count);
  const keyDown = event => {
    if (event.defaultPrevented || count < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  };
  useEffect(() => {
    const strip = thumbnails.current, item = strip?.children[active];
    if (!item) return;
    if (item.offsetLeft < strip.scrollLeft) strip.scrollLeft = item.offsetLeft;
    else if (item.offsetLeft + item.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollLeft = item.offsetLeft + item.offsetWidth - strip.clientWidth;
  }, [active]);
  useEffect(() => {
    if (!expanded) return;
    const handle = event => {
      if (event.defaultPrevented || count < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      setSelected(index => (index + (event.key === 'ArrowLeft' ? -1 : 1) + count) % count);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [expanded, count]);
  const frame = enlarged => <div className={`svc-detail-gallery-frame${enlarged ? ' is-enlarged' : ''}`}>
    {enlarged ? <ServicePhoto key={active} url={urls[active]} alt={`${alt} — ảnh ${active + 1}`} backdrop /> :
      <UIButton type="button" variant="ghost" className="svc-gallery-zoom" aria-label={`Phóng to ảnh ${active + 1} của ${alt}`} disabled={!count} onClick={() => setExpanded(true)}>
        <ServicePhoto key={active} url={urls[active]} alt={`${alt} — ảnh ${active + 1}`} backdrop />
      </UIButton>}
    {count > 1 && <>
      <UIButton type="button" variant="ghost" className="svc-gallery-arrow is-previous" aria-label="Ảnh trước" onClick={() => move(-1)}><ChevronLeft size={24} aria-hidden="true" /></UIButton>
      <UIButton type="button" variant="ghost" className="svc-gallery-arrow is-next" aria-label="Ảnh tiếp theo" onClick={() => move(1)}><ChevronRight size={24} aria-hidden="true" /></UIButton>
    </>}
    {count > 1 && <span className="svc-gallery-counter" role="status" aria-label={`Ảnh ${active + 1} trên ${count}`}>{active + 1}/{count}</span>}
  </div>;
  return <div className="svc-detail-gallery" role="group" aria-label="Ảnh dịch vụ, dùng phím trái và phải để chuyển ảnh" onKeyDown={keyDown}>
    {frame(false)}
    {count > 1 && <div className="svc-detail-thumbnails" ref={thumbnails} aria-label="Chọn ảnh dịch vụ">{urls.map((url, index) =>
      <UIButton key={index} type="button" variant="ghost" aria-label={`Xem ảnh ${index + 1} của ${alt}`} aria-pressed={index === active} onClick={() => setSelected(index)}><ServicePhoto url={url} alt="" /></UIButton>
    )}</div>}
    {expanded && <Modal title={alt} maxWidth="1100px" className="svc-gallery-lightbox" onClose={() => setExpanded(false)}>{frame(true)}</Modal>}
  </div>;
}

export default function ServiceGallery({ application, urls, alt = 'Ảnh dịch vụ', presentation }) {
  if (presentation === 'detail') return <DetailGallery urls={urls} alt={alt} />;
  return <ApplicationGallery application={application} urls={urls} alt={alt} />;
}

function ApplicationGallery({ application, urls, alt }) {
  const [selected, setSelected] = useState(0);
  const count = application ? application.imageCount ?? (application.hasImage ? 1 : 0) : urls?.length || 0;
  const active = Math.min(selected, Math.max(0, count - 1));
  return <div className="svc-gallery">
    {count > 0 && <div className="svc-gallery-heading"><span>Ảnh dịch vụ</span><span aria-live="polite">{active + 1} / {count}</span></div>}
    <ServicePhoto key={`${application?.registrationId}-${application?.revision}-${active}-${urls?.[active]}`} application={application} index={active} url={urls?.[active]} alt={`${alt} ${active + 1}`} />
    {count > 1 && <div className="svc-gallery-navigation"><UIButton type="button" aria-label="Ảnh trước" disabled={active === 0} onClick={() => setSelected(active - 1)}><ChevronLeft size={16} aria-hidden="true" />Ảnh trước</UIButton><UIButton type="button" aria-label="Ảnh tiếp theo" disabled={active === count - 1} onClick={() => setSelected(active + 1)}>Ảnh tiếp theo<ChevronRight size={16} aria-hidden="true" /></UIButton></div>}
    {count > 1 && <div className="svc-gallery-thumbnails" aria-label="Các ảnh dịch vụ">{Array.from({ length: count }, (_, index) => <UIButton key={index} type="button" aria-label={`Xem ảnh ${index + 1}`} aria-pressed={index === active} onClick={() => setSelected(index)}><ServicePhoto application={application} index={index} url={urls?.[index]} alt={`Ảnh ${index + 1}`} /></UIButton>)}</div>}
  </div>;
}
