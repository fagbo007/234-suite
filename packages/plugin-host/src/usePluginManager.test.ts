// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { type Plugin } from './host';
import { getDisabledIds, setPluginEnabled } from './toggles';
import { usePluginManager } from './usePluginManager';

const plug = (id: string, name: string): Plugin => ({ id, name, setup: () => {} });

afterEach(() => {
  for (const id of [...getDisabledIds()]) setPluginEnabled(id, true);
  localStorage.clear();
});

describe('usePluginManager', () => {
  it('lists plugins with enabled state and toggles them', () => {
    const plugins = [plug('a', 'Alpha'), plug('b', 'Beta')];
    const { result } = renderHook(() => usePluginManager(plugins));

    expect(result.current.items).toEqual([
      { id: 'a', name: 'Alpha', enabled: true },
      { id: 'b', name: 'Beta', enabled: true },
    ]);
    expect(result.current.enabledPlugins.map((p) => p.id)).toEqual(['a', 'b']);

    act(() => result.current.setEnabled('a', false));
    expect(result.current.items.find((i) => i.id === 'a')?.enabled).toBe(false);
    expect(result.current.enabledPlugins.map((p) => p.id)).toEqual(['b']);
  });

  it('keeps enabledPlugins referentially stable until a toggle', () => {
    const plugins = [plug('a', 'Alpha')];
    const { result, rerender } = renderHook(() => usePluginManager(plugins));
    const first = result.current.enabledPlugins;

    rerender();
    expect(result.current.enabledPlugins).toBe(first); // stable across a re-render

    act(() => result.current.setEnabled('a', false));
    expect(result.current.enabledPlugins).not.toBe(first); // changes on a toggle
  });
});
