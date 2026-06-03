import { describe, expect, it } from 'vitest';
import { type Deck } from '../model/types';
import { modelToPptxDeck, pptxDeckToModel } from './pptxMap';

describe('pptx ↔ Slides model mappers', () => {
  it('modelToPptxDeck drops ids and keeps kind-specific fields', () => {
    const deck: Deck = {
      slides: [
        {
          id: 's1',
          objects: [
            { id: 't', kind: 'text', x: 1, y: 2, width: 3, height: 4, text: 'Hi', fontSize: 20 },
            { id: 'r', kind: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#abcdef' },
          ],
        },
      ],
    };
    const pptx = modelToPptxDeck(deck);
    expect(pptx.slides[0]!.objects[0]).toEqual({ kind: 'text', x: 1, y: 2, width: 3, height: 4, text: 'Hi', fontSize: 20 });
    expect(pptx.slides[0]!.objects[1]).toMatchObject({ kind: 'rect', fill: '#abcdef' });
  });

  it('pptxDeckToModel adds ids and a placeholder src for pictures', () => {
    const model = pptxDeckToModel({
      slides: [{ objects: [{ kind: 'image', x: 0, y: 0, width: 100, height: 80 }] }],
    });
    const image = model.slides[0]!.objects[0]!;
    expect(image.kind).toBe('image');
    expect(image.id).toBeTruthy();
    expect(model.slides[0]!.id).toBeTruthy();
    if (image.kind === 'image') expect(image.src).toBeTruthy();
  });
});
