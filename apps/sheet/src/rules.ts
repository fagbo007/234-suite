/**
 * Comparison rules shared by conditional formatting and data validation. The
 * Phase 2 evaluator has no comparison/IF operators yet, so rules are an operator
 * + a numeric threshold (the threshold may be entered as a number or a
 * single named/A1 reference, resolved by the engine).
 */
export type ComparisonOp = '>' | '>=' | '<' | '<=' | '=' | '!=';

export const COMPARISON_OPS: ComparisonOp[] = ['>', '>=', '<', '<=', '=', '!='];

export function compare(value: number, op: ComparisonOp, threshold: number): boolean {
  switch (op) {
    case '>':
      return value > threshold;
    case '>=':
      return value >= threshold;
    case '<':
      return value < threshold;
    case '<=':
      return value <= threshold;
    case '=':
      return value === threshold;
    case '!=':
      return value !== threshold;
  }
}
