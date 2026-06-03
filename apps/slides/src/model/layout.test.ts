import { describe, expect, it } from 'vitest';
import { CANVAS, snapPosition, snapToGrid } from './layout';

describe('snapToGrid', () => {
  it('rounds to the nearest grid step', () => {
    expect(snapToGrid(2)).toBe(0);
    expect(snapToGrid(13)).toBe(16);
    expect(snapToGrid(20)).toBe(24);
  });
});

describe('snapPosition', () => {
  it('snaps an object near the canvas edge to it', () => {
    const result = snapPosition({ x: 3, y: 100, width: 100, height: 40 }, []);
    expect(result.x).toBe(0); // left edge → canvas left
    expect(result.guides).toContainEqual({ axis: 'x', position: 0 });
  });

  it("snaps to a neighbour's edge within threshold", () => {
    const other = { x: 100, y: 0, width: 50, height: 50 }; // right edge at 150
    const result = snapPosition({ x: 148, y: 200, width: 40, height: 40 }, [other]);
    expect(result.x).toBe(150); // object's left edge aligns to neighbour's right edge
  });

  it('falls back to the grid when nothing is near', () => {
    const result = snapPosition({ x: 301, y: 205, width: 40, height: 40 }, []);
    expect(result.x % 8).toBe(0);
    expect(result.y % 8).toBe(0);
  });

  it('exposes canvas dimensions', () => {
    expect(CANVAS).toEqual({ width: 960, height: 540 });
  });
});
