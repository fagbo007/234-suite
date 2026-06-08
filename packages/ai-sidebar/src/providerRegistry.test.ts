import { afterEach, describe, expect, it, vi } from 'vitest';
import { type AiProvider } from './provider';
import { getProviders, registerProvider, subscribeProviders } from './providerRegistry';

const sample: AiProvider = {
  id: 'sample-echo',
  label: 'Sample echo (plugin)',
  offline: true,
  complete: ({ prompt }) => Promise.resolve(`echo ${prompt}`),
};

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('providerRegistry', () => {
  it('registers a provider, exposes it, and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProviders(listener);
    cleanups.push(unsubscribe);

    expect(getProviders().some((p) => p.id === 'sample-echo')).toBe(false);
    cleanups.push(registerProvider(sample));

    expect(listener).toHaveBeenCalled();
    expect(getProviders().find((p) => p.id === 'sample-echo')?.label).toBe('Sample echo (plugin)');
  });

  it('unregister removes the provider and is idempotent', () => {
    const off = registerProvider(sample);
    expect(getProviders().some((p) => p.id === 'sample-echo')).toBe(true);
    off();
    off(); // no throw, no double-emit
    expect(getProviders().some((p) => p.id === 'sample-echo')).toBe(false);
  });
});
