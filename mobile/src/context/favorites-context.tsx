import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { FavoritesStore } from '@/services/favorites-store';

const FavoritesContext = createContext<FavoritesStore | null>(null);
export function FavoritesProvider({ children }: PropsWithChildren) {
  const { user, retry } = useAuth();
  const accountKey = `${user?.userId || 'guest'}:${user?.role || ''}`;
  const enabled = Boolean(user && ['USER', 'ROOM_HOST'].includes(user.role));
  const onUnauthorized = useCallback(() => { void retry(); }, [retry]);
  const store = useMemo(() => new FavoritesStore(enabled, undefined, undefined, onUnauthorized, accountKey), [enabled, onUnauthorized, accountKey]);
  useEffect(() => { store.start(); return store.stop; }, [store]);
  // Change only the context store, never remount the navigator on auth changes.
  return <FavoritesContext.Provider value={store}>{children}</FavoritesContext.Provider>;
}
export function useFavorites() {
  const store = useContext(FavoritesContext);
  if (!store) throw new Error('FavoritesProvider chưa được khởi tạo.');
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...snapshot, store };
}
