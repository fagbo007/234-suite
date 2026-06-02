import { type CellCoord } from './a1';

/**
 * Named-reference registry: `name → {sheet,row,col}`.
 *
 * Names are the default, encouraged reference path (root CLAUDE.md Section 3.4).
 * Coordinates are stored structurally — **never as A1 strings** — and shift on
 * row/column insertion so references stay stable across structural edits (the
 * fix for "inserting a column breaks formula references silently").
 */
export class NamedReferenceRegistry {
  private readonly byName = new Map<string, CellCoord>();

  register(name: string, coord: CellCoord): void {
    this.byName.set(name, { ...coord });
  }

  resolve(name: string): CellCoord | undefined {
    const coord = this.byName.get(name);
    return coord ? { ...coord } : undefined;
  }

  rename(oldName: string, newName: string): void {
    const coord = this.byName.get(oldName);
    if (!coord) throw new Error(`Unknown reference: ${oldName}`);
    this.byName.delete(oldName);
    this.byName.set(newName, coord);
  }

  remove(name: string): void {
    this.byName.delete(name);
  }

  getName(coord: CellCoord): string | undefined {
    for (const [name, c] of this.byName) {
      if (c.sheet === coord.sheet && c.row === coord.row && c.col === coord.col) return name;
    }
    return undefined;
  }

  names(): string[] {
    return [...this.byName.keys()];
  }

  /** Shift stored coordinates when `count` rows are inserted at `atRow`. */
  onInsertRows(sheet: number, atRow: number, count = 1): void {
    for (const coord of this.byName.values()) {
      if (coord.sheet === sheet && coord.row >= atRow) coord.row += count;
    }
  }

  /** Shift stored coordinates when `count` columns are inserted at `atCol`. */
  onInsertColumns(sheet: number, atCol: number, count = 1): void {
    for (const coord of this.byName.values()) {
      if (coord.sheet === sheet && coord.col >= atCol) coord.col += count;
    }
  }
}
