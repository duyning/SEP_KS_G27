import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { communityApi } from '../services/community.js';
import { appendFeedPosts, readFeedFilters, retryFeedRead } from '../services/community-feed.js';
import useCommunityLive from './useCommunityLive.js';

// Keep loaded posts and scroll positions for filter changes within the feed.
const snapshots = new Map();
const initial = scope => ({ scope, data: null, counts: null, loading: true, loadingMore: false,
  error: '', moreError: '', refreshing: false, refreshError: '', hasMore: false, nextCursor: null });

export default function useCommunityFeed(mine, params) {
  const { user } = useAuth();
  const filters = readFeedFilters(params);
  const scope = JSON.stringify([user?.userId ?? null, mine, filters]);
  const [state, setState] = useState(() => initial(scope));
  const [revision, setRevision] = useState(0);
  const stateRef = useRef(state);
  const currentScope = useRef(scope);
  const active = useRef(null);
  const refreshing = useRef(false);
  const previousScope = useRef(scope);
  const scrollPosition = useRef(window.scrollY);
  const leaving = useRef(false);
  const restoring = useRef(false);
  const liveAnchor = useRef(null);
  const pendingLive = useRef(false);
  stateRef.current = state;
  currentScope.current = scope;
  useLayoutEffect(() => {
    if (!liveAnchor.current) return;
    const { id, top } = liveAnchor.current;
    liveAnchor.current = null;
    const element = document.getElementById(id);
    if (element) window.scrollBy({ top: element.getBoundingClientRect().top - top, behavior: 'instant' });
  }, [state.data]);
  const refreshFromLive = async () => {
    snapshots.clear();
    const previous = stateRef.current;
    if (previous.scope !== scope || !previous.data) { pendingLive.current = true; return; }
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    // Reconnect/resync is a background read; keep the visible feed and its height stable.
    setState(current => ({ ...current, loadingMore: false }));
    try {
      const fetchPage=cursor=>retryFeedRead(()=>communityApi.feed({ ...filters, mine, cursor }, controller.signal),controller.signal);
      let result = await fetchPage(null);
      let items = result.items;
      // Rebuild the currently loaded window, preserving cursor correctness after insertions/deletions.
      while (result.hasMore && items.length < previous.data.length) {
        result = await fetchPage(result.nextCursor);
        items = appendFeedPosts(items, result.items);
      }
      if (controller.signal.aborted || currentScope.current !== scope) return;
      const anchor = [...document.querySelectorAll('.community-feed-card[id]')]
        .find(element => element.getBoundingClientRect().bottom > 120);
      if (anchor) liveAnchor.current = { id: anchor.id, top: anchor.getBoundingClientRect().top };
      const next = { ...initial(scope), loading: false, data: items, counts: result.counts,
        hasMore: result.hasMore, nextCursor: result.nextCursor };
      stateRef.current = next; setState(next);
    } catch (error) {
      if (!controller.signal.aborted && currentScope.current === scope) {
        setState(current => {
          const next = { ...current, refreshing: false, refreshError: error.message };
          stateRef.current = next;
          return next;
        });
      }
    } finally { if (active.current === controller) active.current = null; }
  };
  useCommunityLive('posts', refreshFromLive);
  useEffect(() => {
    if (pendingLive.current && !state.loading && state.data) {
      pendingLive.current = false;
      refreshFromLive();
    }
  }, [state.loading, state.data]);

  useEffect(() => {
    const remember = () => { if (!leaving.current) scrollPosition.current = window.scrollY; };
    const navigate = event => {
      const link = event.target.closest?.('a[href]');
      if (link && link.target !== '_blank' && new URL(link.href).pathname !== window.location.pathname) {
        scrollPosition.current = window.scrollY;
        leaving.current = true;
      }
    };
    window.addEventListener('scroll', remember, { passive: true });
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('scroll', remember);
      document.removeEventListener('click', navigate, true);
    };
  }, []);

  const load = useCallback(async (more = false) => {
    if (active.current) return;
    const previous = stateRef.current.scope === scope ? stateRef.current : initial(scope);
    if (more && (!previous.data || !previous.hasMore || previous.loadingMore)) return;
    const controller = new AbortController();
    active.current = controller;
    setState(current => ({ ...current, loading: !more, loadingMore: more, error: '', moreError: '' }));
    try {
      const result = await communityApi.feed({ ...filters, mine, cursor: more ? previous.nextCursor : null }, controller.signal);
      if (controller.signal.aborted || currentScope.current !== scope) return;
      const next = { ...initial(scope), loading: false,
        data: more ? appendFeedPosts(stateRef.current.data || [], result.items) : result.items,
        counts: result.counts, hasMore: result.hasMore, nextCursor: result.nextCursor };
      stateRef.current = next;
      setState(next);
    } catch (error) {
      if (!controller.signal.aborted && currentScope.current === scope) {
        const next = { ...(more ? stateRef.current : previous), loading: false, loadingMore: false,
          ...(more ? { moreError: error.message } : { error: error.message }) };
        stateRef.current = next;
        setState(next);
      }
    } finally {
      if (active.current === controller) active.current = null;
    }
  }, [scope]);

  useLayoutEffect(() => {
    const cached = refreshing.current ? null : snapshots.get(scope);
    refreshing.current = false;
    const next = cached ? { ...cached, loading: false, loadingMore: false, moreError: '' } : initial(scope);
    stateRef.current = next;
    setState(next);
    let frame;
    const scopeChanged = previousScope.current !== scope;
    restoring.current = Boolean(cached && scopeChanged);
    if (cached && scopeChanged) frame = requestAnimationFrame(() => {
      window.scrollTo({ top: cached.scrollY || 0, behavior: 'instant' });
      scrollPosition.current = window.scrollY;
      restoring.current = false;
    });
    else if (scopeChanged) frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    previousScope.current = scope;
    const timer = setTimeout(() => cached ? refreshFromLive() : load(), filters.q ? 250 : 0);
    return () => {
      if (timer != null) clearTimeout(timer);
      if (frame != null) cancelAnimationFrame(frame);
      active.current?.abort();
      active.current = null;
      const current = stateRef.current;
      if (!restoring.current && current.scope === scope && current.data) {
        snapshots.delete(scope);
        snapshots.set(scope, { ...current, scrollY: scrollPosition.current });
        if (snapshots.size > 4) snapshots.delete(snapshots.keys().next().value);
      }
    };
  }, [scope, revision, load]);

  const visible = state.scope === scope ? state : initial(scope);
  return { ...visible,
    loadMore: () => load(true),
    reload: () => {
      active.current?.abort();
      active.current = null;
      snapshots.delete(scope);
      refreshing.current = true;
      setRevision(value => value + 1);
    },
    remove: id => setState(current => {
      const removed = current.data?.find(post => post.id === id);
      if (!removed) return current;
      const next = { ...current, data: current.data.filter(post => post.id !== id),
        counts: { ...current.counts, ALL: Math.max(0, current.counts.ALL - 1),
          [removed.type]: Math.max(0, current.counts[removed.type] - 1) } };
      stateRef.current = next;
      return next;
    }),
  };
}
