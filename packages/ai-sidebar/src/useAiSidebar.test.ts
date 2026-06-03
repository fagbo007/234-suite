import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAiSidebar } from './useAiSidebar';

beforeEach(() => {
  globalThis.localStorage?.clear();
});

describe('useAiSidebar', () => {
  it('defaults to closed (the user invokes it — it never opens itself)', () => {
    const { result } = renderHook(() => useAiSidebar('writer'));
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles open and closed', () => {
    const { result } = renderHook(() => useAiSidebar('writer'));
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('persists the open state per app', () => {
    const first = renderHook(() => useAiSidebar('sheet'));
    act(() => first.result.current.open());
    expect(localStorage.getItem('234:ai-sidebar:sheet')).toBe('open');

    // A fresh mount for the same app restores the persisted state.
    const second = renderHook(() => useAiSidebar('sheet'));
    expect(second.result.current.isOpen).toBe(true);
  });
});
