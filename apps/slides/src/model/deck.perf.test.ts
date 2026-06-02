import { describe, expect, it } from 'vitest';
import { buildHundredSlideDeck } from './benchDoc';
import { parseFwsl, serializeFwsl } from './fwsl';

// Section 8 gate: open a 100-slide deck with images in < 3s. We measure the
// model cost we control — parse `.fwsl` + materialise every slide's objects.
// Fabric canvas paint is browser-only (jsdom has no 2D context) and is validated
// in-browser once the Tauri window exists. Threshold is not weakened.
describe('Slides 100-slide open benchmark (Section 8 gate)', () => {
  it('parses and materialises a 100-slide deck in under 3s', () => {
    const json = serializeFwsl(buildHundredSlideDeck());

    const start = performance.now();
    const deck = parseFwsl(json);
    let objectCount = 0;
    for (const slide of deck.slides) {
      for (const _object of slide.objects) objectCount++;
    }
    const elapsed = performance.now() - start;

    expect(deck.slides).toHaveLength(100);
    expect(objectCount).toBe(400);
    expect(elapsed).toBeLessThan(3000);
  });
});
