import { useEffect, useRef } from 'react';
import { SERVICE_UPDATED } from '../services/service-live.js';

// Background reads never reset loading state or overwrite an editor's draft.
export default function useServiceLive(load, apply, { enabled = true, identity = '', onError } = {}) {
  const latest = useRef(); latest.current = { load, apply, onError };
  useEffect(() => {
    if (!enabled) return;
    let stopped = false, running = false;
    const controller = new AbortController();
    async function refresh() {
      if (stopped || running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const data = await latest.current.load(controller.signal);
        if (!stopped) latest.current.apply(data);
      } catch (error) { if (!stopped && error.name !== 'AbortError') latest.current.onError?.(error); }
      finally { running = false; }
    }
    const storage = event => { if (event.key === SERVICE_UPDATED) refresh(); };
    const timer = setInterval(refresh, 5000);
    window.addEventListener(SERVICE_UPDATED, refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      stopped = true; controller.abort(); clearInterval(timer);
      window.removeEventListener(SERVICE_UPDATED, refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, identity]);
}
