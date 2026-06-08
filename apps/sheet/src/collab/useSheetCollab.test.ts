import { createMemoryNetwork } from '@234/collab';
import { SheetEngine } from '@234/formula-engine';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSheetCollab } from './useSheetCollab';

let engine: SheetEngine | null = null;
afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('useSheetCollab', () => {
  it('starts a host session and exposes a shareable code', () => {
    engine = new SheetEngine();
    const net = createMemoryNetwork();
    const { result } = renderHook(() =>
      useSheetCollab(engine as SheetEngine, () => {}, {
        columnTypes: {},
        onRemoteColumnType: () => {},
        transportFactory: () => net.transport(),
      }),
    );

    expect(result.current.active).toBe(false);
    let code = '';
    act(() => {
      code = result.current.start();
    });
    expect(code).toMatch(/^234-/);
    expect(result.current.active).toBe(true);
    expect(result.current.role).toBe('host');
    expect(result.current.code).toBe(code);
  });

  it('routes setCell through the shared doc when active', () => {
    engine = new SheetEngine();
    const net = createMemoryNetwork();
    const { result } = renderHook(() =>
      useSheetCollab(engine as SheetEngine, () => {}, {
        columnTypes: {},
        onRemoteColumnType: () => {},
        transportFactory: () => net.transport(),
      }),
    );
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.setCell(0, 0, '7');
    });
    expect((engine as SheetEngine).getValue(0, 0)).toBe(7);
  });

  it('rejects an invalid join code and stays idle', () => {
    engine = new SheetEngine();
    const net = createMemoryNetwork();
    const { result } = renderHook(() =>
      useSheetCollab(engine as SheetEngine, () => {}, {
        columnTypes: {},
        onRemoteColumnType: () => {},
        transportFactory: () => net.transport(),
      }),
    );
    let error: string | null = null;
    act(() => {
      error = result.current.join('not-a-code');
    });
    expect(error).toMatch(/valid session code/i);
    expect(result.current.active).toBe(false);
  });

  it('leaves a session and returns to idle', () => {
    engine = new SheetEngine();
    const net = createMemoryNetwork();
    const { result } = renderHook(() =>
      useSheetCollab(engine as SheetEngine, () => {}, {
        columnTypes: {},
        onRemoteColumnType: () => {},
        transportFactory: () => net.transport(),
      }),
    );
    act(() => {
      result.current.start();
    });
    expect(result.current.active).toBe(true);
    act(() => {
      result.current.leave();
    });
    expect(result.current.active).toBe(false);
    expect(result.current.code).toBeNull();
  });
});
