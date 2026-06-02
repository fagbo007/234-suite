import { describe, expect, it } from 'vitest';
import { displayDate, parseDate } from './dates';

describe('parseDate', () => {
  it('parses ISO and slash dates', () => {
    expect(parseDate('2026-06-02')).toEqual({ year: 2026, month: 6, day: 2 });
    expect(parseDate('06/02/2026')).toEqual({ year: 2026, month: 6, day: 2 });
  });

  it('rejects non-dates and invalid days', () => {
    expect(parseDate('hello')).toBeNull();
    expect(parseDate('2026-13-40')).toBeNull();
  });
});

describe('displayDate (locked format, no mutation)', () => {
  it('reformats a valid date to the locked format', () => {
    expect(displayDate('2026-06-02', 'MM/DD/YYYY')).toBe('06/02/2026');
    expect(displayDate('06/02/2026', 'YYYY-MM-DD')).toBe('2026-06-02');
  });

  it('returns invalid input unchanged (never coerces)', () => {
    expect(displayDate('not a date', 'YYYY-MM-DD')).toBe('not a date');
    expect(displayDate('1/2', 'YYYY-MM-DD')).toBe('1/2');
  });
});
