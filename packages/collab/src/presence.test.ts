// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CollabDoc } from './doc';
import { usePresence } from './presence';
import { createMemoryNetwork } from './transport';

describe('usePresence', () => {
  it('publishes identity and sees the other peer in the room', async () => {
    const net = createMemoryNetwork();
    const d1 = new CollabDoc();
    const d2 = new CollabDoc();
    net.transport().connect(d1, 'room');
    net.transport().connect(d2, 'room');

    const ada = { name: 'Ada', color: '#1971c2' };
    const linus = { name: 'Linus', color: '#2f9e44' };
    const h1 = renderHook(() => usePresence(d1, ada));
    const h2 = renderHook(() => usePresence(d2, linus));

    await waitFor(() => {
      expect(h1.result.current.map((p) => p.user.name)).toContain('Linus');
      expect(h2.result.current.map((p) => p.user.name)).toContain('Ada');
    });
    expect(h1.result.current[0]?.user.color).toBe('#2f9e44');

    h2.unmount();
    await waitFor(() => expect(h1.result.current).toHaveLength(0));
  });

  it('returns no peers without a session (null doc)', () => {
    const { result } = renderHook(() => usePresence(null, { name: 'Solo', color: '#e8590c' }));
    expect(result.current).toEqual([]);
  });

  it('publishes each peer location and propagates changes', async () => {
    const net = createMemoryNetwork();
    const d1 = new CollabDoc();
    const d2 = new CollabDoc();
    net.transport().connect(d1, 'room');
    net.transport().connect(d2, 'room');

    const ada = { name: 'Ada', color: '#1971c2' };
    const linus = { name: 'Linus', color: '#2f9e44' };
    const h1 = renderHook(({ loc }) => usePresence(d1, ada, loc), {
      initialProps: { loc: { cell: { row: 0, col: 0 } } },
    });
    renderHook(() => usePresence(d2, linus, { slide: 3 }));

    // d1 sees Linus's slide location; d2's view of Ada is the cell location.
    await waitFor(() => {
      const linusPeer = h1.result.current.find((p) => p.user.name === 'Linus');
      expect(linusPeer?.location?.slide).toBe(3);
    });

    // Moving d1's selection propagates to the room.
    h1.rerender({ loc: { cell: { row: 5, col: 2 } } });
    const h3 = renderHook(() => usePresence(d2, linus, { slide: 3 }));
    await waitFor(() => {
      const adaPeer = h3.result.current.find((p) => p.user.name === 'Ada');
      expect(adaPeer?.location?.cell).toEqual({ row: 5, col: 2 });
    });
  });
});
