import { AlertCircle, RefreshCw } from 'lucide-react';
import { BRAND } from '../../config/brand.js';
import BrandEmblem from './BrandEmblem.jsx';
import {
  DEFAULT_GLOBAL_LOADING_MESSAGE,
  normalizeLoadingMessage
} from './loading-policy.js';

/**
 * Unified App-level GlobalLoading / GlobalSplashLoading component for NestHub.
 *
 * Role-agnostic by design: never displays role-specific badges or labels.
 * Use ONLY when the full application is not yet ready (bootstrap, auth session restore,
 * role/access resolution, mandatory pre-layout data, or full-viewport Suspense fallbacks).
 *
 * Also handles bootstrap/session failure cleanly via `error` + `onRetry` so the screen
 * never spins indefinitely.
 */
export default function GlobalLoading({
  message = DEFAULT_GLOBAL_LOADING_MESSAGE,
  submessage = '',
  brandName = BRAND.name,
  overlay = false,
  logoSrc = '',
  error = '',
  errorTitle = 'Không thể khởi tạo phiên làm việc',
  onRetry = null,
  retryLabel = 'Thử lại',
  onSecondaryAction = null,
  secondaryLabel = 'Về đăng nhập',
  className = ''
}) {
  const screenClass = `gl-screen${overlay ? ' gl-overlay' : ''}${className ? ` ${className}` : ''}`;

  if (error) {
    return (
      <div className={screenClass} data-testid="global-loading-error">
        <div className="gl-card is-error" role="alert" aria-live="assertive">
          <div className="gl-error-badge" aria-hidden="true">
            <AlertCircle size={28} strokeWidth={2} />
          </div>
          <div className="gl-copy">
            <h1 className="gl-error-title">{errorTitle}</h1>
            <p className="gl-error-message">{error}</p>
          </div>
          {(onRetry || onSecondaryAction) && (
            <div className="gl-actions">
              {onRetry && (
                <button type="button" className="gl-btn gl-btn-primary" onClick={onRetry}>
                  <RefreshCw size={16} aria-hidden="true" />
                  <span>{retryLabel}</span>
                </button>
              )}
              {onSecondaryAction && (
                <button type="button" className="gl-btn gl-btn-secondary" onClick={onSecondaryAction}>
                  <span>{secondaryLabel}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const label = normalizeLoadingMessage(message, DEFAULT_GLOBAL_LOADING_MESSAGE);

  return (
    <div
      className={screenClass}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="global-loading"
    >
      <div className="gl-card">
        <div className="gl-orbit" aria-hidden="true">
          <svg className="gl-ring-svg" viewBox="0 0 96 96" focusable="false">
            <circle className="gl-ring-track" cx="48" cy="48" r="43" />
            <circle className="gl-ring-arc" cx="48" cy="48" r="43" />
          </svg>
          <BrandEmblem size="lg" logoSrc={logoSrc} className="gl-emblem-breathe" />
        </div>
        <div className="gl-copy">
          {brandName ? <p className="gl-brand">{brandName}</p> : null}
          <p className="gl-message">{label}</p>
          {submessage ? <p className="gl-submessage">{submessage}</p> : null}
          <span className="gl-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </div>
  );
}
