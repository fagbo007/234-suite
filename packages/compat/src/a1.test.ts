import { describe, expect, it } from 'vitest';
import { refToRowCol, rowColToRef } from './a1';

describe('xlsx A1 helpers', () => {
  it('parses references to 0-based row/col', () => {
    expect(refToRowCol('A1')).toEqual({ row: 0, col: 0 });
    expect(refToRowCol('B3')).toEqual({ row: 2, col: 1 });
    expect(refToRowCol('AA10')).toEqual({ row: 9, col: 26 });
  });

  it('round-trips row/col → ref → row/col', () => {
    for (const [row, col] of [[0, 0], [2, 1], [9, 26], [99, 701]] as const) {
      const ref = rowColToRef(row, col);
      expect(refToRowCol(ref)).toEqual({ row, col });
    }
  });
});
