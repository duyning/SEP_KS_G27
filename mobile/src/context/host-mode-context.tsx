import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
const Context = createContext<{ isHostMode: boolean; setDiscovery(value: boolean): void } | null>(null);
export function HostModeProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [discoveryFor, setDiscoveryFor] = useState<number | null>(null);
  return <Context.Provider value={{ isHostMode: user?.role === 'ROOM_HOST' && discoveryFor !== user.userId, setDiscovery: value => setDiscoveryFor(value ? user?.userId ?? null : null) }}>{children}</Context.Provider>;
}
export function useHostMode() { const value = useContext(Context); if (!value) throw new Error('HostModeProvider missing'); return value; }
