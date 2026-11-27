import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useViewingData } from '../components/ViewingUI.jsx';
import { canRequestViewing } from '../services/viewings.js';
import { fetchProfileViewings, upcomingViewings, viewingInstant } from '../services/profile-viewings.js';

export function useUpcomingViewings() {
  const { user } = useAuth();
  const allowed = canRequestViewing(user);
  const load = useCallback(signal => allowed ? fetchProfileViewings(signal) : Promise.resolve([]), [allowed]);
  const { data, error, reload } = useViewingData(load, `profile-upcoming:${user?.userId}:${allowed}`);
  const [tick, setTick] = useState(0);
  const now = Date.now();
  const items = data === undefined ? undefined : upcomingViewings(data, now);
  useEffect(() => {
    // Remove a card at its appointment time, even if no SSE event arrives.
    const next = upcomingViewings(data || [])[0];
    const delay = next ? Math.min(30_000, Math.max(1, viewingInstant(next.scheduledDate) - Date.now() + 1)) : 30_000;
    const timer = setTimeout(() => setTick(value => value + 1), delay);
    return () => clearTimeout(timer);
  }, [data, tick]);
  return { items, error, reload };
}
