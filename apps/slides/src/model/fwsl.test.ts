import { describe, expect, it } from 'vitest';
import { addObject, addSlide, createDeck } from './deck';
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

  it('rejects invalid input', () => {
    expect(() => parseFwsl('{}')).toThrow();
  });
});
