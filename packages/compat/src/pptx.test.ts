import { describe, expect, it } from 'vitest';
import { exportPptx, importPptx, type PptxDeck } from './pptx';
import { encodeText, zip } from './zip';

describe('.pptx round-trip', () => {
  it('preserves text boxes and rectangles (position, size, fill) through export → import', () => {
    const deck: PptxDeck = {
      slides: [
        {
          objects: [
            { kind: 'text', x: 80, y: 60, width: 800, height: 80, text: 'Title slide', fontSize: 40 },
            { kind: 'rect', x: 80, y: 200, width: 360, height: 200, fill: '#6495ED' },
          ],
        },
      ],
    };
    const { deck: round, report } = importPptx(exportPptx(deck));
    expect(report.ok).toBe(true);
    expect(round.slides).toHaveLength(1);
    expect(round.slides[0]!.objects[0]).toMatchObject({ kind: 'text', text: 'Title slide', x: 80, fontSize: 40 });
    expect(round.slides[0]!.objects[1]).toMatchObject({ kind: 'rect', fill: '#6495ED', width: 360 });
  });

  it('imports a picture as a placeholder and reports an Images loss', () => {
    const presentation = `<?xml version="1.0"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>`;
    const rels = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="slides/slide1.xml"/></Relationships>`;
    const slide = `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:pic><p:spPr><a:xfrm><a:off x="127000" y="127000"/><a:ext cx="2540000" cy="1270000"/></a:xfrm></p:spPr></p:pic></p:spTree></p:cSld></p:sld>`;
    const bytes = zip({
      'ppt/presentation.xml': encodeText(presentation),
      'ppt/_rels/presentation.xml.rels': encodeText(rels),
      'ppt/slides/slide1.xml': encodeText(slide),
    });

    const { deck, report } = importPptx(bytes);
    expect(deck.slides[0]!.objects[0]).toMatchObject({ kind: 'image', x: 10, y: 10 });
    expect(report.losses.some((l) => l.feature === 'Images')).toBe(true);
  });
});
