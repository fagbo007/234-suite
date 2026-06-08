// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryNetwork } from './transport';
import { useCollabSession } from './useCollabSession';

describe('useCollabSession', () => {
  it('starts a host session with a code and a live doc', () => {
    const net = createMemoryNetwork();
    const { result } = renderHook(() =>
      useCollabSession({ transportFactory: () => net.transport() }),
    );
    expect(result.current.active).toBe(false);
    expect(result.current.doc).toBeNull();

    let code = '';
    act(() => {
      code = result.current.start();
    });
    expect(code).toMatch(/^234-/);
    expect(result.current.active).toBe(true);
    expect(result.current.role).toBe('host');
    expect(result.current.doc).not.toBeNull();
  });

  it('rejects an invalid join code and stays idle', () => {
    const net = createMemoryNetwork();
    const { result } = renderHook(() =>
      useCollabSession({ transportFactory: () => net.transport() }),
    );
    let error: string | null = null;
    act(() => {
      error = result.current.join('not-a-code');
    });
    expect(error).toMatch(/valid session code/i);
    expect(result.current.active).toBe(false);
  });

  it('leaves a session and clears the doc', () => {
    const net = createMemoryNetwork();
    const { result } = renderHook(() =>
      useCollabSession({ transportFactory: () => net.transport() }),
    );
    act(() => {
      result.current.start();
    });
    expect(result.current.doc).not.toBeNull();
    act(() => {
      result.current.leave();
    });
    expect(result.current.active).toBe(false);
    expect(result.current.doc).toBeNull();
  });
});
