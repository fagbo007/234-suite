import { describe, expect, it } from 'vitest';
import { a1ToCell, cellToA1, colToLabel, findA1References, isA1Reference, labelToCol } from './a1';

describe('column labels', () => {
  it('converts indices to labels', () => {
    expect(colToLabel(0)).toBe('A');
    expect(colToLabel(25)).toBe('Z');
    expect(colToLabel(26)).toBe('AA');
    expect(colToLabel(701)).toBe('ZZ');
    expect(colToLabel(702)).toBe('AAA');
  });

  it('round-trips labels and indices', () => {
    for (const col of [0, 1, 25, 26, 27, 701, 702, 1000]) {
      expect(labelToCol(colToLabel(col))).toBe(col);
    }
  });
});

describe('A1 cell conversion', () => {
  it('converts coordinates to A1', () => {
    expect(cellToA1({ row: 0, col: 0 })).toBe('A1');
    expect(cellToA1({ row: 9, col: 1 })).toBe('B10');
  });

  it('parses A1 to coordinates', () => {
    expect(a1ToCell('A1')).toEqual({ sheet: 0, row: 0, col: 0 });
    expect(a1ToCell('B10')).toEqual({ sheet: 0, row: 9, col: 1 });
  });
});

describe('A1 detection', () => {
  it('detects single references', () => {
    expect(isA1Reference('B3')).toBe(true);
    expect(isA1Reference('total')).toBe(false);
  });

  it('finds references inside a formula', () => {
    expect(findA1References('=SUM(A1:A3)+B2')).toEqual(['A1', 'A3', 'B2']);
    expect(findA1References('=SUM(revenue)')).toEqual([]);
  });
});
