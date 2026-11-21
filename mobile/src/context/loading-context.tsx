import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import {
  LoadingManager,
  type LoadingSnapshot,
  type StartLoadingOptions,
} from '@/services/loading-manager';

export interface LoadingContextValue {
  snapshot: LoadingSnapshot;
  startLoading: (options?: StartLoadingOptions) => string;
  stopLoading: (id: string) => void;
  updateLoadingMessage: (id: string, message: string) => void;
  withLoading: <T>(
    task: (updateMessage: (next: string) => void) => Promise<T>,
    options?: StartLoadingOptions
  ) => Promise<T>;
  clearAllLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: PropsWithChildren) {
  const [manager] = useState(() => new LoadingManager());
  const snapshot = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot
  );

  useEffect(() => {
    return () => {
      manager.dispose();
    };
  }, [manager]);

  const value = useMemo<LoadingContextValue>(
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

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading phải được sử dụng bên trong LoadingProvider.');
  }
  return ctx;
}
