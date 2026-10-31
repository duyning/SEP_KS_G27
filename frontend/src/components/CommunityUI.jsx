import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { communityApi } from '../services/community.js';
import { beginCommunityLoad, failCommunityLoad, initialCommunityLoadState, shouldRefreshCommunityOnFocus } from '../services/community-load.js';

export function useCommunityLoad(view, id) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(() => initialCommunityLoadState(''));
  const scope = `${view}:${id ?? ''}:${user?.userId ?? ''}`;
  const stateRef = useRef(state);
  const scopeRef = useRef(scope);
  const requestVersion = useRef(0);
  const requestActive = useRef(false);
  const lastSuccess = useRef({ scope: '', at: 0 });
  const lastAttempt = useRef({ scope: '', at: 0 });
  stateRef.current = state;
  scopeRef.current = scope;

  useEffect(() => {
    const refresh = () => {
      if (!shouldRefreshCommunityOnFocus({
        visibility: document.visibilityState,
        requestActive: requestActive.current,
        scope: scopeRef.current,
        lastSuccess: lastSuccess.current,
        lastAttempt: lastAttempt.current,
      })) return;
      setRevision(value => value + 1);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const version = ++requestVersion.current;
    const current = stateRef.current;
    const loadingState = beginCommunityLoad(current, scope);
    requestActive.current = true;
    lastAttempt.current = { scope, at: Date.now() };
    stateRef.current = loadingState;
    setState(loadingState);
    communityApi[view](controller.signal, id)
      .then(data => {
        if (controller.signal.aborted || requestVersion.current !== version) return;
        const next = { loading: false, refreshing: false, data, error: '', refreshError: '', scope };
        lastSuccess.current = { scope, at: Date.now() };
        stateRef.current = next;
        setState(next);
      })
      .catch(error => {
        if (controller.signal.aborted || requestVersion.current !== version) return;
        const next = failCommunityLoad(stateRef.current, scope, error.message);
        stateRef.current = next;
        setState(next);
      })
      .finally(() => {
        if (requestVersion.current === version) requestActive.current = false;
      });
    return () => {
      controller.abort();
      if (requestVersion.current === version) requestActive.current = false;
    };
  }, [view, id, scope, revision]);

  const current = state.scope === scope ? state : initialCommunityLoadState(scope);
  return { ...current,
    reload: () => { if (!requestActive.current) setRevision(value => value + 1); },
    replace: data => {
      const next = { loading: false, refreshing: false, data, error: '', refreshError: '', scope };
      lastSuccess.current = { scope, at: Date.now() };
      stateRef.current = next;
      setState(next);
    } };
}

export function PostFieldError({ name, errors }) {
  return errors[name] ? <p id={`${name}-error`} role="alert" style={{ color: '#b91c1c', fontSize: 13, margin: '5px 0 0' }}>{errors[name]}</p> : null;
}
