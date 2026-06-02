import { describe, expect, it } from 'vitest';
import { NamedReferenceRegistry, SheetEngine, cellToA1, lintFormula } from './index';

describe('@234/formula-engine public API', () => {
  it('exposes the A1 utilities, registry, lint, and engine', () => {
    expect(cellToA1({ row: 0, col: 0 })).toBe('A1');
    expect(typeof NamedReferenceRegistry).toBe('function');
    expect(typeof SheetEngine).toBe('function');
    expect(lintFormula('=A1')).toHaveLength(1);
  });
});
