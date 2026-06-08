import { colToLabel, type SheetEngine } from '@234/formula-engine';
import { type PresencePeer } from '@234/collab';
import { useMemo, useState } from 'react';
import { displayDate, type DateFormat } from '../dates';
import { type ColumnType } from '../fwsh';
import { matchesPredicate } from '../rules';
import { DEFAULT_DIMENSIONS, getVisibleRange, materializeRows, totalHeight } from './model';
import styles from './Grid.module.css';

const VIEWPORT_HEIGHT = 480;
const GUTTER_WIDTH = 56;
const dims = DEFAULT_DIMENSIONS;
const contentWidth = GUTTER_WIDTH + dims.cols * dims.colWidth;

export type ColumnTypeMap = Record<number, { type: ColumnType; dateFormat?: DateFormat }>;

export interface GridProps {
  engine: SheetEngine;
  active: { row: number; col: number };
  onSelect: (row: number, col: number) => void;
  /** Bumping this re-reads cell values after edits/recalculation. */
  revision: number;
  columnTypes?: ColumnTypeMap;
  /** Formula predicate (uses `value`); highlight cells where it matches. */
  conditionalRule?: string | null;
  /** Formula predicate; flag cells where it does NOT match. */
  validationRule?: string | null;
  /** Collaborators present in the session; their selected cells are highlighted. */
  peers?: PresencePeer[];
}

export function Grid({
  engine,
  active,
  onSelect,
  revision,
  columnTypes = {},
  conditionalRule = null,
  validationRule = null,
  peers = [],
}: GridProps) {
  const [scrollTop, setScrollTop] = useState(0);

  // A collaborator's selected cell, keyed "row,col" (peers is tiny). First peer
  // on a cell wins the tag; concurrent peers on the same cell are rare.
  const peerByCell = useMemo(() => {
    const map = new Map<string, PresencePeer>();
    for (const peer of peers) {
      const cell = peer.location?.cell;
      if (cell && !map.has(`${cell.row},${cell.col}`)) {
        map.set(`${cell.row},${cell.col}`, peer);
      }
    }
    return map;
  }, [peers]);

  // Date columns display in their locked format; the stored raw is never mutated.
  const displayValue = (col: number, value: string): string => {
    const schema = columnTypes[col];
    if (schema?.type === 'date' && schema.dateFormat) {
      return displayDate(value, schema.dateFormat as DateFormat);
    }
    return value;
  };

  // Conditional formatting + data validation classes for a numeric cell. Rules
  // are formula predicates using `value`, evaluated per visible cell.
  const ruleClasses = (value: string): string[] => {
    const num = Number(value);
    if (value.trim() === '' || !Number.isFinite(num)) return [];
    const classes: string[] = [];
    if (conditionalRule && matchesPredicate(engine, conditionalRule, num)) {
      classes.push(styles.highlight!);
    }
    if (validationRule && !matchesPredicate(engine, validationRule, num)) {
      classes.push(styles.invalid!);
    }
    return classes;
  };

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
              const peer = peerByCell.get(`${vm.row},${cell.col}`);
              const classes = [
                styles.cell,
                isActive ? styles.active : '',
                peer ? styles.peer : '',
                ...ruleClasses(cell.value),
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={cell.col}
                  role="gridcell"
                  aria-label={`${columns[cell.col] ?? ''}${vm.row + 1}`}
                  aria-selected={isActive}
                  className={classes}
                  style={
                    peer
                      ? { width: dims.colWidth, boxShadow: `inset 0 0 0 2px ${peer.user.color}` }
                      : { width: dims.colWidth }
                  }
                  onMouseDown={() => onSelect(vm.row, cell.col)}
                >
                  {peer ? (
                    <span className={styles.peerTag} style={{ background: peer.user.color }} aria-hidden>
                      {peer.user.name}
                    </span>
                  ) : null}
                  {displayValue(cell.col, cell.value)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
