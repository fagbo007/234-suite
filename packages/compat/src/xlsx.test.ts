import { describe, expect, it } from 'vitest';
import { exportXlsx, importXlsx, xlsxToCells } from './xlsx';
import { encodeText, zip } from './zip';

describe('.xlsx round-trip', () => {
  it('preserves numbers, strings, and formulas through export → import', () => {
    const cells = [
      ['10', 'Revenue'],
      ['20', '=SUM(A1:A2)'],
    ];
    const { cells: round, report } = importXlsx(exportXlsx(cells));
    expect(round).toEqual(cells);
    expect(report.ok).toBe(true);
  });

  it('reads shared strings and reports a second worksheet as a loss', () => {
    const workbook = `<?xml version="1.0"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="One" sheetId="1" r:id="rId1"/><sheet name="Two" sheetId="2" r:id="rId2"/></sheets></workbook>`;
    const rels = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>`;
    const shared = `<?xml version="1.0"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Hello</t></si></sst>`;
    const sheet = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>`;
    const bytes = zip({
      'xl/workbook.xml': encodeText(workbook),
      'xl/_rels/workbook.xml.rels': encodeText(rels),
      'xl/sharedStrings.xml': encodeText(shared),
      'xl/worksheets/sheet1.xml': encodeText(sheet),
    });

    const { cells, report } = xlsxToCells(bytes);
    expect(cells[0]![0]).toBe('Hello');
    expect(report.losses.some((l) => l.feature === 'Sheets')).toBe(true);
  });
});
