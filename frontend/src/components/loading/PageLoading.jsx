import BrandEmblem from './BrandEmblem.jsx';
import {
  DEFAULT_PAGE_LOADING_MESSAGE,
  normalizeLoadingMessage
} from './loading-policy.js';

/**
 * Content-area loader rendered inside an existing layout shell (e.g. PortalLayout)
 * while a lazy-loaded page or route transition is loading.
 */
export default function PageLoading({
  message = DEFAULT_PAGE_LOADING_MESSAGE,
  logoSrc = '',
  className = ''
}) {
  const label = normalizeLoadingMessage(message, DEFAULT_PAGE_LOADING_MESSAGE);

  return (
    <div
      className={`pl-container${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="page-loading"
    >
      <div className="pl-orbit" aria-hidden="true">
        <svg className="gl-ring-svg" viewBox="0 0 96 96" focusable="false">
          <circle className="gl-ring-track" cx="48" cy="48" r="43" />
          <circle className="gl-ring-arc" cx="48" cy="48" r="43" />
        </svg>
        <BrandEmblem size="sm" logoSrc={logoSrc} />
      </div>
      <p className="pl-message">{label}</p>
    </div>
  );
}
