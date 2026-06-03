import { type PptxDeck, type PptxObject } from '@234/compat';
import { PLACEHOLDER_IMAGE } from '../model/assets';
import { type Deck, type SlideObject } from '../model/types';

/**
 * Map between @234/compat's id-free `PptxDeck` and the Slides `Deck`. Import adds
 * ids (and a placeholder for pictures — embedded media isn't inlined, part 3);
 * export drops ids/notes/animations (images are omitted by the exporter).
 */

function toSlideObject(object: PptxObject): SlideObject {
  const id = crypto.randomUUID();
  const base = { id, x: object.x, y: object.y, width: object.width, height: object.height };
  if (object.kind === 'text') {
    return { ...base, kind: 'text', text: object.text ?? '', fontSize: object.fontSize ?? 24 };
  }
  if (object.kind === 'image') {
    return { ...base, kind: 'image', src: PLACEHOLDER_IMAGE };
  }
  return { ...base, kind: 'rect', fill: object.fill ?? '#888888' };
}

export function pptxDeckToModel(pptx: PptxDeck): Deck {
  return {
    slides: pptx.slides.map((slide) => ({
      id: crypto.randomUUID(),
      objects: slide.objects.map(toSlideObject),
    })),
  };
}

export function modelToPptxDeck(deck: Deck): PptxDeck {
  return {
    slides: deck.slides.map((slide) => ({
      objects: slide.objects.map((object): PptxObject => {
        const base = { x: object.x, y: object.y, width: object.width, height: object.height };
        if (object.kind === 'text') return { kind: 'text', ...base, text: object.text, fontSize: object.fontSize };
        if (object.kind === 'image') return { kind: 'image', ...base };
        return { kind: 'rect', ...base, fill: object.fill };
      }),
    })),
  };
}
