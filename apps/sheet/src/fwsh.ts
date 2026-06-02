import { type SheetEngine } from '@234/formula-engine';

/**
 * `.fwsh` = CSV of the used range (raw cell contents) + a sidecar `.fwsh.meta`
 * JSON holding the column schema and named ranges (root CLAUDE.md Section 7).
 * Raw contents are stored (formulas as text), so the file is human-readable and
 * re-evaluatable. Column types are declared explicitly — there is no automatic
 * date coercion (Section 2.2); the full date-column UI is Phase 2.
 */

export type ColumnType = 'text' | 'number' | 'date';

export interface ColumnSchema {
  index: number;
  type: ColumnType;
}

export interface FwshMeta {
  columns: ColumnSchema[];
  namedRanges: Record<string, string>;
}

export interface FwshDocument {
  csv: string;
  meta: FwshMeta;
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialise the engine's used range to `.fwsh` (CSV + meta). */
export function serializeFwsh(engine: SheetEngine, meta: FwshMeta): FwshDocument {
  const { rows, cols } = engine.usedRange();
  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    const cells: string[] = [];
    for (let col = 0; col < cols; col++) {
      cells.push(csvEscape(engine.getRaw(row, col)));
    }
    lines.push(cells.join(','));
  }
  return { csv: lines.join('\n'), meta };
}

/** Parse `.fwsh` CSV into a 2D array of raw cell contents. */
export function parseFwshCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Load parsed raw cells into an engine. */
export function applyCells(engine: SheetEngine, cells: string[][]): void {
  for (let row = 0; row < cells.length; row++) {
    const line = cells[row] ?? [];
    for (let col = 0; col < line.length; col++) {
      const raw = line[col] ?? '';
      if (raw !== '') engine.setCell(row, col, raw);
    }
  }
}
