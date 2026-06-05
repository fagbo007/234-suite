/**
 * Binds the Slides `Deck` to a shared Yjs structure (the Slides mapping in
 * docs/architecture/collab.md). Slide-granular: a `Y.Map` keyed by slide id →
 * JSON of the slide, plus a `Y.Array` of ids for order. Edits to different slides
 * merge; within-slide concurrent edits are last-write-wins per slide (object-level
 * CRDT is a future enhancement). Local pushes carry a `LOCAL` transaction origin
 * so the remote listener ignores our own writes.
 */
import { type CollabDoc } from '@234/collab';
import { type Deck, type Slide } from '../model/types';

export interface DeckBinding {
  /** Reconcile the local deck into the shared doc (minimal writes). */
  pushDeck(deck: Deck): void;
  /** Rebuild a deck from the shared doc. */
  readDeck(): Deck;
  /** Host: copy the current deck into the shared doc for joining peers. */
  seed(deck: Deck): void;
  destroy(): void;
}

export function bindDeck(doc: CollabDoc, onRemoteChange: (deck: Deck) => void): DeckBinding {
  const slidesMap = doc.map<string>('slides');
  const order = doc.array<string>('order');
  const LOCAL = Symbol('deck-binding-local');

  function readDeck(): Deck {
    const slides = order
      .toArray()
      .map((id) => {
        const json = slidesMap.get(id);
        return json ? (JSON.parse(json) as Slide) : null;
      })
      .filter((slide): slide is Slide => slide !== null);
    return { slides };
  }

  function pushDeck(deck: Deck): void {
    doc.doc.transact(() => {
      const ids = deck.slides.map((slide) => slide.id);
      // Upsert changed slides.
      for (const slide of deck.slides) {
        const json = JSON.stringify(slide);
        if (slidesMap.get(slide.id) !== json) slidesMap.set(slide.id, json);
      }
      // Drop slides no longer present.
      for (const key of [...slidesMap.keys()]) {
        if (!ids.includes(key)) slidesMap.delete(key);
      }
      // Replace the order array only when the id sequence changed.
      const current = order.toArray();
      const same = current.length === ids.length && current.every((id, i) => id === ids[i]);
      if (!same) {
        order.delete(0, order.length);
        order.insert(0, ids);
      }
    }, LOCAL);
  }

  const unsubscribe = doc.onUpdate((_update, origin) => {
    if (origin === LOCAL) return; // our own write
    onRemoteChange(readDeck());
  });

  return {
    pushDeck,
    readDeck,
    seed: pushDeck,
    destroy: unsubscribe,
  };
}
