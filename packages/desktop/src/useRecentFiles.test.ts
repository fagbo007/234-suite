// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { addRecent, clearRecent } from './recents';
import { useRecentFiles } from './useRecentFiles';

afterEach(() => {
  clearRecent('hooktest');
  localStorage.clear();
});

describe('useRecentFiles', () => {
  it('reflects the recent list and clears it', () => {
    const { result } = renderHook(() => useRecentFiles('hooktest'));
    expect(result.current.items).toEqual([]);

    act(() => addRecent('hooktest', { path: '/x/doc.fwtr', name: 'doc.fwtr' }));
    expect(result.current.items.map((i) => i.name)).toEqual(['doc.fwtr']);

    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
  });
});
