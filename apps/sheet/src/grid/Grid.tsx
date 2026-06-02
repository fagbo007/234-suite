import { colToLabel, type SheetEngine } from '@234/formula-engine';
import { useMemo, useState } from 'react';
import { DEFAULT_DIMENSIONS, getVisibleRange, materializeRows, totalHeight } from './model';
import styles from './Grid.module.css';

const VIEWPORT_HEIGHT = 480;
const GUTTER_WIDTH = 56;
const dims = DEFAULT_DIMENSIONS;
const contentWidth = GUTTER_WIDTH + dims.cols * dims.colWidth;

export interface GridProps {
  engine: SheetEngine;
  active: { row: number; col: number };
  onSelect: (row: number, col: number) => void;
  /** Bumping this re-reads cell values after edits/recalculation. */
  revision: number;
}

export function Grid({ engine, active, onSelect, revision }: GridProps) {
  const [scrollTop, setScrollTop] = useState(0);

  // Computed inline each render (cheap — see grid.perf.test.ts). A change to the
  // `revision` prop re-renders the grid, re-reading values after edits/recalc.
  const range = getVisibleRange(scrollTop, VIEWPORT_HEIGHT, dims);
  const read = (row: number, col: number) => {
    const value = engine.getValue(row, col);
    return value === null ? '' : String(value);
  };
  const visibleRows = materializeRows(range, dims, read);

  const columns = useMemo(() => Array.from({ length: dims.cols }, (_, c) => colToLabel(c)), []);

  return (
    <div
      className={styles.scroll}
      style={{ height: VIEWPORT_HEIGHT }}
      role="grid"
      aria-rowcount={dims.rows}
      aria-colcount={dims.cols}
      data-revision={revision}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className={styles.header} style={{ width: contentWidth }}>
        <div className={styles.corner} style={{ width: GUTTER_WIDTH }} />
        {columns.map((label, col) => (
          <div
            key={col}
            role="columnheader"
            className={styles.colHead}
            style={{ width: dims.colWidth }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className={styles.body} style={{ height: totalHeight(dims), width: contentWidth }}>
        {visibleRows.map((vm) => (
          <div
            key={vm.row}
            role="row"
            className={styles.row}
            style={{ top: vm.row * dims.rowHeight, height: dims.rowHeight }}
          >
            <div className={styles.gutter} style={{ width: GUTTER_WIDTH }}>
              {vm.row + 1}
            </div>
            {vm.cells.map((cell) => {
              const isActive = active.row === vm.row && active.col === cell.col;
              return (
                <div
                  key={cell.col}
                  role="gridcell"
                  aria-label={`${columns[cell.col] ?? ''}${vm.row + 1}`}
                  aria-selected={isActive}
                  className={isActive ? `${styles.cell} ${styles.active}` : styles.cell}
                  style={{ width: dims.colWidth }}
                  onMouseDown={() => onSelect(vm.row, cell.col)}
                >
                  {cell.value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
