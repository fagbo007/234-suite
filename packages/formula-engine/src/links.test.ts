import { describe, expect, it } from 'vitest';
import { findExternalReferences } from './links';

describe('findExternalReferences', () => {
  it('finds none in a plain formula', () => {
    expect(findExternalReferences('=SUM(A1:A3)+total')).toEqual([]);
  });

  it('detects a URL', () => {
    expect(findExternalReferences('=HYPERLINK("https://example.com/x")')).toContain(
      'https://example.com/x',
    );
  });

  it('detects a bracketed workbook reference', () => {
    expect(findExternalReferences('=A1+[Book.xlsx]Sheet1!B2')).toContain('[Book.xlsx]Sheet1!B2');
  });

  it('detects a cross-sheet reference', () => {
    expect(findExternalReferences('=Sheet2!A1')).toContain('Sheet2!A1');
  });
});
