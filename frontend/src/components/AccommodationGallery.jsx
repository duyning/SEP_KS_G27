import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Images } from 'lucide-react';
import { Modal } from './PortalUI.jsx';

function GalleryPhoto({ photo, alt, eager = false }) {
  const [failed, setFailed] = useState(null);
  return photo?.url && failed !== photo.url
    ? <img src={photo.url} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(photo.url)} />
    : <span className="rd-photo-empty"><ImageOff size={36} /><span>Chưa có ảnh</span></span>;
}

export default function AccommodationGallery({ photos, title }) {
  const [active, setActive] = useState(null);
  const count = photos.length;
  const step = direction => setActive(value => (value + direction + count) % count);
  return <>
    <section className={`rd-gallery rd-gallery-count-${Math.min(count, 5)}`} aria-label="Hình ảnh nhà trọ">
      {count === 0 ? <div className="rd-gallery-missing"><GalleryPhoto alt={title} /></div> : photos.slice(0, 5).map((photo, index) =>
        <button type="button" className={`rd-gallery-cell ${index === 0 ? 'rd-gallery-main' : ''}`} key={photo.url} onClick={() => setActive(index)} aria-label={`Xem ảnh ${index + 1} của ${title}`}>
          <GalleryPhoto photo={photo} alt={`${title} - ảnh ${index + 1}`} eager={index === 0} />
        </button>)}
      {count > 0 && <button className="rd-gallery-all" type="button" onClick={() => setActive(0)}><Images size={17} />Xem tất cả {count} ảnh</button>}
    </section>
    {active !== null && count > 0 && <Modal title={`Hình ảnh nhà trọ · ${active + 1}/${count}`} className="rd-gallery-modal" onClose={() => setActive(null)}>
      <div className="rd-lightbox" onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); step(1); } }}>
        <div className="rd-lightbox-main"><GalleryPhoto photo={photos[active]} alt={`${title} - ảnh ${active + 1}`} eager />
          {count > 1 && <><button type="button" className="rd-image-prev" onClick={() => step(-1)} aria-label="Ảnh trước"><ChevronLeft /></button><button type="button" className="rd-image-next" onClick={() => step(1)} aria-label="Ảnh sau"><ChevronRight /></button></>}
        </div>
        <div className="rd-lightbox-thumbs">{photos.map((photo, index) => <button type="button" key={photo.url} onClick={() => setActive(index)} aria-label={`Ảnh ${index + 1}`} aria-pressed={active === index}><GalleryPhoto photo={photo} alt={`Ảnh thu nhỏ ${index + 1}`} /></button>)}</div>
      </div>
    </Modal>}
  </>;
}
