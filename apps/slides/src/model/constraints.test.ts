import { describe, expect, it } from 'vitest';
import { constraintCheck, findViolations } from './constraints';
import { type SlideObject } from './types';

function rect(id: string, x: number, y: number): SlideObject {
  return { id, kind: 'rect', x, y, width: 100, height: 40, fill: 'black' };
}

describe('constraintCheck', () => {
  it('passes when objects are in-canvas and non-overlapping', () => {
    expect(constraintCheck([])).toBe(true);
    expect(constraintCheck([rect('a', 0, 0), rect('b', 0, 100)])).toBe(true);
  });

  it('flags overlapping objects', () => {
    const violations = findViolations([rect('a', 0, 0), rect('b', 20, 10)]);
    expect(violations).toContainEqual({ kind: 'overlap', objectIds: ['a', 'b'] });
    expect(constraintCheck([rect('a', 0, 0), rect('b', 20, 10)])).toBe(false);
  });

  it('flags objects outside the canvas', () => {
    const violations = findViolations([rect('x', -20, 0)]);
    expect(violations).toContainEqual({ kind: 'off-canvas', objectIds: ['x'] });
  });
});
