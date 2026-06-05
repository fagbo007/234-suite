/**
 * Binds the Slides `Deck` to a nested Yjs structure (the Slides mapping in
 * docs/architecture/collab.md), at **object granularity** so concurrent edits to
 * different objects on the same slide merge instead of clobbering:
 *
 *   order        : Y.Array<slideId>                       — slide order
 *   slides       : Y.Map<slideId → slideMap>
 *     slideMap.notes        : string
 *     slideMap.objectOrder  : Y.Array<objectId>           — z-order within the slide
 *     slideMap.objects      : Y.Map<objectId → JSON(SlideObject)>
 *
 * Each object is its own `Y.Map` entry, so two peers editing different objects on
 * the same slide both survive a merge. A single object is stored as a JSON blob
 * (per-object last-write-wins — field-level merge is a future refinement). Local
 * pushes carry a `LOCAL` transaction origin so the remote listener ignores them.
 */
import { type CollabDoc, Y } from '@234/collab';
import { type Deck, type Slide, type SlideObject } from '../model/types';

export interface DeckBinding {
  /** Reconcile the local deck into the shared doc (minimal, granular writes). */
  pushDeck(deck: Deck): void;
  /** Rebuild a deck from the shared doc. */
  readDeck(): Deck;
  /** Host: copy the current deck into the shared doc for joining peers. */
  seed(deck: Deck): void;
  destroy(): void;
}

type YSlide = Y.Map<unknown>;
type YObjects = Y.Map<string>;
type YOrder = Y.Array<string>;

/** Rewrite a Y.Array of ids only when the sequence actually changed (avoids
 *  spurious order conflicts when two peers leave the order untouched). */
function syncOrder(arr: YOrder, ids: string[]): void {
  const current = arr.toArray();
  const same = current.length === ids.length && current.every((v, i) => v === ids[i]);
  if (!same) {
    arr.delete(0, arr.length);
    arr.insert(0, ids);
  }
}

export function bindDeck(doc: CollabDoc, onRemoteChange: (deck: Deck) => void): DeckBinding {
  const slides = doc.map<YSlide>('slides');
  const order = doc.array<string>('order');
  const LOCAL = Symbol('deck-binding-local');

  function readDeck(): Deck {
    const result: Slide[] = [];
    for (const slideId of order.toArray()) {
      const slideMap = slides.get(slideId);
      if (!slideMap) continue;
      const notes = (slideMap.get('notes') as string | undefined) ?? '';
      const objects = slideMap.get('objects') as YObjects | undefined;
      const objectOrder = slideMap.get('objectOrder') as YOrder | undefined;

      const objs: SlideObject[] = [];
      if (objects && objectOrder) {
        for (const objectId of objectOrder.toArray()) {
          const json = objects.get(objectId);
          if (json) objs.push(JSON.parse(json) as SlideObject);
        }
      }
      const slide: Slide = { id: slideId, objects: objs };
      if (notes) slide.notes = notes;
      result.push(slide);
    }
    return { slides: result };
  }

  function pushDeck(deck: Deck): void {
    doc.doc.transact(() => {
      const slideIds = deck.slides.map((s) => s.id);
      syncOrder(order, slideIds);

      for (const slide of deck.slides) {
        let slideMap = slides.get(slide.id);
        if (!slideMap) {
          slideMap = new Y.Map() as YSlide;
          slides.set(slide.id, slideMap);
        }

        const notes = slide.notes ?? '';
        if (((slideMap.get('notes') as string | undefined) ?? '') !== notes) {
          slideMap.set('notes', notes);
        }

        let objects = slideMap.get('objects') as YObjects | undefined;
        if (!objects) {
          objects = new Y.Map<string>();
          slideMap.set('objects', objects);
        }
        let objectOrder = slideMap.get('objectOrder') as YOrder | undefined;
        if (!objectOrder) {
          objectOrder = new Y.Array<string>();
          slideMap.set('objectOrder', objectOrder);
        }

        const objectIds = slide.objects.map((o) => o.id);
        syncOrder(objectOrder, objectIds);
        for (const object of slide.objects) {
          const json = JSON.stringify(object);
          if (objects.get(object.id) !== json) objects.set(object.id, json);
        }
        for (const key of [...objects.keys()]) {
          if (!objectIds.includes(key)) objects.delete(key);
        }
      }

      for (const key of [...slides.keys()]) {
        if (!slideIds.includes(key)) slides.delete(key);
      }
    }, LOCAL);
  }

  const unsubscribe = doc.onUpdate((_update, origin) => {
    if (origin === LOCAL) return;
    onRemoteChange(readDeck());
  });

  return {
    pushDeck,
    readDeck,
    seed: pushDeck,
    destroy: unsubscribe,
  };
}
