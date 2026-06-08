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
});
