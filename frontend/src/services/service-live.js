export const SERVICE_UPDATED = 'hlrcs:services-updated';
export function notifyServiceUpdate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SERVICE_UPDATED));
  try { localStorage.setItem(SERVICE_UPDATED, String(Date.now())); } catch { /* Polling remains available. */ }
}
