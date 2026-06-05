import { CollabDoc, createMemoryNetwork } from '@234/collab';
import { SheetEngine } from '@234/formula-engine';
import { describe, expect, it } from 'vitest';
import { bindSheet } from './bindSheet';

/** Two engines bound to two docs in one in-memory room (deterministic, no network). */
function peerPair() {
  const net = createMemoryNetwork();
  const e1 = new SheetEngine();
  const e2 = new SheetEngine();
  const d1 = new CollabDoc();
  const d2 = new CollabDoc();
  const b1 = bindSheet(e1, d1);
  const b2 = bindSheet(e2, d2);
  net.transport().connect(d1, 'sheet');
  net.transport().connect(d2, 'sheet');
  return { e1, e2, b1, b2 };
}

describe('bindSheet', () => {
  it('propagates a value edit to the peer engine', () => {
    const { e2, b1 } = peerPair();
    b1.setCell(0, 0, '42');
    expect(e2.getRaw(0, 0)).toBe('42');
    expect(e2.getValue(0, 0)).toBe(42);
  });

  it('propagates a formula as raw text, evaluated locally on the peer', () => {
    const { e1, e2, b1 } = peerPair();
    b1.setCell(0, 0, '10');
    b1.setCell(1, 0, '20');
    b1.setCell(2, 0, '=SUM(A1:A2)');
    expect(e2.getRaw(2, 0)).toBe('=SUM(A1:A2)');
    expect(e2.getValue(2, 0)).toBe(30);
    expect(e1.getValue(2, 0)).toBe(30);
  });

  it('syncs edits in both directions', () => {
    const { e1, b2 } = peerPair();
    b2.setCell(5, 5, 'hello');
    expect(e1.getRaw(5, 5)).toBe('hello');
  });

  it('clears a cell on the peer when emptied', () => {
    const { e2, b1 } = peerPair();
    b1.setCell(0, 0, 'x');
    expect(e2.getRaw(0, 0)).toBe('x');
    b1.setCell(0, 0, '');
    expect(e2.getRaw(0, 0)).toBe('');
  });

  it('seeds a fresh guest from a pre-populated host', () => {
    const net = createMemoryNetwork();
    const host = new SheetEngine();
    host.setCell(0, 0, '1');
    host.setCell(0, 1, '2');
    const hostDoc = new CollabDoc();
    const hostBinding = bindSheet(host, hostDoc);
    net.transport().connect(hostDoc, 'room');
    hostBinding.seedFromEngine();

    const guest = new SheetEngine();
    const guestDoc = new CollabDoc();
    bindSheet(guest, guestDoc);
    net.transport().connect(guestDoc, 'room'); // initial sync delivers the seeded cells

    expect(guest.getRaw(0, 0)).toBe('1');
    expect(guest.getRaw(0, 1)).toBe('2');
  });

  it('stops applying remote changes after destroy', () => {
    const { e2, b1, b2 } = peerPair();
    b2.destroy(); // e2's observer is removed
    b1.setCell(0, 0, 'x'); // reaches doc 2 over the network, but e2 no longer observes
    expect(e2.getRaw(0, 0)).toBe('');
  });
});
