import { refToRowCol, rowColToRef } from './a1';
import { createImportReport, type ImportReport } from './report';
import { escapeXml } from './xml';
import { decodeText, encodeText, unzip, zip } from './zip';

/**
 * `.xlsx` (SpreadsheetML) ↔ a 2D array of raw cell contents (the same shape
 * 234 Sheet's `.fwsh` uses). Dependency-light + scoped (owner decision): the
 * first worksheet's numbers, strings, and formulas round-trip; extra sheets,
 * styles/number-formats, merged cells, and charts are logged as fidelity losses
 * — content is never silently dropped (root §7, §16). Reads use DOMParser;
 * writes use string templates + inline strings (no shared-string table); ZIP
 * via fflate. Imported formulas keep A1 references (the engine's raw-cell
 * boundary accepts A1).
 */

const SS_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function isNumeric(raw: string): boolean {
  return raw.trim() !== '' && Number.isFinite(Number(raw));
}

// --- write ---

function cellXml(raw: string, ref: string): string {
  if (raw.startsWith('=')) return `<c r="${ref}"><f>${escapeXml(raw.slice(1))}</f></c>`;
  if (isNumeric(raw)) return `<c r="${ref}"><v>${escapeXml(raw)}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(raw)}</t></is></c>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${SS_NS}" xmlns:r="${R_NS}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

export function cellsToXlsx(cells: string[][]): Uint8Array {
  const rowsXml: string[] = [];
  cells.forEach((row, r) => {
    const cellsXml = row
      .map((raw, c) => (raw === '' ? '' : cellXml(raw, rowColToRef(r, c))))
      .filter((s) => s !== '');
    if (cellsXml.length > 0) rowsXml.push(`<row r="${r + 1}">${cellsXml.join('')}</row>`);
  });
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${SS_NS}"><sheetData>${rowsXml.join('')}</sheetData></worksheet>`;
  return zip({
    '[Content_Types].xml': encodeText(CONTENT_TYPES),
    '_rels/.rels': encodeText(ROOT_RELS),
    'xl/workbook.xml': encodeText(WORKBOOK),
    'xl/_rels/workbook.xml.rels': encodeText(WORKBOOK_RELS),
    'xl/worksheets/sheet1.xml': encodeText(sheet),
  });
}

// --- read ---

function parseXml(files: Record<string, Uint8Array>, path: string): Document | null {
  const bytes = files[path];
  if (!bytes) return null;
  return new DOMParser().parseFromString(decodeText(bytes), 'application/xml');
}

function sharedStrings(files: Record<string, Uint8Array>): string[] {
  const doc = parseXml(files, 'xl/sharedStrings.xml');
  if (!doc) return [];
  return Array.from(doc.getElementsByTagName('si')).map((si) =>
    Array.from(si.getElementsByTagName('t'))
      .map((t) => t.textContent ?? '')
      .join(''),
  );
}

function firstWorksheetPath(files: Record<string, Uint8Array>, report: ImportReport): string {
  const workbook = parseXml(files, 'xl/workbook.xml');
  const sheets = workbook ? Array.from(workbook.getElementsByTagName('sheet')) : [];
  if (sheets.length > 1) {
    report.lossy('Sheets', `only the first of ${sheets.length} worksheets imported`);
  }
  const rid = sheets[0]?.getAttribute('r:id');
  const rels = parseXml(files, 'xl/_rels/workbook.xml.rels');
  if (rels && rid) {
    for (const rel of Array.from(rels.getElementsByTagName('Relationship'))) {
      if (rel.getAttribute('Id') === rid) {
        const target = rel.getAttribute('Target') ?? '';
        const clean = target.replace(/^\//, '');
        return clean.startsWith('xl/') ? clean : `xl/${clean}`;
      }
    }
  }
  return 'xl/worksheets/sheet1.xml';
}

function cellRaw(c: Element, strings: string[]): string {
  const formula = c.getElementsByTagName('f')[0];
  if (formula) return `=${formula.textContent ?? ''}`;
  const type = c.getAttribute('t');
  if (type === 'inlineStr') {
    return Array.from(c.getElementsByTagName('t'))
      .map((t) => t.textContent ?? '')
      .join('');
  }
  const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
  if (type === 's') return strings[Number(v)] ?? '';
  return v; // number, boolean, or 'str' cached value
}

export function xlsxToCells(bytes: Uint8Array): { cells: string[][]; report: ImportReport } {
  const report = createImportReport();
  const files = unzip(bytes);
  const strings = sharedStrings(files);
  const sheet = parseXml(files, firstWorksheetPath(files, report));
  if (!sheet) throw new Error('Not an .xlsx: missing worksheet');

  if (sheet.getElementsByTagName('mergeCell').length > 0) {
    report.lossy('Merged cells', 'merged cells imported as individual cells');
  }
  if (files['xl/styles.xml'] && sheet.querySelector('c[s]')) {
    report.lossy('Formatting', 'cell styles and number formats dropped');
  }

  const parsed: { row: number; col: number; raw: string }[] = [];
  let maxRow = 0;
  let maxCol = 0;
  for (const c of Array.from(sheet.getElementsByTagName('c'))) {
    const ref = c.getAttribute('r');
    if (!ref) continue;
    const { row, col } = refToRowCol(ref);
    const raw = cellRaw(c, strings);
    if (raw === '') continue;
    parsed.push({ row, col, raw });
    maxRow = Math.max(maxRow, row);
    maxCol = Math.max(maxCol, col);
  }

  const cells: string[][] = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => ''),
  );
  for (const { row, col, raw } of parsed) cells[row]![col] = raw;
  return { cells, report };
}

// --- public app API ---

export function importXlsx(bytes: Uint8Array): { cells: string[][]; report: ImportReport } {
  return xlsxToCells(bytes);
}

export function exportXlsx(cells: string[][]): Uint8Array {
  return cellsToXlsx(cells);
}
