import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { AnimatePresence, MotionButton, MotionMenu } from './motion/MotionUI.jsx';

export default function HostActionMenu({ items = [], label = 'Thao tác khác', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return null;

  const toggleMenu = event => {
    event.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 210 && rect.top > 220);
    }
    setOpen(prev => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const focusFirst = requestAnimationFrame(() => {
      const focusables = listRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)');
      focusables?.[0]?.focus({ preventScroll: true });
    });

    const onPointerDown = event => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const nodes = [...(listRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)') || [])];
      if (!nodes.length) return;
      event.preventDefault();
      const index = nodes.indexOf(document.activeElement);
      if (event.key === 'Home') nodes[0].focus();
      else if (event.key === 'End') nodes[nodes.length - 1].focus();
      else if (event.key === 'ArrowDown') nodes[(index + 1) % nodes.length].focus();
      else if (event.key === 'ArrowUp') nodes[(index - 1 + nodes.length) % nodes.length].focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFirst);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="hm-action-menu-wrap" ref={wrapperRef}>
      <MotionButton
        ref={triggerRef}
        type="button"
        className={`hm-icon-btn hm-menu-trigger ${open ? 'is-open' : ''}`}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={16} />
      </MotionButton>

      <AnimatePresence>
        {open && (
          <MotionMenu
            id={menuId}
            ref={listRef}
            role="menu"
            aria-label={label}
            className={`hm-action-menu hm-align-${align} ${dropUp ? 'is-drop-up' : ''}`}
            style={{
              transformOrigin: `${dropUp ? 'bottom' : 'top'} ${align === 'left' ? 'left' : 'right'}`,
            }}
          >
            {visibleItems.map((item, index) => {
              if (item.divider) {
                return <div key={`div-${index}`} className="hm-menu-divider" role="separator" />;
              }
              const Icon = item.icon;
              const toneClass = item.tone === 'danger' ? 'is-danger' : '';
              if (item.to && !item.disabled) {
                return (
                  <Link
                    key={item.key || item.label}
                    role="menuitem"
                    to={item.to}
                    className={`hm-menu-item ${toneClass}`.trim()}
                    title={item.hint || undefined}
                    onClick={event => {
                      event.stopPropagation();
                      setOpen(false);
                      item.onSelect?.();
                    }}
                  >
                    {Icon && <Icon size={15} aria-hidden="true" />}
                    <span>{item.label}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.key || item.label}
                  type="button"
                  role="menuitem"
                  disabled={Boolean(item.disabled)}
                  aria-disabled={item.disabled ? 'true' : undefined}
                  title={item.hint || undefined}
                  className={`hm-menu-item ${toneClass}`.trim()}
                  onClick={event => {
                    event.stopPropagation();
                    if (item.disabled) return;
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {Icon && <Icon size={15} aria-hidden="true" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </MotionMenu>
        )}
      </AnimatePresence>
    </div>
  );
}
