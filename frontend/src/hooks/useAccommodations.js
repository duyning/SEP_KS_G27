import { useEffect, useState } from 'react';
import { accommodationApi } from '../services/accommodations.js';

export default function useAccommodations(query) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ query, data: null, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ query, data: null, loading: true, error: '' });
    const timer = setTimeout(() => {
      accommodationApi.list(query, controller.signal).then(data => {
        if (!controller.signal.aborted) setState({ query, data, loading: false, error: '' });
      }).catch(error => {
        if (!controller.signal.aborted) setState({ query, data: null, loading: false, error: error.message });
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, revision]);
  return { ...(state.query === query ? state : { data: null, loading: true, error: '' }), retry: () => setRevision(value => value + 1) };
}
