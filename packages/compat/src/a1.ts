/**
 * Tiny A1 cell-reference helpers for the .xlsx reader/writer. Kept local so
 * @234/compat stays self-contained (no formula-engine dependency). 0-based
 * row/col internally; A1 is 1-based row + letter column.
 */

/** `'B3'` → `{ row: 2, col: 1 }` (0-based). */
export function refToRowCol(ref: string): { row: number; col: number } {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  const letters = match[1]!.toUpperCase();
  let col = 0;
  for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(match[2]) - 1, col: col - 1 };
}

/** `{ row: 2, col: 1 }` → `'B3'`. */
export function rowColToRef(row: number, col: number): string {
  let n = col + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row + 1}`;
}
