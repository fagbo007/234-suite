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
});
