import { constraintCheck } from './constraints';
import { snapToGrid } from './layout';
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

/** Add an object to a slide. Placement is grid-snapped and triggers the check (§3). */
export function addObject(deck: Deck, slideId: string, object: SlideObject): Deck {
  const snapped = { ...object, x: snapToGrid(object.x), y: snapToGrid(object.y) };
  return {
    slides: deck.slides.map((slide) => {
      if (slide.id !== slideId) return slide;
      const objects = [...slide.objects, snapped];
      constraintCheck(objects); // advisory — auto-layout guardrail on placement
      return { ...slide, objects };
    }),
  };
}

/** Snap every object on a slide to the spacing grid (auto-layout "tidy"). */
export function tidySlide(deck: Deck, slideId: string): Deck {
  return {
    slides: deck.slides.map((slide) =>
      slide.id === slideId
        ? {
            ...slide,
            objects: slide.objects.map((o) => ({ ...o, x: snapToGrid(o.x), y: snapToGrid(o.y) })),
          }
        : slide,
    ),
  };
}
