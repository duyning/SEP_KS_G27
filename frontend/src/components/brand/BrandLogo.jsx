import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand.js';
import BrandIcon from './BrandIcon.jsx';

const SIZE_MAP = {
  sm: { icon: 30, textClass: 'is-sm' },
  md: { icon: 36, textClass: 'is-md' },
  lg: { icon: 44, textClass: 'is-lg' }
};

/**
 * Centralized NestHub BrandLogo component.
 * - size: 'sm' | 'md' | 'lg'
 * - tone: 'light' (dark teal wordmark on light bg) | 'dark' (white wordmark on dark bg)
 * - iconVariant: 'teal' | 'white' | 'badge'
 * - iconOnly: hides text wordmark when true
 * - subtitle: optional secondary line (e.g. portal label or tagline)
 * - to: optional React Router path (renders as Link when provided, else span)
 */
export default function BrandLogo({
  size = 'md',
  tone = 'light',
  iconVariant,
  iconOnly = false,
  subtitle = '',
  to = '',
  onClick,
  className = '',
  ariaLabel
}) {
  const preset = SIZE_MAP[size] || SIZE_MAP.md;
  const resolvedIconVariant = iconVariant || (tone === 'dark' ? 'white' : 'teal');
  const rootClass = `nh-brand-logo ${preset.textClass} tone-${tone}${className ? ` ${className}` : ''}`;

  const inner = (
    <>
      <BrandIcon size={preset.icon} variant={resolvedIconVariant} />
      {!iconOnly && (
        <span className="nh-brand-copy">
          <strong className="nh-brand-name">{BRAND.name}</strong>
          {subtitle ? <small className="nh-brand-sub">{subtitle}</small> : null}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={rootClass}
        aria-label={ariaLabel || `${BRAND.name} - ${BRAND.tagline}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span className={rootClass} aria-label={ariaLabel}>
      {inner}
    </span>
  );
}
