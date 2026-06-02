import { evaluateFormula } from './formula';

export interface UsedRange {
  rows: number;
  cols: number;
}

export type CellValue = string | number | boolean | null;

const ERROR_CODE = /^#.*[!?]$/;

/**
 * In-house, MIT-licensed spreadsheet engine. Stores raw cell contents and
 * evaluates formulas lazily via `formula.ts`. Replaces HyperFormula (GPLv3) so
 * the suite stays cleanly MIT (see docs/architecture/formula-refs.md §6).
 *
 * A1 references inside formulas are the evaluation boundary and stay hidden
 * behind this engine + the translation layer (root CLAUDE.md §3.4). Phase 1
 * scope: arithmetic + SUM/AVERAGE/COUNT.
 */
export class SheetEngine {
  private readonly cells = new Map<string, string>();

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

  /** Clears all cells. (No external resource to release — kept for API parity.) */
  destroy(): void {
    this.cells.clear();
  }

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
      return evaluateFormula(raw.slice(1), (r, c) => this.computeNumeric(r, c, visiting));
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
