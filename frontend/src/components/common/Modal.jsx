import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, useIsPresent } from 'motion/react';
import { AnimatePresence, useSurfaceMotion } from '../motion/MotionUI.jsx';

export default function Modal({ title, isOpen = true, onClose, children, maxWidth = '560px', closeOnBackdrop = true, closeOnEscape = true, className = '', footer }) {
  return <AnimatePresence propagate>{isOpen && <ModalBody {...{ title, onClose, children, maxWidth, closeOnBackdrop, closeOnEscape, className, footer }} />}</AnimatePresence>;
}

function ModalBody({ title, onClose, children, maxWidth, closeOnBackdrop, closeOnEscape, className, footer }) {
  const titleId = useId();
  const overlayRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const escapeRef = useRef(closeOnEscape);
  escapeRef.current = closeOnEscape;
  const present = useIsPresent();
  const surface = useSurfaceMotion();

  useEffect(() => {
    if (!present) return;
    const trigger = document.activeElement;
    const overlay = overlayRef.current;
    const focusable = () => [...overlay.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
    focusable()[0]?.focus({ preventScroll: true });
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && escapeRef.current) {
        e.preventDefault();
        closeRef.current?.();
      }
      if (e.key === 'Tab') {
        const items = focusable(), first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [present]);

  return (
    <div
      ref={overlayRef}
      className={`modal-overlay ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      inert={!present || undefined}
      aria-hidden={!present || undefined}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === overlayRef.current) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <motion.div
        className="modal-container"
        {...surface}
        data-ui-motion="dialog"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h3 id={titleId} style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {children}
        </div>
        {footer && <div className="modal-footer" style={{ flexShrink: 0 }}>{footer}</div>}
      </motion.div>
    </div>
  );
}
