export const COMMUNITY_FOCUS_REFRESH_STALE_MS = 30_000;

export const initialCommunityLoadState = scope => ({
  loading: true,
  refreshing: false,
  data: null,
  error: '',
  refreshError: '',
  scope,
});

export function beginCommunityLoad(current, scope) {
  if (current.scope !== scope || current.data === null) return initialCommunityLoadState(scope);
  return { ...current, loading: false, refreshing: true, error: '', refreshError: '' };
}

export function failCommunityLoad(current, scope, message) {
  if (current.scope === scope && current.data !== null) {
    return { ...current, loading: false, refreshing: false, error: '', refreshError: message };
  }
  return { loading: false, refreshing: false, data: null, error: message, refreshError: '', scope };
}

export function shouldRefreshCommunityOnFocus({ visibility, requestActive, scope, lastSuccess, lastAttempt, now = Date.now() }) {
  if (visibility === 'hidden' || requestActive || lastSuccess.scope !== scope) return false;
  if (now - lastSuccess.at < COMMUNITY_FOCUS_REFRESH_STALE_MS) return false;
  return lastAttempt.scope !== scope || now - lastAttempt.at >= COMMUNITY_FOCUS_REFRESH_STALE_MS;
}
