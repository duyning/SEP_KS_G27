import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { LoadingManager } from '../components/loading/loading-manager.js';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [manager] = useState(() => new LoadingManager());
  const snapshot = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot
  );

  useEffect(() => () => manager.dispose(), [manager]);

  const value = useMemo(
    () => ({
      snapshot,
      startLoading: manager.start,
      stopLoading: manager.stop,
      updateLoadingMessage: manager.updateMessage,
      withLoading: manager.withLoading,
      clearAllLoading: manager.clearAll,
    }),
    [manager, snapshot]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading phải được sử dụng bên trong LoadingProvider.');
  }
  return ctx;
}
