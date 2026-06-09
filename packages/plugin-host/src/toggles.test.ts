// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Plugin } from './host';
import {
  enabledPlugins,
  getDisabledIds,
  isPluginEnabled,
  setPluginEnabled,
  subscribePlugins,
} from './toggles';

const plug = (id: string): Plugin => ({ id, name: id, setup: () => {} });

afterEach(() => {
  // Re-enable anything toggled so the module singleton doesn't leak across tests.
  for (const id of [...getDisabledIds()]) setPluginEnabled(id, true);
  localStorage.clear();
});

describe('plugin toggles', () => {
  it('defaults to enabled and disables / re-enables with persistence', () => {
    expect(isPluginEnabled('p1')).toBe(true);

    setPluginEnabled('p1', false);
    expect(isPluginEnabled('p1')).toBe(false);
    expect(getDisabledIds()).toContain('p1');
    expect(localStorage.getItem('234:plugins:disabled')).toContain('p1');

    setPluginEnabled('p1', true);
    expect(isPluginEnabled('p1')).toBe(true);
    expect(getDisabledIds()).not.toContain('p1');
  });

  it('notifies subscribers and filters enabledPlugins', () => {
    const listener = vi.fn();
    const off = subscribePlugins(listener);
    const plugins = [plug('a'), plug('b')];

    setPluginEnabled('b', false);
    expect(listener).toHaveBeenCalled();
    expect(enabledPlugins(plugins).map((p) => p.id)).toEqual(['a']);
    off();
  });

  it('returns a stable snapshot reference between changes', () => {
    const s1 = getDisabledIds();
    expect(getDisabledIds()).toBe(s1); // unchanged → same reference
    setPluginEnabled('x', false);
    expect(getDisabledIds()).not.toBe(s1); // a change yields a fresh snapshot
  });
});
