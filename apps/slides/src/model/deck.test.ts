import { describe, expect, it } from 'vitest';
import {
  addObject,
  addSlide,
  createDeck,
  deleteSlide,
  reorderSlide,
  setSlideNotes,
  tidySlide,
  updateObject,
} from './deck';
import { type SlideObject } from './types';

const rect: SlideObject = { id: 'r1', kind: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'black' };

describe('deck CRUD', () => {
  it('starts with one slide and adds more', () => {
    const deck = createDeck();
    expect(deck.slides).toHaveLength(1);
    expect(addSlide(deck).slides).toHaveLength(2);
  });

  it('deletes a slide by index', () => {
    const deck = addSlide(createDeck());
    const after = deleteSlide(deck, 0);
    expect(after.slides).toHaveLength(1);
  });

  it('reorders slides', () => {
    const deck = addSlide(addSlide(createDeck())); // 3 slides
    const firstId = deck.slides[0]?.id;
    const moved = reorderSlide(deck, 0, 2);
    expect(moved.slides[2]?.id).toBe(firstId);
  });

  it('adds an object to the target slide and leaves others untouched', () => {
    const deck = addSlide(createDeck());
    const targetId = deck.slides[1]!.id;
    const after = addObject(deck, targetId, rect);
    expect(after.slides[1]?.objects).toHaveLength(1);
    expect(after.slides[0]?.objects).toHaveLength(0);
  });

  it('grid-snaps a new object on add', () => {
    const deck = createDeck();
    const slideId = deck.slides[0]!.id;
    const after = addObject(deck, slideId, { ...rect, x: 13, y: 21 });
    expect(after.slides[0]?.objects[0]?.x).toBe(16);
    expect(after.slides[0]?.objects[0]?.y).toBe(24);
  });

  it('tidySlide snaps all objects to the grid', () => {
    const deck = createDeck();
    const slideId = deck.slides[0]!.id;
    // bypass add-snapping to seed off-grid coordinates
    const seeded = {
      slides: [{ ...deck.slides[0]!, objects: [{ ...rect, x: 13, y: 21 }] }],
    };
    const tidied = tidySlide(seeded, slideId);
    expect(tidied.slides[0]?.objects[0]?.x).toBe(16);
    expect(tidied.slides[0]?.objects[0]?.y).toBe(24);
  });

  it('updateObject replaces a single object immutably', () => {
    const base = createDeck();
    const slideId = base.slides[0]!.id;
    const deck = addObject(base, slideId, rect);
    const after = updateObject(deck, slideId, 'r1', (o) => ({ ...o, x: 99 }));
    expect(after.slides[0]?.objects[0]?.x).toBe(99);
    expect(deck.slides[0]?.objects[0]?.x).toBe(0); // original untouched
  });

  it('setSlideNotes sets speaker notes on the target slide', () => {
    const deck = createDeck();
    const slideId = deck.slides[0]!.id;
    const after = setSlideNotes(deck, slideId, 'Remember to smile');
    expect(after.slides[0]?.notes).toBe('Remember to smile');
  });
});
