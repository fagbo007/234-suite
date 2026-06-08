import { CollabDoc, createMemoryNetwork } from '@234/collab';
import { describe, expect, it } from 'vitest';
import { type Style } from '../editor/styles';
import { bindStyles } from './bindStyles';

function style(id: string, name: string): Style {
  return { id, name, properties: { fontSize: '14px', fontWeight: 400 } };
}

describe('bindStyles', () => {
  it('propagates a style add and a property edit to the peer', () => {
    const net = createMemoryNetwork();
    const d1 = new CollabDoc();
    const d2 = new CollabDoc();
    const b1 = bindStyles(d1, () => {});
    let remote: Style[] = [];
    bindStyles(d2, (registry) => {
      remote = registry;
    });
    net.transport().connect(d1, 'r');
    net.transport().connect(d2, 'r');

    b1.pushStyles([style('h1', 'Heading')]);
    expect(remote.map((s) => s.id)).toContain('h1');

    b1.pushStyles([{ ...style('h1', 'Heading'), properties: { fontSize: '32px' } }]);
    expect(remote.find((s) => s.id === 'h1')?.properties.fontSize).toBe('32px');

    b1.pushStyles([]); // delete
    expect(remote).toEqual([]);
  });

  it('seeds a fresh guest from the host registry', () => {
    const net = createMemoryNetwork();
    const hostDoc = new CollabDoc();
    const host = bindStyles(hostDoc, () => {});
    net.transport().connect(hostDoc, 'room');
    host.seed([style('body', 'Body'), style('title', 'Title')]);

    const guestDoc = new CollabDoc();
    let guest: Style[] = [];
    bindStyles(guestDoc, (registry) => {
      guest = registry;
    });
    net.transport().connect(guestDoc, 'room');

    expect(guest.map((s) => s.id).sort()).toEqual(['body', 'title']);
  });
});
