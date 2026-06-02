import { bench, describe } from 'vitest';
import { DEFAULT_DIMENSIONS, getVisibleRange, materializeRows, totalHeight } from './model';

describe('Sheet virtualization', () => {
  const dims = DEFAULT_DIMENSIONS;
  const viewport = 600;
  const read = (row: number, col: number) => ((row + col) % 7 === 0 ? String(row) : '');
  const maxScroll = totalHeight(dims) - viewport;
  let frame = 0;

  bench('visible window + materialize (100k rows)', () => {
    const scrollTop = (maxScroll * (frame++ % 1000)) / 1000;
    const range = getVisibleRange(scrollTop, viewport, dims);
    materializeRows(range, dims, read);
  });
});
