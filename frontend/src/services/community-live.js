import { clearToken, getToken } from './auth.js';

// Fetch streaming permits JWT headers; never put credentials into an EventSource URL.
export async function readCommunityStream(stream, onEvent, signal, onActivity = () => {}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      onActivity();
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (data) { try { const event = JSON.parse(data); if (event.type !== 'heartbeat') onEvent(event); } catch { /* Ignore malformed frames. */ } }
      }
      if (buffer.length > 65536) throw new Error('Invalid event stream');
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export function startCommunityRealtime() {
  let stopped = false, controller, retry, attempt = 0;
  const connect = async () => {
    if (stopped || !navigator.onLine) return;
    clearTimeout(retry);
    controller?.abort();
    const current = new AbortController(); controller = current;
    const token = getToken();
    let received = false;
    const handshake = setTimeout(() => { if (!stopped && controller === current) reconnect(); }, 15000);
    try {
      const response = await fetch('/api/community/events', { signal: current.signal, credentials: 'omit',
        headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      clearTimeout(handshake);
      if ([401, 403].includes(response.status) && token && token === getToken()) {
        clearToken(); window.dispatchEvent(new Event('hlrcs:session-expired')); return;
      }
      if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Stream unavailable');
      let lastActivity = Date.now();
      const watchdog = setInterval(() => { if (controller === current && Date.now() - lastActivity > 45000) reconnect(); }, 15000);
      try { await readCommunityStream(response.body, event => {
        if (current.signal.aborted || stopped || token !== getToken()) return;
        received = true; attempt = 0;
        window.dispatchEvent(new CustomEvent('hlrcs:community-live', { detail: event }));
      }, current.signal, () => { lastActivity = Date.now(); }); }
      finally { clearInterval(watchdog); }
    } catch { /* Reconnect and resync through the authorized REST APIs. */ }
    finally { clearTimeout(handshake); }
    if (!stopped && controller === current && !current.signal.aborted) {
      const delay = received ? 500 : Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5));
      retry = setTimeout(connect, delay + Math.random() * 300);
    }
  };
  const reconnect = () => { clearTimeout(retry); connect(); };
  const online = () => reconnect();
  // The new connection sends resync itself; dispatching here too duplicates all reads.
  const visible = () => { if (!document.hidden) reconnect(); };
  window.addEventListener('online', online);
  document.addEventListener('visibilitychange', visible);
  connect();
  return () => { stopped = true; clearTimeout(retry); controller?.abort(); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visible); };
}
