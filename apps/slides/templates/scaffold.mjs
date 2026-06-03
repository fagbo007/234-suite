// Author/generator for the 234 Slides template library (root §10).
// Node ESM, built-ins only. Run once to emit each template's template.fwsl +
// meta.json + preview.png; re-run to regenerate previews. The committed outputs
// are what ship and what CI validates (src/templates/validate.ts).
//
//   node apps/slides/templates/scaffold.mjs
//
// preview.png files are generated placeholders (a tasteful two-tone 1280×720
// fill) until an in-browser template renderer exists with the Tauri window.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PREVIEW_W = 1280;
const PREVIEW_H = 720;
const BAND_H = 96;

// 1×1 transparent PNG (matches src/model/assets.ts) for image-bearing templates.
const PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// --- PNG encoding (no deps) -------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'latin1');
  const body = Buffer.concat([typeBuf, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function makePng(width, height, top, bottom, bandHeight) {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    const color = y < bandHeight ? top : bottom;
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      raw[p] = color[0];
      raw[p + 1] = color[1];
      raw[p + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const signature = Buffer.from('\x89PNG\r\n\x1a\n', 'latin1');
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- model helpers ----------------------------------------------------------

const text = (id, x, y, width, height, value, fontSize) => ({
  id,
  kind: 'text',
  x,
  y,
  width,
  height,
  text: value,
  fontSize,
});
const rect = (id, x, y, width, height, fill) => ({ id, kind: 'rect', x, y, width, height, fill });
const image = (id, x, y, width, height) => ({ id, kind: 'image', x, y, width, height, src: PLACEHOLDER_IMAGE });

// --- template specs (valid: in 960×540, non-overlapping) --------------------

const templates = [
  {
    name: 'title',
    meta: { tags: ['title', 'opening'], description: 'A clean title slide with a subtitle.' },
    preview: [[63, 81, 181], [245, 246, 250]],
    objects: [text('t-0', 80, 210, 800, 72, 'Presentation title', 44), text('t-1', 80, 300, 800, 40, 'Subtitle or author', 22)],
  },
  {
    name: 'title-bar',
    meta: { tags: ['title', 'accent'], description: 'Title slide with an accent bar.' },
    preview: [[48, 63, 159], [245, 246, 250]],
    objects: [rect('b-0', 0, 0, 960, 12, 'slateblue'), text('t-0', 80, 210, 800, 72, 'Presentation title', 44), text('t-1', 80, 300, 800, 40, 'Subtitle or author', 22)],
  },
  {
    name: 'section',
    meta: { tags: ['section', 'divider'], description: 'A section divider with a number block.' },
    preview: [[33, 33, 33], [240, 240, 240]],
    objects: [rect('r-0', 80, 180, 120, 120, 'slateblue'), text('t-0', 240, 210, 640, 72, 'Section title', 40)],
  },
  {
    name: 'agenda',
    meta: { tags: ['agenda', 'list'], description: 'An agenda slide with three items.' },
    preview: [[63, 81, 181], [250, 250, 252]],
    objects: [
      text('t-0', 80, 60, 800, 60, 'Agenda', 36),
      text('t-1', 80, 160, 800, 48, 'First item', 24),
      text('t-2', 80, 232, 800, 48, 'Second item', 24),
      text('t-3', 80, 304, 800, 48, 'Third item', 24),
    ],
  },
  {
    name: 'two-content',
    meta: { tags: ['content', 'columns'], description: 'A heading over two content columns.' },
    preview: [[0, 121, 107], [248, 248, 248]],
    objects: [
      text('t-0', 80, 60, 800, 60, 'Two content', 36),
      rect('r-0', 80, 160, 360, 300, 'cornflowerblue'),
      rect('r-1', 520, 160, 360, 300, 'mediumseagreen'),
    ],
  },
  {
    name: 'comparison',
    meta: { tags: ['comparison', 'columns'], description: 'Side-by-side comparison of two options.' },
    preview: [[183, 28, 28], [248, 248, 248]],
    objects: [
      text('t-0', 80, 48, 800, 52, 'Comparison', 32),
      text('t-1', 80, 128, 360, 40, 'Option A', 22),
      rect('r-0', 80, 184, 360, 300, 'cornflowerblue'),
      text('t-2', 520, 128, 360, 40, 'Option B', 22),
      rect('r-1', 520, 184, 360, 300, 'indianred'),
    ],
  },
  {
    name: 'quote',
    meta: { tags: ['quote'], description: 'A large pull quote with attribution.' },
    preview: [[55, 71, 79], [245, 245, 245]],
    objects: [text('t-0', 120, 180, 720, 160, '“A memorable quote.”', 36), text('t-1', 120, 360, 720, 40, '— Attribution', 22)],
  },
  {
    name: 'photo',
    meta: { tags: ['photo', 'image'], description: 'A large photo with a side caption.' },
    preview: [[38, 50, 56], [236, 239, 241]],
    objects: [image('i-0', 80, 80, 520, 380), text('t-0', 640, 80, 240, 380, 'Caption text', 22)],
  },
  {
    name: 'closing',
    meta: { tags: ['closing', 'thanks'], description: 'A closing thank-you slide.' },
    preview: [[26, 35, 126], [245, 246, 250]],
    objects: [text('t-0', 80, 200, 800, 80, 'Thank you', 52), text('t-1', 80, 300, 800, 40, 'Questions?', 24)],
  },
  {
    name: 'blank',
    meta: { tags: ['blank'], description: 'An empty slide to start from scratch.' },
    preview: [[224, 224, 224], [250, 250, 250]],
    objects: [],
  },
];

for (const template of templates) {
  const dir = join(ROOT, template.name);
  mkdirSync(dir, { recursive: true });

  const deck = { slides: [{ id: `${template.name}-slide`, objects: template.objects }] };
  writeFileSync(join(dir, 'template.fwsl'), `${JSON.stringify(deck, null, 2)}\n`);

  const meta = {
    name: template.name,
    author: '234 community',
    tags: template.meta.tags,
    description: template.meta.description,
    license: 'MIT',
  };
  writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

  const [top, bottom] = template.preview;
  writeFileSync(join(dir, 'preview.png'), makePng(PREVIEW_W, PREVIEW_H, top, bottom, BAND_H));

  process.stdout.write(`wrote ${template.name}\n`);
}

process.stdout.write(`Generated ${templates.length} templates.\n`);
