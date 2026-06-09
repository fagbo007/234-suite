/**
 * Binds the Slides `Deck` to a nested Yjs structure (the Slides mapping in
 * docs/architecture/collab.md), at **field granularity** so concurrent edits to
 * different fields of the *same* object merge instead of clobbering:
 *
 *   order        : Y.Array<slideId>                       — slide order
 *   slides       : Y.Map<slideId → slideMap>
 *     slideMap.notes        : string
 *     slideMap.objectOrder  : Y.Array<objectId>           — z-order within the slide
 *     slideMap.objects      : Y.Map<objectId → Y.Map<fieldName → value>>
 *
 * Each object is its own `Y.Map` whose keys are the object's scalar fields
 * (`x`/`y`/`width`/`height`/`kind`/`text`/`fontSize`/`fill`/`src`), plus an
 * `animations` nested `Y.Map<animationId → JSON(Animation)>`. So two peers
 * editing different objects — different fields of the same object (A drags `x`,
 * B edits `fontSize`) — or different animations of the same object (A adds an
 * entrance, B adds an exit) — all survive a merge. Local pushes carry a `LOCAL`
 * transaction origin so the remote listener ignores them.
 *
 * No cross-version migration: the collab doc is ephemeral session state (the
 * `.fwsl` file is the on-disk source of truth) and both peers run one code version.
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
type YObjectFields = Y.Map<unknown>;
type YObjects = Y.Map<YObjectFields>;
type YAnimations = Y.Map<string>; // animationId → JSON(Animation)
type YOrder = Y.Array<string>;

/** The object's **scalar** stored fields (animations are handled separately as a
 *  nested map so they merge per-animation). */
function objToFields(object: SlideObject): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined || key === 'animations') continue;
    fields[key] = value;
  }
  return fields;
}

/** Rebuild an object from its field map (scalars + the nested `animations` map). */
function fieldsToObj(objMap: YObjectFields): SlideObject {
  const out: Record<string, unknown> = {};
  objMap.forEach((value, key) => {
    if (key === 'animations') {
      const anims: unknown[] = [];
      (value as YAnimations).forEach((json) => anims.push(JSON.parse(json)));
      if (anims.length > 0) out.animations = anims;
    } else {
      out[key] = value;
    }
  });
  return out as unknown as SlideObject;
}

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
          const objMap = objects.get(objectId);
          if (objMap) objs.push(fieldsToObj(objMap));
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
          objects = new Y.Map<YObjectFields>();
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
          let objMap = objects.get(object.id);
          if (!objMap) {
            objMap = new Y.Map<unknown>();
            objects.set(object.id, objMap);
          }
          // Set each changed scalar field. Distinct fields are distinct Y.Map
          // keys, so concurrent field edits to the same object merge.
          const fields = objToFields(object);
          for (const [key, value] of Object.entries(fields)) {
            if (objMap.get(key) !== value) objMap.set(key, value);
          }

          // Animations: a nested Y.Map<animId → JSON> so concurrent edits to one
          // object's animation list merge (per-animation LWW).
          const anims = object.animations ?? [];
          if (anims.length === 0) {
            if (objMap.get('animations') !== undefined) objMap.delete('animations');
          } else {
            let animMap = objMap.get('animations');
            if (!(animMap instanceof Y.Map)) {
              animMap = new Y.Map<string>();
              objMap.set('animations', animMap);
            }
            const typed = animMap as YAnimations;
            const animIds = anims.map((a) => a.id);
            for (const animation of anims) {
              const json = JSON.stringify(animation);
              if (typed.get(animation.id) !== json) typed.set(animation.id, json);
            }
            for (const k of [...typed.keys()]) {
              if (!animIds.includes(k)) typed.delete(k);
            }
          }

          // Delete removed scalar fields (`animations` is managed above).
          for (const key of [...objMap.keys()]) {
            if (key !== 'animations' && !(key in fields)) objMap.delete(key);
          }
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
