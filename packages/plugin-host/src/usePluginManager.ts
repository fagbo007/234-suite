/**
 * React binding for the plugin enable/disable toggles. Subscribes to the toggle
 * store and returns the plugin list with current enabled state, a setter, and the
 * stable `enabledPlugins` array to feed `loadPlugins`. React is an **optional**
 * peer dependency (this hook is the only React surface — the rest of the package
 * is pure, node-tested).
 */
import { useMemo, useSyncExternalStore } from 'react';
import { type Plugin } from './host';
import { getDisabledIds, setPluginEnabled, subscribePlugins } from './toggles';

export interface PluginManagerItem {
  id: string;
  name: string;
  enabled: boolean;
}

export interface PluginManager {
  items: PluginManagerItem[];
  setEnabled: (id: string, enabled: boolean) => void;
  /** The enabled subset — a stable reference until a toggle (or the list) changes. */
  enabledPlugins: Plugin[];
}

export function usePluginManager(allPlugins: Plugin[]): PluginManager {
  // `disabled` is the disabled-id snapshot (stable reference between toggles), so
  // the memos recompute only when the disabled set or the plugin list changes.
  const disabled = useSyncExternalStore(subscribePlugins, getDisabledIds, getDisabledIds);

  const items = useMemo(
    () => allPlugins.map((p) => ({ id: p.id, name: p.name, enabled: !disabled.includes(p.id) })),
    [allPlugins, disabled],
  );
  const enabled = useMemo(
    () => allPlugins.filter((p) => !disabled.includes(p.id)),
    [allPlugins, disabled],
  );

  return { items, setEnabled: setPluginEnabled, enabledPlugins: enabled };
}
