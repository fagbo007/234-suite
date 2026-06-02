import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getCommands, subscribe } from './registry';
import { type Command } from './types';

/** Reactive view of the command registry. */
export function useCommands(): Command[] {
  return useSyncExternalStore(subscribe, getCommands, getCommands);
}

export interface UseCommandPalette {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Manages palette open state and the global Cmd+K (macOS) / Ctrl+K
 * (Windows, Linux) shortcut. Esc closes.
 */
export function useCommandPalette(): UseCommandPalette {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
