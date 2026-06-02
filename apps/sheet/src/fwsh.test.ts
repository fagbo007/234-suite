import { SheetEngine } from '@234/formula-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { applyCells, parseFwshCsv, serializeFwsh, type FwshMeta } from './fwsh';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

const META: FwshMeta = {
  columns: [
    { index: 0, type: 'text' },
    { index: 1, type: 'number' },
  ],
  namedRanges: { revenue: 'B1' },
};

describe('.fwsh round-trip', () => {
  it('escapes commas/quotes and preserves raw formulas and meta', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, 'amount, total'); // contains a comma → must be quoted
    engine.setCell(0, 1, '=1+1');

    const doc = serializeFwsh(engine, META);
    const cells = parseFwshCsv(doc.csv);

    expect(cells[0]?.[0]).toBe('amount, total');
    expect(cells[0]?.[1]).toBe('=1+1');
    expect(doc.meta).toEqual(META);
  });

  it('reloads parsed cells into an engine identically', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '10');
    engine.setCell(1, 0, '20');
    engine.setCell(0, 1, '=SUM(A1:A2)');
    const first = serializeFwsh(engine, META);

    const reloaded = new SheetEngine();
    applyCells(reloaded, parseFwshCsv(first.csv));
    const second = serializeFwsh(reloaded, META);

    expect(second.csv).toBe(first.csv);
    expect(reloaded.getValue(0, 1)).toBe(30);
    reloaded.destroy();
  });
});
