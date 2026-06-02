import { describe, expect, it } from 'vitest';
import { compare } from './rules';

describe('compare', () => {
  it('evaluates each operator', () => {
    expect(compare(10, '>', 5)).toBe(true);
    expect(compare(10, '>=', 10)).toBe(true);
    expect(compare(4, '<', 5)).toBe(true);
    expect(compare(5, '<=', 5)).toBe(true);
    expect(compare(5, '=', 5)).toBe(true);
    expect(compare(5, '!=', 6)).toBe(true);
    expect(compare(5, '>', 5)).toBe(false);
  });
});
