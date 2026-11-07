import { useId } from 'react';
import { X } from 'lucide-react';
import { MotionButton, MotionSheet } from './motion/MotionUI.jsx';

export default function HostDrawer({
  title,
  subtitle,
  badge,
  kicker,
  onClose,
  footer,
  children,
  className = '',
  size = 'md',
}) {
  const titleId = useId();
  const subtitleId = useId();

  return (
    <MotionSheet
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onClose={onClose}
      panelClassName={`hm-drawer hm-drawer-${size} ${className}`.trim()}
    >
      <header className="hm-drawer-header">
        <div className="hm-drawer-heading">
          {kicker && <span className="hm-drawer-kicker">{kicker}</span>}
          <div className="hm-drawer-title-row">
            <h2 id={titleId}>{title}</h2>
            {badge}
          </div>
          {subtitle && (
            <p id={subtitleId} className="hm-drawer-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        <MotionButton
          type="button"
          className="hm-icon-btn hm-drawer-close"
          title="Đóng bảng chi tiết"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={18} />
        </MotionButton>
      </header>

      <div className="hm-drawer-body">{children}</div>

      {footer && <footer className="hm-drawer-footer">{footer}</footer>}
    </MotionSheet>
  );
}
