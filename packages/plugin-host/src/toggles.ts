/**
 * Per-plugin enable/disable state (root §9; docs/architecture/plugin-api.md). A
 * persisted set of **disabled** plugin ids — default is empty, so every in-tree
 * plugin is enabled until the user turns it off. Mirrors the command/provider
 * registry pattern (cached snapshot + subscribe) so it is `useSyncExternalStore`-
 * friendly. Persisted to `localStorage` (guarded — a no-op without it, e.g. SSR
 * or a non-browser test).
 */
import { type Plugin } from './host';

const KEY = '234:plugins:disabled';
const listeners = new Set<() => void>();

function read(): Set<string> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) ? new Set(ids.filter((v): v is string => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

const disabled: Set<string> = read();
// Cached snapshot so useSyncExternalStore sees a stable reference between changes.
let snapshot: string[] = [...disabled];

function persist(): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify([...disabled]));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function emit(): void {
  snapshot = [...disabled];
  for (const listener of listeners) listener();
}

/** Whether a plugin id is currently enabled (default true). */
export function isPluginEnabled(id: string): boolean {
  return !disabled.has(id);
}

/** Enable or disable a plugin id; persists + notifies subscribers. */
export function setPluginEnabled(id: string, enabled: boolean): void {
  if (enabled) {
    if (!disabled.delete(id)) return;
  } else {
    if (disabled.has(id)) return;
    disabled.add(id);
  }
  persist();
  emit();
}

/** The disabled ids (stable snapshot — for useSyncExternalStore). */
export function getDisabledIds(): string[] {
  return snapshot;
}

export function subscribePlugins(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Filter a plugin list to the currently-enabled ones. */
export function enabledPlugins(plugins: Plugin[]): Plugin[] {
  return plugins.filter((p) => isPluginEnabled(p.id));
}
