import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAiSettings } from './useAiSettings';

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
      first.result.current.setSettings({
        provider: 'ollama',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaModel: 'llama3',
      });
    });
    expect(first.result.current.provider.id).toBe('ollama');

    const second = renderHook(() => useAiSettings());
    expect(second.result.current.settings.provider).toBe('ollama');
  });
});
