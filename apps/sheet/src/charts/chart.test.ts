import { SheetEngine } from '@234/formula-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { chartValues } from './chart';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('chartValues', () => {
  it('reads a numeric range', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '10');
    engine.setCell(1, 0, '20');
    engine.setCell(2, 0, '30');
    expect(chartValues(engine, 'A1:A3')).toEqual([10, 20, 30]);
  });

  it('returns [] for an empty or invalid range', () => {
    engine = new SheetEngine();
    expect(chartValues(engine, '')).toEqual([]);
    expect(chartValues(engine, 'nope')).toEqual([]);
  });
});
