/**
 * External-reference scanner (fixes Excel's "ghost external links" pain, root
 * §2.2). In our single-sheet model an *external reference* is a formula token
 * that points outside this document:
 *   - a URL                 `https://example.com/...`
 *   - a bracketed workbook  `[Book.xlsx]Sheet1!A1`
 *   - a cross-sheet ref     `Sheet2!A1`
 * The auditor surfaces these so they are never invisible.
 */

const PATTERNS: RegExp[] = [
  /https?:\/\/[^\s,()"']+/gi, // URL
  /\[[^\]]+\][^\s,()]*/g, // [Book.xlsx]Sheet1!A1
  /\b[A-Za-z_][A-Za-z0-9_]*![A-Za-z]+[0-9]+/g, // Sheet2!A1
];

/** Find external-reference tokens in a formula. Returns a deduped list. */
export function findExternalReferences(formula: string): string[] {
  const found = new Set<string>();
  for (const pattern of PATTERNS) {
    const matches = formula.match(pattern);
    if (matches) for (const match of matches) found.add(match);
  }
  return [...found];
}
