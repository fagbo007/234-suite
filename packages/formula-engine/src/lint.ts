import { findA1References } from './a1';

export const A1_WARNING = 'Consider using a named reference for better stability.';

export interface LintWarning {
  kind: 'a1-reference';
  message: string;
  refs: string[];
}

/**
 * Lint a user-entered formula. Raw A1 references are permitted but discouraged,
 * so they surface a warning (root CLAUDE.md Section 3.4). A1 is display-layer
 * only — it is never stored in the translation layer.
 */
export function lintFormula(formula: string): LintWarning[] {
  const refs = findA1References(formula);
  if (refs.length === 0) return [];
  return [{ kind: 'a1-reference', message: A1_WARNING, refs }];
}
