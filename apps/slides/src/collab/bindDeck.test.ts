import { CollabDoc, createMemoryNetwork } from '@234/collab';
import { describe, expect, it } from 'vitest';
import { addObject, addSlide, deleteSlide, reorderSlide, setSlideNotes } from '../model/deck';
import { type Deck, type SlideObject } from '../model/types';
import { bindDeck } from './bindDeck';

function text(id: string): SlideObject {
  return { id, kind: 'text', x: 0, y: 0, width: 100, height: 40, text: 'hi', fontSize: 20 };
}

/** Two decks bound to two docs in one in-memory room; B mirrors A's latest deck. */
function peerPair() {
  const net = createMemoryNetwork();
  const d1 = new CollabDoc();
  const d2 = new CollabDoc();
  let remote: Deck = { slides: [] };
  const b1 = bindDeck(d1, () => {});
  bindDeck(d2, (deck) => {
    remote = deck;
  });
  net.transport().connect(d1, 'deck');
  net.transport().connect(d2, 'deck');
  return { b1, latest: () => remote };
}

describe('bindDeck', () => {
  it('propagates a new slide to the peer', () => {
    const { b1, latest } = peerPair();
    const deck = addSlide({ slides: [{ id: 's1', objects: [] }] });
    b1.pushDeck(deck);
    expect(latest().slides.length).toBe(2);
    expect(latest().slides[0]?.id).toBe('s1');
  });

  it('propagates an object added to a slide', () => {
    const { b1, latest } = peerPair();
    b1.pushDeck({ slides: [{ id: 's1', objects: [] }] });
    b1.pushDeck(addObject({ slides: [{ id: 's1', objects: [] }] }, 's1', text('o1')));
    expect(latest().slides[0]?.objects[0]?.id).toBe('o1');
  });

  it('propagates speaker-notes edits', () => {
    const { b1, latest } = peerPair();
    b1.pushDeck(setSlideNotes({ slides: [{ id: 's1', objects: [] }] }, 's1', 'remember this'));
    expect(latest().slides[0]?.notes).toBe('remember this');
  });

  it('propagates reorder and delete', () => {
    const { b1, latest } = peerPair();
    const base: Deck = { slides: [{ id: 'a', objects: [] }, { id: 'b', objects: [] }] };
    b1.pushDeck(base);
    b1.pushDeck(reorderSlide(base, 0, 1));
    expect(latest().slides.map((s) => s.id)).toEqual(['b', 'a']);
    b1.pushDeck(deleteSlide({ slides: [{ id: 'b', objects: [] }, { id: 'a', objects: [] }] }, 0));
    expect(latest().slides.map((s) => s.id)).toEqual(['a']);
  });

  it('seeds a late-joining guest from a pre-populated host', () => {
    const net = createMemoryNetwork();
    const hostDoc = new CollabDoc();
    const host = bindDeck(hostDoc, () => {});
    net.transport().connect(hostDoc, 'room');
    host.seed({ slides: [{ id: 'x', objects: [text('o')] }, { id: 'y', objects: [] }] });

    const guestDoc = new CollabDoc();
    let guest: Deck = { slides: [] };
    bindDeck(guestDoc, (deck) => {
      guest = deck;
    });
    net.transport().connect(guestDoc, 'room'); // initial sync delivers the seeded deck

    expect(guest.slides.map((s) => s.id)).toEqual(['x', 'y']);
    expect(guest.slides[0]?.objects[0]?.id).toBe('o');
  });

  it('merges concurrent edits to different objects on the same slide (object-level CRDT)', () => {
    const net = createMemoryNetwork();
    const d1 = new CollabDoc();
    const d2 = new CollabDoc();
    const b1 = bindDeck(d1, () => {});
    const b2 = bindDeck(d2, () => {});
    const t1 = net.transport();
    const t2 = net.transport();
    t1.connect(d1, 'r');
    t2.connect(d2, 'r');

    // Both peers start from the same slide with two objects at x=0.
    const base: Deck = {
      slides: [{ id: 's1', objects: [{ ...text('o1'), x: 0 }, { ...text('o2'), x: 0 }] }],
    };
    b1.pushDeck(base);

    // Peer 2 goes offline; each peer moves a DIFFERENT object on that slide.
    t2.disconnect();
    b1.pushDeck({
      slides: [{ id: 's1', objects: [{ ...text('o1'), x: 100 }, { ...text('o2'), x: 0 }] }],
    });
    b2.pushDeck({
      slides: [{ id: 's1', objects: [{ ...text('o1'), x: 0 }, { ...text('o2'), x: 200 }] }],
    });

    // Reconnect → both edits survive on both peers (no whole-slide clobber).
    t2.connect(d2, 'r');

    for (const read of [b1.readDeck(), b2.readDeck()]) {
      const objects = read.slides[0]?.objects ?? [];
      const o1 = objects.find((o) => o.id === 'o1');
      const o2 = objects.find((o) => o.id === 'o2');
      expect(o1?.x).toBe(100);
      expect(o2?.x).toBe(200);
    }
  });

  it('merges concurrent edits to different FIELDS of the same object (field-level CRDT)', () => {
    const net = createMemoryNetwork();
    const d1 = new CollabDoc();
    const d2 = new CollabDoc();
    const b1 = bindDeck(d1, () => {});
    const b2 = bindDeck(d2, () => {});
    const t1 = net.transport();
    const t2 = net.transport();
    t1.connect(d1, 'r');
    t2.connect(d2, 'r');

    // One object, shared starting point (x=0, fontSize=20).
    const base: Deck = { slides: [{ id: 's1', objects: [text('o1')] }] };
    b1.pushDeck(base);

    // Peer 2 offline; each peer edits a DIFFERENT field of the same object o1.
    t2.disconnect();
    b1.pushDeck({ slides: [{ id: 's1', objects: [{ ...text('o1'), x: 100 }] }] }); // A moves x
    const o1Bigger: SlideObject = { id: 'o1', kind: 'text', x: 0, y: 0, width: 100, height: 40, text: 'hi', fontSize: 48 };
    b2.pushDeck({ slides: [{ id: 's1', objects: [o1Bigger] }] }); // B resizes font

    // Reconnect → both field edits survive on both peers (no whole-object clobber).
    t2.connect(d2, 'r');

    for (const read of [b1.readDeck(), b2.readDeck()]) {
      const o1 = read.slides[0]?.objects.find((o) => o.id === 'o1');
      expect(o1?.x).toBe(100);
      expect((o1 as { fontSize?: number } | undefined)?.fontSize).toBe(48);
    }
  });

  it('merges concurrent additions to the same object’s animations list', () => {
    const net = createMemoryNetwork();
    const d1 = new CollabDoc();
    const d2 = new CollabDoc();
    const b1 = bindDeck(d1, () => {});
    const b2 = bindDeck(d2, () => {});
    const t1 = net.transport();
    const t2 = net.transport();
    t1.connect(d1, 'r');
    t2.connect(d2, 'r');

    const anim = (id: string, category: 'entrance' | 'emphasis' | 'exit', effect: string) => ({
      id,
      category,
      effect,
      durationMs: 500,
    });
    const withAnims = (...ids: ReturnType<typeof anim>[]): SlideObject => ({
      ...text('o1'),
      animations: ids,
    });

    // Shared start: o1 has one animation.
    b1.pushDeck({ slides: [{ id: 's1', objects: [withAnims(anim('x', 'entrance', 'fade'))] }] });

    // Peer 2 offline; each peer adds a DIFFERENT animation to the same object.
    t2.disconnect();
    b1.pushDeck({
      slides: [{ id: 's1', objects: [withAnims(anim('x', 'entrance', 'fade'), anim('a', 'emphasis', 'pulse'))] }],
    });
    b2.pushDeck({
      slides: [{ id: 's1', objects: [withAnims(anim('x', 'entrance', 'fade'), anim('b', 'exit', 'fade'))] }],
    });

    // Reconnect → all three animations survive on both peers (no list clobber).
    t2.connect(d2, 'r');

    for (const read of [b1.readDeck(), b2.readDeck()]) {
      const o1 = read.slides[0]?.objects.find((o) => o.id === 'o1');
      const animIds = (o1?.animations ?? []).map((a) => a.id).sort();
      expect(animIds).toEqual(['a', 'b', 'x']);
    }
  });
});
