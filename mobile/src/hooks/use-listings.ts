import { searchKey } from '@/services/room-search';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccommodationSummary, fetchAccommodations, SearchFilters } from '@/services/accommodations';

export function useListings(filters: SearchFilters) {
  const [items, setItems] = useState<AccommodationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const paging = useRef({ page: -1, pages: 0 });
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const ready = useRef(false);
  const key = searchKey(filters);
  const currentKey = useRef(key); useLayoutEffect(() => { currentKey.current = key; }, [key]);
  const loadedKey = useRef('');
  const effectKey = useRef('');
  const generation = useRef(0);

  const load = useCallback(async (page: number, append: boolean, controller: AbortController, version: number, preserve = false) => {
    busy.current = true;
    if (append) { setLoadingMore(true); setMoreError(null); }
    else { setLoading(true); if (!preserve) { setItems([]); setTotal(0); } setError(null); setMoreError(null); setLoadingMore(false); }
    try {
      const data = await fetchAccommodations({ ...JSON.parse(key), page, size: 15 }, controller.signal);
      if (controller.signal.aborted || version !== generation.current || currentKey.current !== key) return;
      paging.current = { page: data.page, pages: data.totalPages }; setHasMore(data.page + 1 < data.totalPages);
      setItems(previous => {
        const merged = append ? [...previous, ...data.items] : data.items;
        return [...new Map(merged.map(item => [item.roomTypeId, item])).values()];
      });
      setTotal(data.totalElements);
      setError(null);
      setMoreError(null);
      ready.current = true; loadedKey.current = key;
    } catch (err) {
      if (controller.signal.aborted || version !== generation.current || currentKey.current !== key) return;
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách phòng.';
      if (append) setMoreError(message); else setError(message);
    } finally {
      if (version === generation.current && !controller.signal.aborted) {
        busy.current = false; setLoading(false); setRefreshing(false); setLoadingMore(false);
      }
    }
  }, [key]);

  useEffect(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++generation.current;
    ready.current = false;
    const preserve = effectKey.current === key; effectKey.current = key;
    void load(0, false, controller, version, preserve);
    return () => { controller.abort(); request.current?.abort(); };
  }, [load, revision, key]);

  const refresh = () => { if (busy.current) return; busy.current = true; setRefreshing(true); setRevision(value => value + 1); };
  const loadMore = () => {
    if (currentKey.current !== loadedKey.current || busy.current || !ready.current || paging.current.page + 1 >= paging.current.pages) return;
    const controller = new AbortController(); request.current = controller;
    void load(paging.current.page + 1, true, controller, generation.current);
  };
  return { items, total, loading, refreshing, loadingMore, error, moreError, hasMore, refresh, loadMore, retry: () => setRevision(value => value + 1) };
}


