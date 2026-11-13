import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button.jsx';
export default function Modal({ title, isOpen = true, onClose, children, maxWidth = '560px', className = '', initialFocus, closeDisabled = false }) {
  const dialog = useRef(null), close = useRef(onClose), titleId = useId(); close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current, previous = document.activeElement, overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    if (initialFocus) element.querySelector(initialFocus)?.focus({ preventScroll: true });
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return <dialog ref={dialog} className={'ui-modal ' + className} style={{ '--modal-max-width': maxWidth }} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close.current?.(); }}
    onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close.current?.(); } }}>
    <header className="ui-modal-header"><h2 id={titleId}>{title}</h2><Button type="button" variant="ghost" className="ui-modal-close" aria-label="Đóng" disabled={closeDisabled} onClick={onClose}><X size={20} aria-hidden="true" /></Button></header><div className="ui-modal-body">{children}</div>
  </dialog>;
}
