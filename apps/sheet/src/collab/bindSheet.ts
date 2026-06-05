/**
 * Binds a `SheetEngine` to a Yjs `Y.Map` of cell raw-content (root §3.1; the
 * Sheet mapping in docs/architecture/collab.md). Cells are keyed `"row,col"` →
 * raw string (formulas sync as their raw text; resolution stays local). Local
 * edits are tagged with a `LOCAL` transaction origin so the observer applies
 * only *remote* changes back to the engine — no echo loop.
 *
 * Named-range / column-type sync is a follow-up; this binds cell content only.
 */
import { type CollabDoc, Y } from '@234/collab';
import { type SheetEngine } from '@234/formula-engine';

export interface SheetBinding {
  /** Set a cell locally and mirror it to the shared doc. */
  setCell(row: number, col: number, raw: string): void;
  /** Host: copy the engine's current cells into the shared doc. */
  seedFromEngine(): void;
  destroy(): void;
}

const cellKey = (row: number, col: number) => `${row},${col}`;

function parseCellKey(key: string): [number, number] | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;
  const row = Number(parts[0]);
  const col = Number(parts[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return [row, col];
}

export function bindSheet(
  engine: SheetEngine,
  doc: CollabDoc,
  onRemoteChange: () => void = () => {},
): SheetBinding {
  const cells = doc.map<string>('cells');
  const LOCAL = Symbol('sheet-binding-local');

  const observer = (event: Y.YMapEvent<string>, transaction: Y.Transaction) => {
    if (transaction.origin === LOCAL) return; // ignore our own edits
    let changed = false;
    event.keys.forEach((change, key) => {
      const coord = parseCellKey(key);
      if (!coord) return;
      const [row, col] = coord;
      engine.setCell(row, col, change.action === 'delete' ? '' : (cells.get(key) ?? ''));
      changed = true;
    });
    if (changed) onRemoteChange();
  };
  cells.observe(observer);

  return {
    setCell(row, col, raw) {
      engine.setCell(row, col, raw);
      doc.doc.transact(() => {
        if (raw === '') cells.delete(cellKey(row, col));
        else cells.set(cellKey(row, col), raw);
      }, LOCAL);
    },

    seedFromEngine() {
      const { rows, cols } = engine.usedRange();
      doc.doc.transact(() => {
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const raw = engine.getRaw(row, col);
            if (raw !== '') cells.set(cellKey(row, col), raw);
          }
        }
      }, LOCAL);
    },

    destroy() {
      cells.unobserve(observer);
    },
  };
}
