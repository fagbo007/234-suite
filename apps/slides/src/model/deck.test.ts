import { describe, expect, it } from 'vitest';
import { addObject, addSlide, createDeck, deleteSlide, reorderSlide } from './deck';
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
});
