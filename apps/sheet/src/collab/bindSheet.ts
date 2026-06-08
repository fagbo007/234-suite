/**
 * Binds a `SheetEngine` + the App's column-type metadata to a Yjs document (the
 * Sheet mapping in docs/architecture/collab.md). Three shared maps, all guarded
 * by a `LOCAL` transaction origin so observers apply only *remote* changes:
 *
 *   cells       : Y.Map<"row,col" → raw string>   — cell content (formulas as raw text)
 *   names       : Y.Map<name → "row,col">         — named references (coords, never A1; §3.4/§16)
 *   columnTypes : Y.Map<colIndex → JSON(schema)>  — explicit column types (date format, etc.)
 *
 * Cells + named refs live in the engine; column types + the chart live in App
 * React state, so their remote changes are delivered via callbacks
 * (`onColumnType`, `onChart`). Conditional/validation rules are a follow-up.
 */
import { type CollabDoc, Y } from '@234/collab';
import { type SheetEngine } from '@234/formula-engine';
import { type Chart } from '../charts/chart';
import { type ColumnSchemaValue } from '../grid/ColumnInspector';

export interface SheetSeed {
  columnTypes: Record<number, ColumnSchemaValue>;
  chart: Chart | null;
}

export interface SheetBindingCallbacks {
  /** Remote cell or named-ref change applied to the engine — re-render/recalc. */
  onRemoteChange?: () => void;
  /** Remote column-type change (App owns the state). `null` ⇒ cleared. */
  onColumnType?: (col: number, schema: ColumnSchemaValue | null) => void;
  /** Remote chart change (App owns the state). `null` ⇒ chart removed. */
  onChart?: (chart: Chart | null) => void;
}

export interface SheetBinding {
  setCell(row: number, col: number, raw: string): void;
  defineName(name: string, row: number, col: number): void;
  setColumnType(col: number, schema: ColumnSchemaValue | null): void;
  setChart(chart: Chart | null): void;
  /** Host: copy the engine's cells + names and the App's column types + chart into the doc. */
  seed(snapshot: SheetSeed): void;
  destroy(): void;
}

const cellKey = (row: number, col: number) => `${row},${col}`;

function parseCoord(value: string): [number, number] | null {
  const parts = value.split(',');
  if (parts.length !== 2) return null;
  const row = Number(parts[0]);
  const col = Number(parts[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return [row, col];
}

export function bindSheet(
  engine: SheetEngine,
  doc: CollabDoc,
  callbacks: SheetBindingCallbacks = {},
): SheetBinding {
  const { onRemoteChange = () => {}, onColumnType = () => {}, onChart = () => {} } = callbacks;
  const cells = doc.map<string>('cells');
  const names = doc.map<string>('names');
  const columnTypes = doc.map<string>('columnTypes');
  const chart = doc.map<string>('chart'); // single key "value" → JSON(Chart)
  const CHART_KEY = 'value';
  const LOCAL = Symbol('sheet-binding-local');

  const onCells = (event: Y.YMapEvent<string>, txn: Y.Transaction) => {
    if (txn.origin === LOCAL) return;
    let changed = false;
    event.keys.forEach((change, key) => {
      const coord = parseCoord(key);
      if (!coord) return;
      engine.setCell(coord[0], coord[1], change.action === 'delete' ? '' : (cells.get(key) ?? ''));
      changed = true;
    });
    if (changed) onRemoteChange();
  };

  const onNames = (event: Y.YMapEvent<string>, txn: Y.Transaction) => {
    if (txn.origin === LOCAL) return;
    let changed = false;
    event.keys.forEach((change, name) => {
      if (change.action === 'delete') {
        engine.removeName(name);
        changed = true;
        return;
      }
      const coord = parseCoord(names.get(name) ?? '');
      if (coord) {
        engine.defineName(name, coord[0], coord[1]);
        changed = true;
      }
    });
    if (changed) onRemoteChange();
  };

  const onColumns = (event: Y.YMapEvent<string>, txn: Y.Transaction) => {
    if (txn.origin === LOCAL) return;
    event.keys.forEach((change, key) => {
      const col = Number(key);
      if (!Number.isInteger(col)) return;
      if (change.action === 'delete') {
        onColumnType(col, null);
      } else {
        const raw = columnTypes.get(key);
        if (raw) onColumnType(col, JSON.parse(raw) as ColumnSchemaValue);
      }
    });
  };

  const onChartMap = (event: Y.YMapEvent<string>, txn: Y.Transaction) => {
    if (txn.origin === LOCAL) return;
    if (!event.keys.has(CHART_KEY)) return;
    const raw = chart.get(CHART_KEY);
    onChart(raw ? (JSON.parse(raw) as Chart) : null);
  };

  cells.observe(onCells);
  names.observe(onNames);
  columnTypes.observe(onColumns);
  chart.observe(onChartMap);

  return {
    setCell(row, col, raw) {
      engine.setCell(row, col, raw);
      doc.doc.transact(() => {
        if (raw === '') cells.delete(cellKey(row, col));
        else cells.set(cellKey(row, col), raw);
      }, LOCAL);
    },

    defineName(name, row, col) {
      engine.defineName(name, row, col);
      doc.doc.transact(() => names.set(name, `${row},${col}`), LOCAL);
    },

    setColumnType(col, schema) {
      doc.doc.transact(() => {
        if (schema === null) columnTypes.delete(String(col));
        else columnTypes.set(String(col), JSON.stringify(schema));
      }, LOCAL);
    },

    setChart(value) {
      doc.doc.transact(() => {
        if (value === null) chart.delete(CHART_KEY);
        else chart.set(CHART_KEY, JSON.stringify(value));
      }, LOCAL);
    },

    seed(snapshot) {
      const { rows, cols } = engine.usedRange();
      doc.doc.transact(() => {
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const raw = engine.getRaw(row, col);
            if (raw !== '') cells.set(cellKey(row, col), raw);
          }
        }
        const exported = engine.exportNames();
        for (const [name, coord] of Object.entries(exported)) {
          names.set(name, `${coord.row},${coord.col}`);
        }
        for (const [col, schema] of Object.entries(snapshot.columnTypes)) {
          columnTypes.set(String(col), JSON.stringify(schema));
        }
        if (snapshot.chart) chart.set(CHART_KEY, JSON.stringify(snapshot.chart));
      }, LOCAL);
    },

    destroy() {
      cells.unobserve(onCells);
      names.unobserve(onNames);
      columnTypes.unobserve(onColumns);
      chart.unobserve(onChartMap);
    },
  };
}
