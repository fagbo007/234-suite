import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_AI_SETTINGS, useAiSettings } from './useAiSettings';

beforeEach(() => {
  globalThis.localStorage?.clear();
});

describe('useAiSettings', () => {
  it('defaults to the offline mock provider', () => {
    const { result } = renderHook(() => useAiSettings());
    expect(result.current.settings.provider).toBe('mock');
    expect(result.current.provider.id).toBe('mock');
  });

  it('switches to Ollama and persists the choice', () => {
    const first = renderHook(() => useAiSettings());
    act(() => {
      first.result.current.setSettings({ ...DEFAULT_AI_SETTINGS, provider: 'ollama' });
    });
    expect(first.result.current.provider.id).toBe('ollama');

    const second = renderHook(() => useAiSettings());
    expect(second.result.current.settings.provider).toBe('ollama');
  });

  it('uses a non-offline cloud provider for Claude / OpenAI', () => {
    const { result } = renderHook(() => useAiSettings());
    act(() => result.current.setSettings({ ...DEFAULT_AI_SETTINGS, provider: 'claude' }));
    expect(result.current.provider.id).toBe('claude');
    expect(result.current.provider.offline).toBe(false);

    act(() => result.current.setSettings({ ...DEFAULT_AI_SETTINGS, provider: 'openai' }));
    expect(result.current.provider.id).toBe('openai');
    expect(result.current.provider.offline).toBe(false);
  });
});
