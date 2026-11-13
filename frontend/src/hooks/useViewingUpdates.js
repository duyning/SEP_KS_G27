import { useEffect, useRef } from 'react';
import { request } from '../services/auth.js';

const connections = new Map();

function subscribe(userId, listener) {
  let connection = connections.get(userId);
  if (!connection) {
    connection = { listeners: new Set(), controller: new AbortController() };
    connections.set(userId, connection);
    void listen(connection);
  }
  connection.listeners.add(listener);
  return () => {
    connection.listeners.delete(listener);
    if (!connection.listeners.size) {
      connection.controller.abort();
      connections.delete(userId);
    }
  };
}

async function listen({ controller, listeners }) {
  const { signal } = controller;
  let pending;
  const refresh = () => {
    if (pending !== undefined) return;
    pending = setTimeout(() => {
      pending = undefined;
      listeners.forEach(listener => listener());
    }, 80);
  };
  // Reconcile even if a proxy buffers the stream or requests reach another server.
  const timer = setInterval(refresh, 15_000);
  try {
    while (!signal.aborted) {
      let reader;
      try {
        const body = await request('/updates', {
          basePath: '/api/viewings', responseType: 'event-stream', signal,
        });
        reader = body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        while (!signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop();
          if (frames.some(frame => /^data: ?refresh\s*$/m.test(frame))) refresh();
        }
      } catch (error) {
        if (signal.aborted || [401, 403].includes(error.status)) return;
      } finally {
        reader?.releaseLock();
      }
      if (!signal.aborted) await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } finally {
    clearInterval(timer);
    clearTimeout(pending);
  }
}

export function useViewingUpdates(userId, onChange) {
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (!userId) return;
    return subscribe(userId, () => callback.current());
  }, [userId]);
}
