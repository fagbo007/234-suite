import { afterEach, describe, expect, it } from 'vitest';
import { SheetEngine } from './engine';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('SheetEngine', () => {
  it('evaluates arithmetic and SUM / AVERAGE / COUNT', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '10');
    engine.setCell(1, 0, '20');
    engine.setCell(2, 0, '30');
    engine.setCell(0, 1, '=SUM(A1:A3)');
    engine.setCell(1, 1, '=AVERAGE(A1:A3)');
    engine.setCell(2, 1, '=COUNT(A1:A3)');
    engine.setCell(3, 1, '=A1*2+5');

    expect(engine.getValue(0, 1)).toBe(60);
    expect(engine.getValue(1, 1)).toBe(20);
    expect(engine.getValue(2, 1)).toBe(3);
    expect(engine.getValue(3, 1)).toBe(25);
  });

  it('preserves raw formula text and reports the used range', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '=1+1');
    expect(engine.getRaw(0, 0)).toBe('=1+1');
    expect(engine.getValue(0, 0)).toBe(2);
    expect(engine.usedRange().rows).toBeGreaterThanOrEqual(1);
  });
});
