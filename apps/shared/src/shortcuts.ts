import { useEffect, useRef } from 'react';

/**
 * MS Office keyboard-shortcut compatibility layer (root CLAUDE.md §9). One
 * shared source of truth for the standard bindings, cross-platform (Cmd on
 * macOS, Ctrl elsewhere). The Writer editor keymap and app-level handlers both
 * read from OFFICE_SHORTCUTS so a shortcut is defined once.
 */

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const source = navigator.platform || navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(source);
}

/** The platform's primary modifier key name. */
export const MOD: 'Meta' | 'Control' = detectMac() ? 'Meta' : 'Control';

export interface ParsedShortcut {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

/** Parse `'Mod+Shift+Z'` → `{ mod, shift, alt, key }` (key lower-cased). */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.split('+').map((part) => part.trim());
  const parsed: ParsedShortcut = { mod: false, shift: false, alt: false, key: '' };
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'mod') parsed.mod = true;
    else if (lower === 'shift') parsed.shift = true;
    else if (lower === 'alt' || lower === 'option') parsed.alt = true;
    else parsed.key = lower;
  }
  return parsed;
}

interface KeyboardEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * True when the event matches the shortcut. `isMac` defaults to the detected
 * platform but is overridable for deterministic tests. On macOS "Mod" means the
 * Cmd (meta) key; elsewhere it means Ctrl.
 */
export function matchShortcut(
  event: KeyboardEventLike,
  shortcut: string,
  isMac: boolean = MOD === 'Meta',
): boolean {
  const { mod, shift, alt, key } = parseShortcut(shortcut);
  const modActive = isMac ? event.metaKey : event.ctrlKey;
  // The non-Mod modifier must NOT be used as a stand-in (avoids Ctrl matching a
  // Cmd shortcut on macOS and vice versa).
  const otherModActive = isMac ? event.ctrlKey : event.metaKey;
  if (mod && (!modActive || otherModActive)) return false;
  if (!mod && (modActive || otherModActive)) return false;
  if (event.shiftKey !== shift) return false;
  if (event.altKey !== alt) return false;
  return event.key.toLowerCase() === key;
}

/** Convert a catalog binding (`'Mod+B'`) to ProseMirror keymap syntax (`'Mod-b'`). */
export function toProseMirrorKey(shortcut: string): string {
  const { mod, shift, alt, key } = parseShortcut(shortcut);
  const parts: string[] = [];
  if (mod) parts.push('Mod');
  if (shift) parts.push('Shift');
  if (alt) parts.push('Alt');
  parts.push(key.length === 1 ? key : key.charAt(0).toUpperCase() + key.slice(1));
  return parts.join('-');
}

/**
 * The standard MS Office binding catalog. Apps adopt the bindings for actions
 * they actually support; bindings for features that don't exist yet (Save/Open/
 * Print — file I/O) are listed for consistency but only wired once real.
 */
export const OFFICE_SHORTCUTS = {
  bold: 'Mod+B',
  italic: 'Mod+I',
  underline: 'Mod+U',
  find: 'Mod+F',
  undo: 'Mod+Z',
  redo: 'Mod+Y',
  redoAlt: 'Mod+Shift+Z',
  save: 'Mod+S',
  selectAll: 'Mod+A',
  print: 'Mod+P',
  newDocument: 'Mod+N',
  open: 'Mod+O',
  commandPalette: 'Mod+K',
} as const;

export type ShortcutBindings = Record<string, (event: KeyboardEvent) => void>;

/**
 * Attach a window keydown listener that dispatches MS-Office-style shortcuts to
 * their handlers. Latest bindings are read via a ref so changing handlers does
 * not re-bind the listener. preventDefault is called on a match.
 */
export function useShortcuts(bindings: ShortcutBindings, options: { enabled?: boolean } = {}): void {
  const { enabled = true } = options;
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      for (const [shortcut, handler] of Object.entries(bindingsRef.current)) {
        if (matchShortcut(event, shortcut)) {
          event.preventDefault();
          handler(event);
          return;
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
