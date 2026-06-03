import { type DocBlock, blocksToMarkdown, markdownToBlocks, type TextRun } from './blocks';
import { createImportReport, type ImportReport } from './report';
import { decodeText, encodeText, unzip, zip } from './zip';

/**
 * `.docx` (WordprocessingML) ↔ neutral blocks. Dependency-light + scoped (owner
 * decision): paragraphs, headings (h1–h3), bold/italic round-trip; everything
 * else (tables, images, lists, hyperlinks, other styles) is preserved as text
 * where possible and logged to the import report — never silently dropped
 * (root §7, §16). Reads use the browser/jsdom `DOMParser`; writes use string
 * templates; ZIP via fflate.
 */

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- write ---

function runXml(run: TextRun): string {
  const props: string[] = [];
  if (run.bold) props.push('<w:b/>');
  if (run.italic) props.push('<w:i/>');
  const rPr = props.length > 0 ? `<w:rPr>${props.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
}

function paragraphXml(block: DocBlock): string {
  const pPr = block.kind === 'heading' ? `<w:pPr><w:pStyle w:val="Heading${block.level ?? 1}"/></w:pPr>` : '';
  return `<w:p>${pPr}${block.runs.map(runXml).join('')}</w:p>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

export function blocksToDocx(blocks: DocBlock[]): Uint8Array {
  const body = blocks.map(paragraphXml).join('');
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}"><w:body>${body}</w:body></w:document>`;
  return zip({
    '[Content_Types].xml': encodeText(CONTENT_TYPES),
    '_rels/.rels': encodeText(ROOT_RELS),
    'word/document.xml': encodeText(document),
  });
}

// --- read ---

function headingLevel(style: string | null): 1 | 2 | 3 | null {
  const match = /^Heading([123])$/.exec(style ?? '');
  return match ? (Number(match[1]) as 1 | 2 | 3) : null;
}

function runFromElement(r: Element): TextRun {
  const text = Array.from(r.getElementsByTagName('w:t'))
    .map((t) => t.textContent ?? '')
    .join('');
  const run: TextRun = { text };
  if (r.getElementsByTagName('w:b').length > 0) run.bold = true;
  if (r.getElementsByTagName('w:i').length > 0) run.italic = true;
  return run;
}

export function docxToBlocks(bytes: Uint8Array): { blocks: DocBlock[]; report: ImportReport } {
  const report = createImportReport();
  const files = unzip(bytes);
  const documentXml = files['word/document.xml'];
  if (!documentXml) throw new Error('Not a .docx: missing word/document.xml');

  const doc = new DOMParser().parseFromString(decodeText(documentXml), 'application/xml');

  // Log unsupported constructs as fidelity losses (content still extracted below).
  const note = (tag: string, feature: string, detail: string) => {
    const n = doc.getElementsByTagName(tag).length;
    if (n > 0) report.lossy(feature, detail.replace('{n}', String(n)));
  };
  note('w:tbl', 'Tables', '{n} table(s) flattened to paragraphs');
  note('w:drawing', 'Images', '{n} image(s) dropped');
  note('w:numPr', 'Lists', '{n} list item(s) imported as plain paragraphs');
  note('w:hyperlink', 'Hyperlinks', '{n} hyperlink(s) imported as plain text');

  const blocks: DocBlock[] = [];
  for (const p of Array.from(doc.getElementsByTagName('w:p'))) {
    const style = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') ?? null;
    const level = headingLevel(style);
    if (style && level === null && style !== 'Normal') {
      report.lossy('Styles', `paragraph style "${style}" not supported`);
    }
    const runs = Array.from(p.getElementsByTagName('w:r')).map(runFromElement);
    blocks.push(
      level !== null
        ? { kind: 'heading', level, runs: runs.length > 0 ? runs : [{ text: '' }] }
        : { kind: 'paragraph', runs: runs.length > 0 ? runs : [{ text: '' }] },
    );
  }

  return { blocks, report };
}

// --- public app API (Markdown bridge) ---

/** Import a `.docx` into Markdown (Writer's `.fwtr` body) + a fidelity report. */
export function importDocx(bytes: Uint8Array): { markdown: string; report: ImportReport } {
  const { blocks, report } = docxToBlocks(bytes);
  return { markdown: blocksToMarkdown(blocks), report };
}

/** Export Markdown (from Writer) to a `.docx` byte array. */
export function exportDocx(markdown: string): Uint8Array {
  return blocksToDocx(markdownToBlocks(markdown));
}
