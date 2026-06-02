import { describe, expect, it } from 'vitest';
import { DEFAULT_DIMENSIONS, getVisibleRange, materializeRows, totalHeight } from './model';

describe('getVisibleRange', () => {
  it('windows to the visible slice with overscan', () => {
    const range = getVisibleRange(0, 480, DEFAULT_DIMENSIONS, 2);
    expect(range.startRow).toBe(0);
    // 480 / 28 ≈ 18 rows + 2 overscan
    expect(range.endRow).toBeGreaterThanOrEqual(18);
    expect(range.endRow).toBeLessThan(40);
  });

  it('clamps to the grid bounds at the bottom', () => {
    const dims = DEFAULT_DIMENSIONS;
    const bottom = totalHeight(dims) - 480;
    const range = getVisibleRange(bottom, 480, dims);
    expect(range.endRow).toBe(dims.rows - 1);
  });
});

describe('materializeRows', () => {
  it('builds a view-model per visible row and column', () => {
    const dims = { ...DEFAULT_DIMENSIONS, cols: 3 };
    const rows = materializeRows({ startRow: 0, endRow: 1 }, dims, (r, c) => `${r}:${c}`);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.cells).toHaveLength(3);
    expect(rows[1]?.cells[2]?.value).toBe('1:2');
  });
});
