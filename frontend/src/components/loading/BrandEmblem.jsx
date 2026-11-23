import { House } from 'lucide-react';

/**
 * Official NestHub / HL_RCS brand emblem used consistently with AuthLayout and PortalLayout.
 * If a static image logo asset is later added, pass `logoSrc` to swap seamlessly.
 */
export default function BrandEmblem({
  size = 'lg',
  logoSrc = '',
  logoAlt = 'NestHub',
  className = ''
}) {
  const iconSize = size === 'sm' ? 20 : 26;
  const baseClass = size === 'sm' ? 'pl-emblem' : 'gl-emblem';

  return (
    <span className={`${baseClass}${className ? ` ${className}` : ''}`} aria-hidden="true">
      {logoSrc ? (
        <img className="gl-emblem-img" src={logoSrc} alt={logoAlt} />
      ) : (
        <House size={iconSize} strokeWidth={2.2} />
      )}
    </span>
  );
}
