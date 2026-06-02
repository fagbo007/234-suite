import { describe, expect, it } from 'vitest';
import { A1_WARNING, lintFormula } from './lint';

describe('lintFormula', () => {
  it('warns when a formula uses raw A1 references', () => {
    const warnings = lintFormula('=SUM(A1:A10)');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toBe(A1_WARNING);
    expect(warnings[0]?.refs).toContain('A1');
  });

  it('is silent for named references', () => {
    expect(lintFormula('=SUM(revenue)')).toEqual([]);
  });
});
