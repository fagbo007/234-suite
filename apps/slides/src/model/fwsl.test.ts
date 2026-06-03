import { describe, expect, it } from 'vitest';
import { addAnimation, createAnimation } from './animation';
import { addObject, addSlide, createDeck, setSlideNotes, updateObject } from './deck';
import { parseFwsl, serializeFwsl } from './fwsl';
import { type SlideObject } from './types';

describe('.fwsl round-trip', () => {
  it('serialises and parses a deck losslessly', () => {
    let deck = addSlide(createDeck());
    const text: SlideObject = {
      id: 't1',
      kind: 'text',
      x: 10,
      y: 20,
      width: 200,
      height: 40,
      text: 'Hello',
      fontSize: 24,
    };
    deck = addObject(deck, deck.slides[0]!.id, text);

    const json = serializeFwsl(deck);
    const restored = parseFwsl(json);

    expect(restored).toEqual(deck);
  });

  it('round-trips animations and speaker notes', () => {
    const base = createDeck();
    const slideId = base.slides[0]!.id;
    const obj: SlideObject = { id: 'r1', kind: 'rect', x: 0, y: 0, width: 100, height: 40, fill: 'black' };
    let deck = addObject(base, slideId, obj);
    deck = updateObject(deck, slideId, 'r1', (o) => addAnimation(o, createAnimation('entrance', 'fade', 300)));
    deck = setSlideNotes(deck, slideId, 'Speak slowly');

    const restored = parseFwsl(serializeFwsl(deck));

    expect(restored.slides[0]?.notes).toBe('Speak slowly');
    expect(restored.slides[0]?.objects[0]?.animations?.[0]?.effect).toBe('fade');
    expect(restored).toEqual(deck);
  });

  it('rejects invalid input', () => {
    expect(() => parseFwsl('{}')).toThrow();
  });
});
