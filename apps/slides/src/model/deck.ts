import { constraintCheck } from './constraints';
import { type Deck, type Slide, type SlideObject } from './types';

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createSlide(): Slide {
  return { id: newId('slide'), objects: [] };
}

export function createDeck(): Deck {
  return { slides: [createSlide()] };
}

export function addSlide(deck: Deck, atIndex: number = deck.slides.length): Deck {
  const slides = [...deck.slides];
  const index = Math.max(0, Math.min(atIndex, slides.length));
  slides.splice(index, 0, createSlide());
  return { slides };
}

export function deleteSlide(deck: Deck, index: number): Deck {
  if (index < 0 || index >= deck.slides.length) return deck;
  return { slides: deck.slides.filter((_, i) => i !== index) };
}

export function reorderSlide(deck: Deck, from: number, to: number): Deck {
  const slides = [...deck.slides];
  if (from < 0 || from >= slides.length || to < 0 || to >= slides.length) return deck;
  const [moved] = slides.splice(from, 1);
  if (!moved) return deck;
  slides.splice(to, 0, moved);
  return { slides };
}

/** Add an object to a slide. Placement triggers the constraint check (§3). */
export function addObject(deck: Deck, slideId: string, object: SlideObject): Deck {
  return {
    slides: deck.slides.map((slide) => {
      if (slide.id !== slideId) return slide;
      const objects = [...slide.objects, object];
      // Phase 1: stub returns true; wired for the Phase 2 auto-layout engine.
      constraintCheck(objects);
      return { ...slide, objects };
    }),
  };
}
