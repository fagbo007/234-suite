/**
 * Pure A1-notation utilities.
 *
 * A1 is a DISPLAY / evaluation-boundary concern only. The translation layer and
 * storage never persist A1 strings — they hold `CellCoord` coordinates or names
 * (root CLAUDE.md Section 3.4, Section 16).
 */

export interface CellCoord {
  sheet: number;
  row: number;
  col: number;
}

/** Convert a 0-based column index to a label (0 → A, 25 → Z, 26 → AA). */
export function colToLabel(col: number): string {
  if (col < 0 || !Number.isInteger(col)) throw new Error(`Invalid column index: ${col}`);
  let label = '';
  let n = col;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/** Convert a column label to a 0-based index (A → 0, Z → 25, AA → 26). */
export function labelToCol(label: string): number {
  const upper = label.toUpperCase();
  if (upper.length === 0) throw new Error('Empty column label');
  let col = 0;
  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i) - 64; // 'A' === 1
    if (code < 1 || code > 26) throw new Error(`Invalid column label: ${label}`);
    col = col * 26 + code;
  }
  return col - 1;
}

const A1_CELL = /^([A-Za-z]+)([0-9]+)$/;
const A1_TOKEN = /\b[A-Za-z]{1,3}[0-9]{1,7}\b/g;

/** `{row,col}` → A1 (0-based row/col; row 0 → "1"). */
export function cellToA1(coord: { row: number; col: number }): string {
  return `${colToLabel(coord.col)}${coord.row + 1}`;
}

/** A1 → `CellCoord` (0-based). */
export function a1ToCell(ref: string, sheet = 0): CellCoord {
  const match = A1_CELL.exec(ref.trim());
  if (!match) throw new Error(`Invalid A1 reference: ${ref}`);
  return { sheet, col: labelToCol(match[1]!), row: Number(match[2]!) - 1 };
}

/** True if a single token is an A1 cell reference (e.g. "B3"). */
export function isA1Reference(token: string): boolean {
  return A1_CELL.test(token.trim());
}

/** Find A1-style reference tokens inside a formula string. */
export function findA1References(formula: string): string[] {
  return formula.match(A1_TOKEN) ?? [];
}
