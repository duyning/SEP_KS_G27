export const DEFAULT_GLOBAL_LOADING_MESSAGE = 'Đang tải dữ liệu...';
export const DEFAULT_SESSION_LOADING_MESSAGE = 'Đang kiểm tra phiên đăng nhập...';
export const DEFAULT_PAGE_LOADING_MESSAGE = 'Đang tải nội dung...';

export const STANDALONE_PUBLIC_PATHS = Object.freeze([
  '/',
  '/favorites',
  '/favorites/compare',
  '/profile',
  '/become-host',
  '/properties/detail',
  '/search',
  '/map',
  '/community',
  '/services',
  '/services/detail'
]);

/**
 * Determines whether a screen renders full-viewport without PortalLayout's sidebar/topbar shell.
 * Standalone routes use GlobalLoading as their Suspense fallback; shell-wrapped routes use PageLoading.
 */
export function isStandaloneRoute(screen) {
  if (!screen) return true;
  if (screen.kind === 'auth') return true;
  if (['host', 'staff', 'admin'].includes(screen.portal)) return false;
  if (screen.kind === 'contractSigning') return false;
  return STANDALONE_PUBLIC_PATHS.includes(screen.path);
}

/**
 * Returns the recommended Suspense loading tier for a screen:
 * - 'global': full-viewport GlobalLoading (no portal chrome mounted yet)
 * - 'page': in-content PageLoading (sidebar/topbar chrome already rendered)
 */
export function resolveRouteLoadingTier(screen) {
  return isStandaloneRoute(screen) ? 'global' : 'page';
}

/**
 * Normalizes a loading message so empty/whitespace strings fall back to a neutral message.
 */
export function normalizeLoadingMessage(message, fallback = DEFAULT_GLOBAL_LOADING_MESSAGE) {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  return trimmed || fallback;
}
