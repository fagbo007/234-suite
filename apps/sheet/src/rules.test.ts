import { SheetEngine } from '@234/formula-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { matchesPredicate } from './rules';

let engine: SheetEngine | null = null;
afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('matchesPredicate', () => {
  it('evaluates a comparison against the cell value', () => {
    engine = new SheetEngine();
    expect(matchesPredicate(engine, 'value > 10', 15)).toBe(true);
    expect(matchesPredicate(engine, 'value > 10', 5)).toBe(false);
    expect(matchesPredicate(engine, 'value >= 5', 5)).toBe(true);
  });

  it('resolves a reference in the predicate', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '100'); // A1
    expect(matchesPredicate(engine, 'value >= A1', 120)).toBe(true);
    expect(matchesPredicate(engine, 'value >= A1', 90)).toBe(false);
  });

  it('supports compound predicates (AND/OR)', () => {
    engine = new SheetEngine();
    expect(matchesPredicate(engine, 'AND(value > 1, value < 5)', 3)).toBe(true);
    expect(matchesPredicate(engine, 'AND(value > 1, value < 5)', 9)).toBe(false);
    expect(matchesPredicate(engine, 'value = 0', 0)).toBe(true);
  });

  it('treats an empty or invalid predicate as no match', () => {
    engine = new SheetEngine();
    expect(matchesPredicate(engine, '', 5)).toBe(false);
    expect(matchesPredicate(engine, 'NOPE(value)', 5)).toBe(false); // #NAME? → false
    expect(matchesPredicate(engine, 'value >', 5)).toBe(false); // parse error → false
  });
});
