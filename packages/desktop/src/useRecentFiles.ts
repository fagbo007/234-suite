/**
 * React binding for the recent-files store. Subscribes to the store and returns
 * the current app's entries + a clear action. React is an **optional** peer
 * dependency (this hook is the only React surface in `@234/desktop`).
 */
import { useSyncExternalStore } from 'react';
import { clearRecent, getRecent, type RecentFile, subscribeRecent } from './recents';

export interface UseRecentFiles {
  items: RecentFile[];
  clear: () => void;
}

export function useRecentFiles(app: string): UseRecentFiles {
  const items = useSyncExternalStore(
    subscribeRecent,
    () => getRecent(app),
    () => getRecent(app),
  );
  return { items, clear: () => clearRecent(app) };
}
