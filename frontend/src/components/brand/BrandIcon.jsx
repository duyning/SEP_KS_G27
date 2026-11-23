import { useId } from 'react';
import { BRAND } from '../../config/brand.js';

/**
 * Official NestHub house-nest vector icon matching the brand reference.
 * Supports:
 * - variant="teal" (default): teal stroke on transparent background (for light surfaces)
 * - variant="white": white stroke (for dark or teal surfaces)
 * - variant="badge": white stroke inside a rounded teal gradient square
 */
export default function BrandIcon({
  size = 36,
  variant = 'teal',
  className = '',
  title = ''
}) {
  const gradientId = useId().replace(/:/g, '');
  const isBadge = variant === 'badge';
  const strokeColor =
    variant === 'white' || isBadge
      ? '#FFFFFF'
      : `url(#nh-icon-${gradientId})`;

  const svg = (
    <svg
      width={isBadge ? Math.round(size * 0.68) : size}
      height={isBadge ? Math.round(size * 0.68) : size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
      className={isBadge ? 'nh-brand-svg' : `nh-brand-svg${className ? ` ${className}` : ''}`}
    >
      {title ? <title>{title}</title> : null}
      {!isBadge && variant === 'teal' && (
        <defs>
          <linearGradient id={`nh-icon-${gradientId}`} x1="7" y1="7" x2="41" y2="41" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="55%" stopColor={BRAND.primaryColor} />
            <stop offset="100%" stopColor={BRAND.primaryDarkColor} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M16.5 40H11.5C9.29 40 7.5 38.21 7.5 36V21.2C7.5 19.82 8.15 18.52 9.26 17.69L21.66 8.43C23.05 7.39 24.95 7.39 26.34 8.43L38.74 17.69C39.85 18.52 40.5 19.82 40.5 21.2V36C40.5 38.21 38.71 40 36.5 40H31.5"
        stroke={strokeColor}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.4 33.2V27.4C17.4 23.75 20.35 20.8 24 20.8C27.65 20.8 30.6 23.75 30.6 27.4V33.2"
        stroke={strokeColor}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!isBadge) return svg;

  return (
    <span
      className={`nh-brand-badge${className ? ` ${className}` : ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden={title ? undefined : 'true'}
    >
      {svg}
    </span>
  );
}
