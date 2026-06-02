/**
 * Date helpers for declared date columns. The locked column format controls
 * DISPLAY only — the stored raw value is never mutated (root CLAUDE.md §2.2: no
 * silent coercion). Values are treated as dates ONLY in declared date columns.
 */

export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
export const DATE_FORMATS: DateFormat[] = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'];

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

function isValid(ymd: Ymd): Ymd | null {
  const { year, month, day } = ymd;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return ymd;
}

/** Parse a raw value as a date (ISO or slash forms), or null if it isn't one. */
export function parseDate(raw: string): Ymd | null {
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (iso) return isValid({ year: +iso[1]!, month: +iso[2]!, day: +iso[3]! });

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (slash) {
    // Ambiguous: try MM/DD/YYYY, then DD/MM/YYYY.
    const mdy = isValid({ year: +slash[3]!, month: +slash[1]!, day: +slash[2]! });
    return mdy ?? isValid({ year: +slash[3]!, month: +slash[2]!, day: +slash[1]! });
  }
  return null;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function formatDate(ymd: Ymd, fmt: DateFormat): string {
  const y = pad(ymd.year, 4);
  const m = pad(ymd.month);
  const d = pad(ymd.day);
  switch (fmt) {
    case 'YYYY-MM-DD':
      return `${y}-${m}-${d}`;
    case 'MM/DD/YYYY':
      return `${m}/${d}/${y}`;
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`;
  }
}

/** Display a raw value in the locked format; invalid values are returned unchanged. */
export function displayDate(raw: string, fmt: DateFormat): string {
  const ymd = parseDate(raw);
  return ymd ? formatDate(ymd, fmt) : raw;
}
