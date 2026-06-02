import { PLACEHOLDER_IMAGE } from './assets';
import { type Deck, type Slide, type SlideObject } from './types';

/**
 * Build a 100-slide deck with images for the open benchmark (root CLAUDE.md
 * Section 8: open a 100-slide deck with images in < 3s).
 */
export function buildHundredSlideDeck(slideCount = 100): Deck {
  const slides: Slide[] = [];
  for (let s = 0; s < slideCount; s++) {
    const objects: SlideObject[] = [
      { id: `t-${s}`, kind: 'text', x: 80, y: 60, width: 800, height: 80, text: `Slide ${s + 1}`, fontSize: 40 },
      { id: `b-${s}`, kind: 'text', x: 80, y: 180, width: 800, height: 200, text: 'Body copy for the benchmark deck.', fontSize: 22 },
      { id: `r-${s}`, kind: 'rect', x: 80, y: 420, width: 360, height: 80, fill: 'cornflowerblue' },
      { id: `i-${s}`, kind: 'image', x: 520, y: 380, width: 200, height: 120, src: PLACEHOLDER_IMAGE },
    ];
    slides.push({ id: `slide-${s}`, objects });
  }
  return { slides };
}
