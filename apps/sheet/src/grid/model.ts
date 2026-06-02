/**
 * Virtual grid model. Pure windowing math + row materialisation so 100k rows
 * scroll without rendering every row (root CLAUDE.md Section 8). No DOM here —
 * the React `Grid` consumes these functions.
 */

export interface GridDimensions {
  rows: number;
  cols: number;
  rowHeight: number;
  colWidth: number;
}

export const DEFAULT_DIMENSIONS: GridDimensions = {
  rows: 100_000,
  cols: 26,
  rowHeight: 28,
  colWidth: 96,
};

export interface VisibleRange {
  startRow: number;
  endRow: number;
}

/** The slice of rows that should be rendered for a given scroll position. */
export function getVisibleRange(
  scrollTop: number,
  viewportHeight: number,
  dims: GridDimensions,
  overscan = 6,
): VisibleRange {
  const first = Math.floor(scrollTop / dims.rowHeight);
  const last = Math.ceil((scrollTop + viewportHeight) / dims.rowHeight);
  return {
    startRow: Math.max(0, first - overscan),
    endRow: Math.min(dims.rows - 1, last + overscan),
  };
}

export interface CellVM {
  col: number;
  value: string;
}
export interface RowVM {
  row: number;
  cells: CellVM[];
}

/** Build view-models for the visible rows by reading display strings. */
export function materializeRows(
  range: VisibleRange,
  dims: GridDimensions,
  read: (row: number, col: number) => string,
): RowVM[] {
  const out: RowVM[] = [];
  for (let row = range.startRow; row <= range.endRow; row++) {
    const cells: CellVM[] = [];
    for (let col = 0; col < dims.cols; col++) {
      cells.push({ col, value: read(row, col) });
    }
    out.push({ row, cells });
  }
  return out;
}

export function totalHeight(dims: GridDimensions): number {
  return dims.rows * dims.rowHeight;
}
