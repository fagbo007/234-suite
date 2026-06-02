import { describe, expect, it } from 'vitest';
import { DEFAULT_DIMENSIONS, getVisibleRange, materializeRows, totalHeight } from './model';

// Section 8 gate: a 100,000-row sheet must scroll at 60fps. Real paint FPS
// cannot be measured in jsdom (no compositor/raf), so we gate on the
// virtualization cost we control: computing the visible window + materialising
// its row view-models for every frame of a full scroll over 100k rows. The
// per-frame budget for 60fps is ~16ms; this must be comfortably under it.
// In-browser scroll FPS is validated once the Tauri window exists.
describe('Sheet 100k-row virtualization (Section 8 gate)', () => {
  it('computes visible windows across 100k rows well within the 60fps budget', () => {
    const dims = DEFAULT_DIMENSIONS;
    const viewport = 600;
    const read = (row: number, col: number) => ((row + col) % 7 === 0 ? String(row) : '');
    const maxScroll = totalHeight(dims) - viewport;
    const frames = 2000;

    const start = performance.now();
    for (let i = 0; i < frames; i++) {
      const scrollTop = Math.floor((maxScroll * i) / frames);
      const range = getVisibleRange(scrollTop, viewport, dims);
      materializeRows(range, dims, read);
    }
    const perFrame = (performance.now() - start) / frames;

    expect(perFrame).toBeLessThan(16);
  });
});
