import { describe, expect, it } from 'vitest';
import { CollabDoc } from './doc';
import { createMemoryNetwork } from './transport';

function joinPair(room = 'room') {
  const net = createMemoryNetwork();
  const a = new CollabDoc();
  const b = new CollabDoc();
  const ta = net.transport();
  const tb = net.transport();
  ta.connect(a, room);
  tb.connect(b, room);
  return { a, b, ta, tb };
}

describe('createMemoryNetwork', () => {
  it('reports connection status', () => {
    const net = createMemoryNetwork();
    const t = net.transport();
    expect(t.status).toBe('disconnected');
    t.connect(new CollabDoc(), 'r');
    expect(t.status).toBe('connected');
    t.disconnect();
    expect(t.status).toBe('disconnected');
  });

  it('converges a Y.Map between peers (Sheet mapping)', () => {
    const { a, b } = joinPair();
    a.map<string>('cells').set('0,0', 'hello');
    expect(b.map<string>('cells').get('0,0')).toBe('hello');
    b.map<string>('cells').set('0,1', 'world');
    expect(a.map<string>('cells').get('0,1')).toBe('world');
  });

  it('converges a Y.Array between peers (Slides mapping)', () => {
    const { a, b } = joinPair();
    a.array<string>('slides').push(['intro', 'agenda']);
    expect(b.array<string>('slides').toArray()).toEqual(['intro', 'agenda']);
  });

  it('converges a Y.Text between peers (Writer mapping)', () => {
    const { a, b } = joinPair();
    a.text('body').insert(0, 'hi');
    expect(b.text('body').toString()).toBe('hi');
  });

  it('reconciles an edit made while a peer is disconnected', () => {
    const { a, b, tb } = joinPair();
    a.text('body').insert(0, 'hi');
    expect(b.text('body').toString()).toBe('hi');

    tb.disconnect();
    a.text('body').insert(2, '!'); // b is offline — should not receive live
    expect(b.text('body').toString()).toBe('hi');

    tb.connect(b, 'room'); // reconnect → initial state sync catches b up
    expect(b.text('body').toString()).toBe('hi!');
  });

  it('propagates presence (awareness) between peers', () => {
    const { a, b } = joinPair();
    a.awareness.setLocalState({ name: 'Ada' });
    const names = [...b.awareness.getStates().values()].map((s) => (s as { name?: string }).name);
    expect(names).toContain('Ada');
  });

  it('does not leak updates across different rooms', () => {
    const net = createMemoryNetwork();
    const a = new CollabDoc();
    const b = new CollabDoc();
    net.transport().connect(a, 'room-a');
    net.transport().connect(b, 'room-b');
    a.map<string>('cells').set('0,0', 'secret');
    expect(b.map<string>('cells').get('0,0')).toBeUndefined();
  });
});
