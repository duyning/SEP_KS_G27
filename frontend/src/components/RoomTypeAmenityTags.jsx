import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import '../styles/room-amenity-tags.css';
import { ROOM_AMENITIES } from '../services/room-types.js';

export default function RoomTypeAmenityTags({ amenities = [], name }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const trigger = useRef(null), popup = useRef(null), timer = useRef(null);
  const id = useId();
  const keys = [...new Set(amenities)];
  const hidden = keys.slice(3);
  const label = key => ROOM_AMENITIES.find(([value]) => value === key)?.[1] || key;
  const cancelClose = () => clearTimeout(timer.current);
  const show = () => { cancelClose(); setOpen(true); };
  const hideLater = () => { cancelClose(); timer.current = setTimeout(() => { if (document.activeElement !== trigger.current) setOpen(false); }, 150); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !popup.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const rect = popup.current.getBoundingClientRect();
      const below = anchor.bottom + 8;
      const top = below + rect.height <= innerHeight - 12 ? below : Math.max(12, anchor.top - rect.height - 8);
      setPosition({ left: Math.max(12, Math.min(anchor.left, innerWidth - rect.width - 12)), top });
    };
    const dismiss = event => {
      if (event.key === 'Escape') { cancelClose(); setOpen(false); }
    };
    const outside = event => {
      if (!trigger.current?.contains(event.target) && !popup.current?.contains(event.target)) setOpen(false);
    };
    // Hide on scroll so a tooltip cannot remain over an unrelated row.
    const scroll = event => { if (!popup.current?.contains(event.target)) setOpen(false); };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', scroll, true);
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  return <div className="rt-tags rt-amenity-preview">
    {keys.slice(0, 3).map(key => <span key={key}>{label(key)}</span>)}
    {hidden.length > 0 && <button ref={trigger} type="button" className="rt-amenity-more"
      aria-label={`Xem thêm ${hidden.length} tiện nghi của ${name}`} aria-describedby={open ? id : undefined}
      onMouseEnter={show} onMouseLeave={hideLater} onFocus={show} onBlur={() => setOpen(false)} onClick={show}>
      +{hidden.length}
    </button>}
    {!keys.length && <small>Chưa cập nhật</small>}
    {open && hidden.length > 0 && createPortal(<div id={id} ref={popup} role="tooltip" className="rt-amenity-tooltip"
      style={{ left: position.left, top: position.top }} onMouseEnter={cancelClose} onMouseLeave={hideLater}>
      <strong>Tiện nghi khác</strong><ul>{hidden.map(key => <li key={key}><Check size={14} aria-hidden="true" />{label(key)}</li>)}</ul>
    </div>, document.body)}
  </div>;
}
