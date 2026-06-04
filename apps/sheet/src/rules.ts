import { type SheetEngine } from '@234/formula-engine';

/**
 * Formula predicates shared by conditional formatting and data validation. A
 * rule is a formula that uses the keyword **`value`** for the cell under test,
 * e.g. `value > 10`, `value >= A1`, `AND(value > 1, value < 5)`. The engine now
 * has comparisons + IF, so predicates are real formulas (root §2.2). Booleans
 * are numeric (TRUE = 1) — a nonzero result means the predicate matches.
 *
 * `value` is reserved; it is substituted with the cell's number before
 * evaluation. Only visible cells are evaluated (see Grid), so this stays cheap.
 */
export function matchesPredicate(engine: SheetEngine, predicate: string, value: number): boolean {
  const expr = predicate.trim().replace(/^=/, '');
  if (expr === '') return false;
  const substituted = expr.replace(/\bvalue\b/gi, `(${value})`);
  const result = engine.evaluate(substituted);
  return typeof result === 'number' && result !== 0;
}
