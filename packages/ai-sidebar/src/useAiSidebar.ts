import { useCallback, useState } from 'react';

export interface UseAiSidebar {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const keyFor = (app: string) => `234:ai-sidebar:${app}`;

function readInitial(app: string): boolean {
  try {
    return globalThis.localStorage?.getItem(keyFor(app)) === 'open';
  } catch {
    return false;
  }
}

function persist(app: string, isOpen: boolean): void {
  try {
    globalThis.localStorage?.setItem(keyFor(app), isOpen ? 'open' : 'closed');
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/**
 * Open/closed state for the AI sidebar, remembered per app (root §6: the user
 * invokes it — it never opens itself, so the default is closed). Persisted in
 * localStorage; guarded where storage is unavailable.
 */
export function useAiSidebar(app: string): UseAiSidebar {
  const [isOpen, setIsOpen] = useState<boolean>(() => readInitial(app));

  const set = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      persist(app, next);
    },
    [app],
  );

  const open = useCallback(() => set(true), [set]);
  const close = useCallback(() => set(false), [set]);
  const toggle = useCallback(() => set(!isOpen), [set, isOpen]);

  return { isOpen, open, close, toggle };
}
