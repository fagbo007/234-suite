import { describe, expect, it } from 'vitest';
import { constraintCheck } from './constraints';

describe('constraintCheck (Phase 1 stub)', () => {
  it('returns true for any object set', () => {
    expect(constraintCheck([])).toBe(true);
    expect(
      constraintCheck([{ id: 'r', kind: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'black' }]),
    ).toBe(true);
  });
});
