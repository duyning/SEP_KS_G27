import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { communityApi } from '../services/community.js';

export function useCommunityLoad(view, id) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: '', scope: '' });
  const scope = `${view}:${id ?? ''}:${user?.userId ?? ''}`;
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '', scope });
    communityApi[view](controller.signal, id)
      .then(data => { if (!controller.signal.aborted) setState({ loading: false, data, error: '', scope }); })
      .catch(error => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message, scope }); });
    return () => controller.abort();
  }, [view, id, scope, revision]);
  return { ...(state.scope === scope ? state : { loading: true, data: null, error: '' }),
    reload: () => setRevision(value => value + 1),
    replace: data => setState({ loading: false, data, error: '', scope }) };
}

export function PostFieldError({ name, errors }) {
  return errors[name] ? <p id={`${name}-error`} role="alert" style={{ color: '#b91c1c', fontSize: 13, margin: '5px 0 0' }}>{errors[name]}</p> : null;
}
