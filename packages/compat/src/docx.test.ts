import { describe, expect, it } from 'vitest';
import { blocksToDocx, docxToBlocks, exportDocx, importDocx } from './docx';
import { type DocBlock } from './blocks';
import { decodeText, encodeText, unzip, zip } from './zip';

describe('.docx round-trip', () => {
  it('preserves headings and bold/italic through export → import', () => {
    const md = '# Title\n\nPlain and **bold** and *em*\n\n## Section';
    const round = importDocx(exportDocx(md));
    expect(round.markdown).toBe(md);
    expect(round.report.ok).toBe(true);
  });

  it('writes a valid OOXML package (Content_Types + document.xml)', () => {
    const blocks: DocBlock[] = [{ kind: 'heading', level: 1, runs: [{ text: 'Hi' }] }];
    const files = unzip(blocksToDocx(blocks));
    expect(files['[Content_Types].xml']).toBeTruthy();
    expect(decodeText(files['word/document.xml']!)).toContain('<w:pStyle w:val="Heading1"/>');
  });

  it('extracts content but reports a table as a fidelity loss', () => {
    const document = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>Before</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
</w:body></w:document>`;
    const bytes = zip({ 'word/document.xml': encodeText(document) });
    const { blocks, report } = docxToBlocks(bytes);
    // Content preserved (cell text still imported), never silently dropped.
    expect(blocks.some((b) => b.runs.some((r) => r.text === 'Cell'))).toBe(true);
    expect(report.ok).toBe(false);
    expect(report.losses.some((l) => l.feature === 'Tables')).toBe(true);
  });
});
