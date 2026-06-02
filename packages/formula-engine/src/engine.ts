import { a1ToCell } from './a1';
import { evaluateFormula } from './formula';
import { findExternalReferences } from './links';
import { NamedReferenceRegistry } from './namedRefs';

export interface UsedRange {
  rows: number;
  cols: number;
}

export interface ExternalLink {
  row: number;
  col: number;
  refs: string[];
}

export interface NamedCell {
  row: number;
  col: number;
}

export type CellValue = string | number | boolean | null;

const ERROR_CODE = /^#.*[!?]$/;
const SHEET = 0;

/**
 * In-house, MIT-licensed spreadsheet engine. Stores raw cell contents and
 * evaluates formulas lazily via `formula.ts`. Replaces HyperFormula (GPLv3) so
 * the suite stays cleanly MIT (see docs/architecture/formula-refs.md §6).
 *
 * Formulas may reference cells by **named reference** (resolved via the
 * translation-layer registry) or by A1 (the evaluation boundary). The registry
 * stores coordinates — never raw A1 (root CLAUDE.md §3.4, §16). Phase 1 scope:
 * arithmetic + SUM/AVERAGE/COUNT.
 */
export class SheetEngine {
  private cells = new Map<string, string>();
  private readonly registry = new NamedReferenceRegistry();

  private key(row: number, col: number): string {
    return `${row},${col}`;
  }

  setCell(row: number, col: number, raw: string): void {
    const key = this.key(row, col);
    if (raw === '') this.cells.delete(key);
    else this.cells.set(key, raw);
  }

  getRaw(row: number, col: number): string {
    return this.cells.get(this.key(row, col)) ?? '';
  }

  getValue(row: number, col: number): CellValue {
    return this.compute(row, col, new Set());
  }

  usedRange(): UsedRange {
    let rows = 0;
    let cols = 0;
    for (const key of this.cells.keys()) {
      const [r, c] = key.split(',').map(Number) as [number, number];
      rows = Math.max(rows, r + 1);
      cols = Math.max(cols, c + 1);
    }
    return { rows, cols };
  }

  // --- Named references (translation layer) ---

  defineName(name: string, row: number, col: number): void {
    this.registry.register(name, { sheet: SHEET, row, col });
  }

  removeName(name: string): void {
    this.registry.remove(name);
  }

  names(): string[] {
    return this.registry.names();
  }

  nameAt(row: number, col: number): string | undefined {
    return this.registry.getName({ sheet: SHEET, row, col });
  }

  coordOf(name: string): NamedCell | undefined {
    const coord = this.registry.resolve(name);
    return coord ? { row: coord.row, col: coord.col } : undefined;
  }

  /** Export named references as coordinates (for `.fwsh.meta` — never A1). */
  exportNames(): Record<string, NamedCell> {
    const out: Record<string, NamedCell> = {};
    for (const name of this.registry.names()) {
      const coord = this.registry.resolve(name);
      if (coord) out[name] = { row: coord.row, col: coord.col };
    }
    return out;
  }

  /** Surface external references (URLs / workbook / cross-sheet) per cell (§2.2). */
  auditExternalLinks(): ExternalLink[] {
    const links: ExternalLink[] = [];
    for (const [key, raw] of this.cells) {
      if (!raw.startsWith('=')) continue;
      const refs = findExternalReferences(raw);
      if (refs.length === 0) continue;
      const [row, col] = key.split(',').map(Number) as [number, number];
      links.push({ row, col, refs });
    }
    links.sort((a, b) => a.row - b.row || a.col - b.col);
    return links;
  }

  // --- Structural edits (preserve named-reference integrity) ---

  /** Insert a row at `at`: shift cell contents down and shift named refs. */
  insertRow(at: number): void {
    this.cells = this.shiftCells((r) => (r >= at ? r + 1 : r), (c) => c);
    this.registry.onInsertRows(SHEET, at, 1);
  }

  /** Insert a column at `at`: shift cell contents right and shift named refs. */
  insertColumn(at: number): void {
    this.cells = this.shiftCells((r) => r, (c) => (c >= at ? c + 1 : c));
    this.registry.onInsertColumns(SHEET, at, 1);
  }

  private shiftCells(
    mapRow: (row: number) => number,
    mapCol: (col: number) => number,
  ): Map<string, string> {
    const next = new Map<string, string>();
    for (const [key, raw] of this.cells) {
      const [r, c] = key.split(',').map(Number) as [number, number];
      next.set(this.key(mapRow(r), mapCol(c)), raw);
    }
    return next;
  }

  /** Clears cells and named references. */
  destroy(): void {
    this.cells.clear();
    for (const name of this.registry.names()) this.registry.remove(name);
  }

  private resolveRef = (ref: string): [number, number] => {
    const named = this.registry.resolve(ref);
    if (named) return [named.row, named.col];
    try {
      const { row, col } = a1ToCell(ref);
      return [row, col];
    } catch {
      throw new Error('#NAME?'); // unknown name and not A1
    }
  };

  private compute(row: number, col: number, visiting: Set<string>): CellValue {
    const raw = this.getRaw(row, col);
    if (raw === '') return null;
    if (!raw.startsWith('=')) {
      const n = Number(raw);
      return raw.trim() !== '' && Number.isFinite(n) ? n : raw;
    }

    const key = this.key(row, col);
    if (visiting.has(key)) return '#CYCLE!';
    visiting.add(key);
    try {
      return evaluateFormula(
        raw.slice(1),
        (r, c) => this.computeNumeric(r, c, visiting),
        this.resolveRef,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      return ERROR_CODE.test(message) ? message : '#ERROR!';
    } finally {
      visiting.delete(key);
    }
  }

  private computeNumeric(row: number, col: number, visiting: Set<string>): number | null {
    const value = this.compute(row, col, visiting);
    if (value === null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (ERROR_CODE.test(value)) throw new Error(value); // propagate the error code
    const n = Number(value);
    if (value.trim() !== '' && Number.isFinite(n)) return n;
    throw new Error('#VALUE!');
  }
}
