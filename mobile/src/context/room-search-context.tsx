import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { defaultFilters, normalizeFilters } from '@/services/room-search';
import type { SearchFilters } from '@/services/accommodations';
function useSearchState() {
  const [query, setQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filters, setApplied] = useState<SearchFilters>(defaultFilters);
  useEffect(() => { const timer = setTimeout(() => setKeyword(query.trim()), 350); return () => clearTimeout(timer); }, [query]);
  const setFilters = (next: SearchFilters | ((previous: SearchFilters) => SearchFilters)) => setApplied(previous => normalizeFilters(typeof next === 'function' ? next(previous) : next));
  return { query, setQuery, keyword, filters, setFilters, submit: () => setKeyword(query.trim()), searching: query.trim() !== keyword, reset: () => { setQuery(''); setKeyword(''); setApplied(defaultFilters()); } };
}
const Context = createContext<ReturnType<typeof useSearchState> | null>(null);
export function RoomSearchProvider({ children }: PropsWithChildren) { return <Context.Provider value={useSearchState()}>{children}</Context.Provider>; }
export function useRoomSearch() { const value = useContext(Context); if (!value) throw new Error('RoomSearchProvider missing'); return value; }
