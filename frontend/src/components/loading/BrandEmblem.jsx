import BrandIcon from '../brand/BrandIcon.jsx';

/**
 * Official NestHub brand emblem used inside GlobalLoading and PageLoading.
 * Renders the exact NestHub house-nest vector icon inside the rounded teal badge.
 */
export default function BrandEmblem({
  size = 'lg',
  logoSrc = '',
  logoAlt = 'NestHub',
  className = ''
}) {
  const iconSize = size === 'sm' ? 22 : 30;
  const baseClass = size === 'sm' ? 'pl-emblem' : 'gl-emblem';

  return (
    <span className={`${baseClass}${className ? ` ${className}` : ''}`} aria-hidden="true">
      {logoSrc ? (
        <img className="gl-emblem-img" src={logoSrc} alt={logoAlt} />
      ) : (
        <BrandIcon size={iconSize} variant="white" />
      )}
    </span>
  );
}
