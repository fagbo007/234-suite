import { createImportReport, type ImportReport } from './report';
import { escapeXml } from './xml';
import { decodeText, encodeText, unzip, zip } from './zip';

/**
 * `.pptx` (PresentationML) ↔ a neutral, id-free deck. Dependency-light + scoped
 * (consistent with docx/xlsx): text boxes and rectangles round-trip (position/
 * size via 12700 EMU per px; text + font size; rect fill as #RRGGBB). Pictures
 * import as a placeholder image object + a logged fidelity loss (never silently
 * dropped, root §7/§16); on export, image objects are omitted (a documented
 * model→format limitation). Reads use DOMParser; writes use string templates;
 * ZIP via fflate.
 */

const EMU_PER_PX = 12700;
const SLIDE_CX = 12192000; // 960 px
const SLIDE_CY = 6858000; // 540 px
const P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export interface PptxObject {
  kind: 'text' | 'rect' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fill?: string;
}
export interface PptxSlide {
  objects: PptxObject[];
}
export interface PptxDeck {
  slides: PptxSlide[];
}

const NAMED_COLORS: Record<string, string> = {
  cornflowerblue: '6495ED',
  mediumseagreen: '3CB371',
  indianred: 'CD5C5C',
  slateblue: '6A5ACD',
  black: '000000',
  white: 'FFFFFF',
};

function toHex6(fill: string | undefined): string {
  if (!fill) return '888888';
  const hex = /^#?([0-9a-fA-F]{6})$/.exec(fill);
  if (hex) return hex[1]!.toUpperCase();
  return NAMED_COLORS[fill.toLowerCase()] ?? '888888';
}

const px = (emu: number) => Math.round(emu / EMU_PER_PX);
const emu = (value: number) => Math.round(value * EMU_PER_PX);

// --- write ---

function shapeXml(object: PptxObject, id: number): string {
  if (object.kind === 'image') return ''; // omitted on export (documented)
  const xfrm = `<a:xfrm><a:off x="${emu(object.x)}" y="${emu(object.y)}"/><a:ext cx="${emu(object.width)}" cy="${emu(object.height)}"/></a:xfrm>`;
  if (object.kind === 'text') {
    const sz = Math.round((object.fontSize ?? 18) * 100);
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="TextBox ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="en-US" sz="${sz}"/><a:t>${escapeXml(object.text ?? '')}</a:t></a:r></a:p></p:txBody></p:sp>`;
  }
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Rectangle ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${toHex6(object.fill)}"/></a:solidFill></p:spPr></p:sp>`;
}

function slideXml(slide: PptxSlide): string {
  const shapes = slide.objects.map((object, index) => shapeXml(object, index + 2)).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="${P_NS}" xmlns:a="${A_NS}" xmlns:r="${R_NS}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${shapes}</p:spTree></p:cSld></p:sld>`;
}

export function deckToPptx(deck: PptxDeck): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  const overrides = deck.slides
    .map(
      (_, i) =>
        `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    )
    .join('');
  files['[Content_Types].xml'] = encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${overrides}</Types>`);

  files['_rels/.rels'] = encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);

  const sldIds = deck.slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('');
  files['ppt/presentation.xml'] = encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="${P_NS}" xmlns:r="${R_NS}" xmlns:a="${A_NS}"><p:sldIdLst>${sldIds}</p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/></p:presentation>`);

  const rels = deck.slides
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
    )
    .join('');
  files['ppt/_rels/presentation.xml.rels'] = encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`);

  deck.slides.forEach((slide, i) => {
    files[`ppt/slides/slide${i + 1}.xml`] = encodeText(slideXml(slide));
  });

  return zip(files);
}

// --- read ---

function parseXml(files: Record<string, Uint8Array>, path: string): Document | null {
  const bytes = files[path];
  return bytes ? new DOMParser().parseFromString(decodeText(bytes), 'application/xml') : null;
}

function readXfrm(el: Element): { x: number; y: number; width: number; height: number } {
  const off = el.getElementsByTagName('a:off')[0];
  const ext = el.getElementsByTagName('a:ext')[0];
  return {
    x: px(Number(off?.getAttribute('x') ?? '0')),
    y: px(Number(off?.getAttribute('y') ?? '0')),
    width: px(Number(ext?.getAttribute('cx') ?? '0')),
    height: px(Number(ext?.getAttribute('cy') ?? '0')),
  };
}

function slidePaths(files: Record<string, Uint8Array>): string[] {
  const presentation = parseXml(files, 'ppt/presentation.xml');
  const rels = parseXml(files, 'ppt/_rels/presentation.xml.rels');
  if (!presentation || !rels) return [];
  const target = new Map<string, string>();
  for (const rel of Array.from(rels.getElementsByTagName('Relationship'))) {
    const id = rel.getAttribute('Id');
    const t = (rel.getAttribute('Target') ?? '').replace(/^\//, '');
    if (id) target.set(id, t.startsWith('ppt/') ? t : `ppt/${t}`);
  }
  const paths: string[] = [];
  for (const sldId of Array.from(presentation.getElementsByTagName('p:sldId'))) {
    const rid = sldId.getAttribute('r:id');
    const path = rid ? target.get(rid) : undefined;
    if (path) paths.push(path);
  }
  return paths;
}

export function pptxToDeck(bytes: Uint8Array): { deck: PptxDeck; report: ImportReport } {
  const report = createImportReport();
  const files = unzip(bytes);
  const slides: PptxSlide[] = [];
  let pictureCount = 0;

  for (const path of slidePaths(files)) {
    const doc = parseXml(files, path);
    if (!doc) continue;
    const objects: PptxObject[] = [];

    for (const sp of Array.from(doc.getElementsByTagName('p:sp'))) {
      const box = readXfrm(sp);
      const text = Array.from(sp.getElementsByTagName('a:t'))
        .map((t) => t.textContent ?? '')
        .join(' ')
        .trim();
      if (text !== '') {
        const sz = sp.getElementsByTagName('a:rPr')[0]?.getAttribute('sz');
        objects.push({ kind: 'text', ...box, text, fontSize: sz ? Number(sz) / 100 : 24 });
      } else {
        const val = sp.getElementsByTagName('a:srgbClr')[0]?.getAttribute('val');
        objects.push({ kind: 'rect', ...box, fill: val ? `#${val}` : '#888888' });
      }
    }

    for (const pic of Array.from(doc.getElementsByTagName('p:pic'))) {
      objects.push({ kind: 'image', ...readXfrm(pic) });
      pictureCount += 1;
    }

    slides.push({ objects });
  }

  if (pictureCount > 0) {
    report.lossy('Images', `${pictureCount} picture(s) imported as placeholders (embedded media not inlined)`);
  }
  return { deck: { slides }, report };
}

// --- public app API ---

export function importPptx(bytes: Uint8Array): { deck: PptxDeck; report: ImportReport } {
  return pptxToDeck(bytes);
}

export function exportPptx(deck: PptxDeck): Uint8Array {
  return deckToPptx(deck);
}
