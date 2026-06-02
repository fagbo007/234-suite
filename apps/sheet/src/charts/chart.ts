import { type SheetEngine } from '@234/formula-engine';

export type ChartType = 'bar' | 'line' | 'pie';

export interface Chart {
  type: ChartType;
  /** Data range — A1 (`A1:A5`) or a named reference. */
  range: string;
  title: string;
}

/** Read a chart's data range into numbers (non-numeric / empty → 0; bad range → []). */
export function chartValues(engine: SheetEngine, range: string): number[] {
  if (range.trim() === '') return [];
  try {
    return engine.readRange(range).map((value) => {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : 0;
    });
  } catch {
    return [];
  }
}
