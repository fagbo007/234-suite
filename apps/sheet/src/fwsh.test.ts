import { SheetEngine } from '@234/formula-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { applyCells, applyNamedRanges, parseFwshCsv, serializeFwsh, type FwshMeta } from './fwsh';

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
  namedRanges: {},
};

describe('.fwsh round-trip', () => {
  it('escapes commas/quotes and preserves raw formulas + column schema', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, 'amount, total'); // contains a comma → must be quoted
    engine.setCell(0, 1, '=1+1');

    const doc = serializeFwsh(engine, META);
    const cells = parseFwshCsv(doc.csv);

    expect(cells[0]?.[0]).toBe('amount, total');
    expect(cells[0]?.[1]).toBe('=1+1');
    expect(doc.meta.columns).toEqual(META.columns);
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

  it('round-trips named ranges (as coordinates) and they still resolve', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '42');
    engine.defineName('answer', 0, 0);
    engine.setCell(1, 0, '=answer');
    const doc = serializeFwsh(engine, META);

    expect(doc.meta.namedRanges).toEqual({ answer: { row: 0, col: 0 } });

    const reloaded = new SheetEngine();
    applyCells(reloaded, parseFwshCsv(doc.csv));
    applyNamedRanges(reloaded, doc.meta.namedRanges);

    expect(reloaded.coordOf('answer')).toEqual({ row: 0, col: 0 });
    expect(reloaded.getValue(1, 0)).toBe(42);
    reloaded.destroy();
  });
});
