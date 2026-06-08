import { a1ToCell } from './a1';

/**
 * Minimal, dependency-free (MIT) formula evaluator. Replaces HyperFormula
 * (GPLv3) so the suite stays cleanly MIT. Values are `number | string`
 * (booleans are numeric: TRUE = 1, FALSE = 0). Supports:
 *  - arithmetic (`+ - * / ^`, parens, unary minus) and ranges
 *  - text: string literals (`"..."`), `&` concatenation, string comparisons
 *  - comparisons (`= <> < <= > >=`) — numeric, or lexicographic for text
 *  - functions: SUM / AVERAGE / COUNT / MIN / MAX, IF (lazy branches), IFS,
 *    AND / OR / NOT, ABS / INT / SQRT / POWER / MOD / ROUND,
 *    COUNTIF(S) / SUMIF(S) / AVERAGEIF(S), text: CONCAT / CONCATENATE / TEXTJOIN /
 *    LEN / UPPER / LOWER / TRIM / LEFT / RIGHT / MID / SUBSTITUTE / FIND, and
 *    dates: DATE / DATEVALUE / YEAR / MONTH / DAY / DATEDIF / WEEKDAY / EDATE /
 *    EOMONTH / TODAY / NOW (serial day-counts since 1970-01-01; TODAY/NOW read an
 *    injected clock — NOW carries a fractional time-of-day),
 *    and lookups: VLOOKUP / HLOOKUP / XLOOKUP / INDEX / MATCH (exact by default)
 * Further breadth (dynamic arrays / spill) stays planned — see
 * docs/formula-compat.md; unknown functions return `#NAME?` (never guessed).
 *
 * Errors are thrown as `Error` whose message is an Excel-style code
 * (`#DIV/0!`, `#NAME?`, `#NUM!`, `#VALUE!`, `#ERROR!`); the engine surfaces it.
 */

/** A formula value: a number or a string (booleans are numeric 1/0). */
export type FormulaValue = number | string;

/** Resolve a cell to its value (number or string), or null when empty. */
export type CellResolver = (row: number, col: number) => FormulaValue | null;

/**
 * Resolve a reference token to coordinates. The engine injects one that checks
 * the named-reference registry first, then A1 (root CLAUDE.md §3.4). The default
 * is A1-only.
 */
export type RefResolver = (ref: string) => [number, number];

function defaultRefResolver(ref: string): [number, number] {
  const { row, col } = a1ToCell(ref);
  return [row, col];
}

// --- value coercion (Excel-style) ---

/** Coerce to a number for arithmetic: empty/'' → 0; numeric string → number; else #VALUE!. */
function toNumber(v: FormulaValue | null): number {
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  const t = v.trim();
  if (t === '') return 0;
  const n = Number(t);
  if (Number.isFinite(n)) return n;
  throw new Error('#VALUE!');
}

/** Coerce to text for concatenation: null → ''; number → its string. */
function toText(v: FormulaValue | null): string {
  if (v === null) return '';
  return typeof v === 'number' ? String(v) : v;
}

// --- dates: serial = integer days since 1970-01-01 UTC (DATE(1970,1,1) = 0) ---

const MS_PER_DAY = 86_400_000;

function ymdToSerial(year: number, month: number, day: number): number {
  // Date.UTC normalises overflow (e.g. month 13 → next January), like Excel.
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function serialToYmd(serial: number): { year: number; month: number; day: number } {
  // Floor so a fractional serial (e.g. NOW's time-of-day) maps to its calendar
  // day; identical to round for the integer serials DATE/DATEVALUE produce.
  const d = new Date(Math.floor(serial) * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Serial of the last day of the month `months` after `serial`'s month. */
function endOfMonthSerial(serial: number, months: number): number {
  const { year, month } = serialToYmd(serial);
  // Day 0 of (month + months + 1) = the last day of (month + months).
  return Math.floor(Date.UTC(year, month + months, 0) / MS_PER_DAY);
}

/** Parse an ISO `YYYY-MM-DD` string to a serial; throws #VALUE! if invalid. */
function dateValue(text: string): number {
  const match = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(text);
  if (!match) throw new Error('#VALUE!');
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const serial = ymdToSerial(year, month, day);
  // Reject out-of-range parts (e.g. month 13, day 40) that Date.UTC would roll over.
  const back = serialToYmd(serial);
  if (back.year !== year || back.month !== month || back.day !== day) throw new Error('#VALUE!');
  return serial;
}

function dateDiff(start: number, end: number, unit: string): number {
  if (unit === 'd') return Math.round(end) - Math.round(start);
  const a = serialToYmd(start);
  const b = serialToYmd(end);
  if (unit === 'y') {
    let years = b.year - a.year;
    if (b.month < a.month || (b.month === a.month && b.day < a.day)) years -= 1;
    return years;
  }
  if (unit === 'm') {
    let months = (b.year - a.year) * 12 + (b.month - a.month);
    if (b.day < a.day) months -= 1;
    return months;
  }
  throw new Error('#VALUE!');
}

function orderNum(x: number, op: string, y: number): boolean {
  switch (op) {
    case '=':
      return x === y;
    case '<>':
      return x !== y;
    case '<':
      return x < y;
    case '<=':
      return x <= y;
    case '>':
      return x > y;
    case '>=':
      return x >= y;
    default:
      throw new Error('#ERROR!');
  }
}

function orderStr(x: string, op: string, y: string): boolean {
  switch (op) {
    case '=':
      return x === y;
    case '<>':
      return x !== y;
    case '<':
      return x < y;
    case '<=':
      return x <= y;
    case '>':
      return x > y;
    case '>=':
      return x >= y;
    default:
      throw new Error('#ERROR!');
  }
}

/**
 * Compare two values. Both numbers → numeric; both strings → case-insensitive
 * lexicographic; mixed → a number always ranks below text (Excel).
 */
function compareValues(a: FormulaValue, op: string, b: FormulaValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') return orderNum(a, op, b);
  if (typeof a === 'string' && typeof b === 'string') {
    return orderStr(a.toLowerCase(), op, b.toLowerCase());
  }
  return orderNum(typeof a === 'number' ? 0 : 1, op, typeof b === 'number' ? 0 : 1);
}

type Token =
  | { type: 'num'; value: string }
  | { type: 'str'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }
  | { type: 'colon' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === ' ' || ch === '\t') {
      i++;
    } else if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      tokens.push({ type: 'num', value: src.slice(i, j) });
      i = j;
    } else if (ch === '"') {
      // String literal; "" is an escaped quote.
      let j = i + 1;
      let str = '';
      while (j < src.length) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            str += '"';
            j += 2;
          } else {
            j++;
            break;
          }
        } else {
          str += src[j];
          j++;
        }
      }
      tokens.push({ type: 'str', value: str });
      i = j;
    } else if (/[A-Za-z]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9]/.test(src[j]!)) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
    } else if ('+-*/^&'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
    } else if (ch === '<' || ch === '>' || ch === '=') {
      const nxt = src[i + 1];
      if (ch === '<' && (nxt === '=' || nxt === '>')) {
        tokens.push({ type: 'op', value: ch + nxt });
        i += 2;
      } else if (ch === '>' && nxt === '=') {
        tokens.push({ type: 'op', value: '>=' });
        i += 2;
      } else {
        tokens.push({ type: 'op', value: ch });
        i++;
      }
    } else if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
    } else if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
    } else if (ch === ':') {
      tokens.push({ type: 'colon' });
      i++;
    } else {
      throw new Error('#ERROR!');
    }
  }
  return tokens;
}

function applyFunction(name: string, values: (FormulaValue | null)[]): FormulaValue {
  const nums = () => values.filter((v): v is number => typeof v === 'number');
  switch (name) {
    case 'SUM':
      return nums().reduce((a, b) => a + b, 0);
    case 'COUNT':
      return nums().length;
    case 'AVERAGE': {
      const n = nums();
      if (n.length === 0) throw new Error('#DIV/0!');
      return n.reduce((a, b) => a + b, 0) / n.length;
    }
    case 'MIN': {
      const n = nums();
      return n.length === 0 ? 0 : Math.min(...n);
    }
    case 'MAX': {
      const n = nums();
      return n.length === 0 ? 0 : Math.max(...n);
    }
    // Logical — nonzero is true. IF is handled lazily in the parser.
    case 'AND':
      return values.every((v) => toNumber(v) !== 0) ? 1 : 0;
    case 'OR':
      return values.some((v) => toNumber(v) !== 0) ? 1 : 0;
    case 'NOT':
      return toNumber(values[0] ?? 0) === 0 ? 1 : 0;
    // Scalar math — positional arguments.
    case 'ABS':
      return Math.abs(toNumber(values[0] ?? 0));
    case 'INT':
      return Math.floor(toNumber(values[0] ?? 0));
    case 'SQRT': {
      const x = toNumber(values[0] ?? 0);
      if (x < 0) throw new Error('#NUM!');
      return Math.sqrt(x);
    }
    case 'POWER':
      return Math.pow(toNumber(values[0] ?? 0), toNumber(values[1] ?? 0));
    case 'MOD': {
      const a = toNumber(values[0] ?? 0);
      const b = toNumber(values[1] ?? 0);
      if (b === 0) throw new Error('#DIV/0!');
      return ((a % b) + b) % b; // Excel: result takes the divisor's sign
    }
    case 'ROUND': {
      const x = toNumber(values[0] ?? 0);
      const f = Math.pow(10, Math.trunc(toNumber(values[1] ?? 0)));
      return Math.round(x * f) / f;
    }
    // Text functions.
    case 'CONCAT':
    case 'CONCATENATE':
      return values.map(toText).join('');
    case 'LEN':
      return toText(values[0] ?? '').length;
    case 'UPPER':
      return toText(values[0] ?? '').toUpperCase();
    case 'LOWER':
      return toText(values[0] ?? '').toLowerCase();
    case 'TRIM':
      return toText(values[0] ?? '').replace(/\s+/g, ' ').trim();
    case 'LEFT': {
      const s = toText(values[0] ?? '');
      const n = Math.max(0, Math.trunc(toNumber(values[1] ?? 1)));
      return s.slice(0, n);
    }
    case 'RIGHT': {
      const s = toText(values[0] ?? '');
      const n = Math.max(0, Math.trunc(toNumber(values[1] ?? 1)));
      return s.slice(s.length - n);
    }
    case 'MID': {
      const s = toText(values[0] ?? '');
      const start = Math.trunc(toNumber(values[1] ?? 1)); // 1-based
      const len = Math.max(0, Math.trunc(toNumber(values[2] ?? 0)));
      if (start < 1) throw new Error('#VALUE!');
      return s.slice(start - 1, start - 1 + len);
    }
    case 'SUBSTITUTE': {
      const s = toText(values[0] ?? '');
      const oldText = toText(values[1] ?? '');
      const newText = toText(values[2] ?? '');
      if (oldText === '') return s;
      if (values.length > 3) {
        // Replace only the nth (1-based) occurrence.
        const nth = Math.trunc(toNumber(values[3] ?? 0));
        if (nth < 1) throw new Error('#VALUE!');
        let from = 0;
        for (let count = 1; ; count++) {
          const at = s.indexOf(oldText, from);
          if (at === -1) return s;
          if (count === nth) return s.slice(0, at) + newText + s.slice(at + oldText.length);
          from = at + oldText.length;
        }
      }
      return s.split(oldText).join(newText);
    }
    case 'TEXTJOIN': {
      // TEXTJOIN(delimiter, ignore_empty, ...items) — ranges flatten into items.
      const delim = toText(values[0] ?? '');
      const ignoreEmpty = toNumber(values[1] ?? 0) !== 0;
      const items = values
        .slice(2)
        .filter((v) => !ignoreEmpty || toText(v) !== '')
        .map(toText);
      return items.join(delim);
    }
    case 'FIND': {
      // 1-based, case-sensitive; #VALUE! when not found.
      const needle = toText(values[0] ?? '');
      const haystack = toText(values[1] ?? '');
      const start = Math.max(1, Math.trunc(toNumber(values[2] ?? 1)));
      const at = haystack.indexOf(needle, start - 1);
      if (at === -1) throw new Error('#VALUE!');
      return at + 1;
    }
    // More dates (serial day-counts; see DATE above).
    case 'WEEKDAY': {
      const serial = toNumber(values[0] ?? 0);
      const type = values.length > 1 ? Math.trunc(toNumber(values[1] ?? 1)) : 1;
      const dow = new Date(Math.floor(serial) * MS_PER_DAY).getUTCDay(); // 0=Sun..6=Sat
      if (type === 1) return dow + 1; // Sun=1..Sat=7
      if (type === 2) return ((dow + 6) % 7) + 1; // Mon=1..Sun=7
      if (type === 3) return (dow + 6) % 7; // Mon=0..Sun=6
      throw new Error('#NUM!');
    }
    case 'EDATE': {
      const { year, month, day } = serialToYmd(toNumber(values[0] ?? 0));
      const delta = Math.trunc(toNumber(values[1] ?? 0));
      // Clamp the day to the target month's last day (Excel: Jan-31 +1 → Feb-28).
      const lastDay = endOfMonthSerial(toNumber(values[0] ?? 0), delta);
      const lastDom = serialToYmd(lastDay).day;
      return ymdToSerial(year, month + delta, Math.min(day, lastDom));
    }
    case 'EOMONTH':
      return endOfMonthSerial(toNumber(values[0] ?? 0), Math.trunc(toNumber(values[1] ?? 0)));
    // Dates — serial day-counts since 1970-01-01 (no auto-coercion; DATEVALUE is explicit).
    case 'DATE':
      return ymdToSerial(toNumber(values[0] ?? 0), toNumber(values[1] ?? 0), toNumber(values[2] ?? 0));
    case 'DATEVALUE':
      return dateValue(toText(values[0] ?? ''));
    case 'YEAR':
      return serialToYmd(toNumber(values[0] ?? 0)).year;
    case 'MONTH':
      return serialToYmd(toNumber(values[0] ?? 0)).month;
    case 'DAY':
      return serialToYmd(toNumber(values[0] ?? 0)).day;
    case 'DATEDIF':
      return dateDiff(toNumber(values[0] ?? 0), toNumber(values[1] ?? 0), toText(values[2] ?? ''));
    default:
      throw new Error('#NAME?'); // unsupported function — never guess (Section 3.3)
  }
}

class Parser {
  private readonly tokens: Token[];
  private pos = 0;

  constructor(
    source: string,
    private readonly resolve: CellResolver,
    private readonly resolveRef: RefResolver = defaultRefResolver,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.tokens = tokenize(source);
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private at(offset: number): Token | undefined {
    return this.tokens[this.pos + offset];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private static readonly COMPARATORS = new Set(['=', '<', '>', '<=', '>=', '<>']);

  parse(): FormulaValue {
    const value = this.comparison();
    if (this.pos !== this.tokens.length) throw new Error('#ERROR!');
    return value;
  }

  /** Lowest precedence: comparisons yield 1 (true) or 0 (false). */
  private comparison(): FormulaValue {
    let left = this.concat();
    let token = this.peek();
    while (token?.type === 'op' && Parser.COMPARATORS.has(token.value)) {
      const op = token.value;
      this.next();
      const right = this.concat();
      left = compareValues(left, op, right) ? 1 : 0;
      token = this.peek();
    }
    return left;
  }

  /** Text concatenation `&` — below comparison, above additive (Excel). */
  private concat(): FormulaValue {
    let left = this.expression();
    let token = this.peek();
    while (token?.type === 'op' && token.value === '&') {
      this.next();
      left = toText(left) + toText(this.expression());
      token = this.peek();
    }
    return left;
  }

  private expression(): FormulaValue {
    let left = this.term();
    let token = this.peek();
    while (token?.type === 'op' && (token.value === '+' || token.value === '-')) {
      this.next();
      const right = this.term();
      left = token.value === '+' ? toNumber(left) + toNumber(right) : toNumber(left) - toNumber(right);
      token = this.peek();
    }
    return left;
  }

  private term(): FormulaValue {
    let left = this.power();
    let token = this.peek();
    while (token?.type === 'op' && (token.value === '*' || token.value === '/')) {
      this.next();
      const right = toNumber(this.power());
      if (token.value === '/') {
        if (right === 0) throw new Error('#DIV/0!');
        left = toNumber(left) / right;
      } else {
        left = toNumber(left) * right;
      }
      token = this.peek();
    }
    return left;
  }

  private power(): FormulaValue {
    const base = this.unary();
    const token = this.peek();
    if (token?.type === 'op' && token.value === '^') {
      this.next();
      return Math.pow(toNumber(base), toNumber(this.power()));
    }
    return base;
  }

  private unary(): FormulaValue {
    const token = this.peek();
    if (token?.type === 'op' && token.value === '-') {
      this.next();
      return -toNumber(this.unary());
    }
    if (token?.type === 'op' && token.value === '+') {
      this.next();
      return toNumber(this.unary());
    }
    return this.primary();
  }

  private primary(): FormulaValue {
    const token = this.peek();
    if (!token) throw new Error('#ERROR!');

    if (token.type === 'num') {
      this.next();
      const n = Number(token.value);
      if (!Number.isFinite(n)) throw new Error('#ERROR!');
      return n;
    }
    if (token.type === 'str') {
      this.next();
      return token.value;
    }
    if (token.type === 'lparen') {
      this.next();
      const value = this.comparison();
      if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
      this.next();
      return value;
    }
    if (token.type === 'ident') {
      if (this.at(1)?.type === 'lparen') return this.functionCall(token.value.toUpperCase());
      this.next();
      return this.resolve(...this.coord(token.value)) ?? 0; // empty cell → 0
    }
    throw new Error('#ERROR!');
  }

  private functionCall(name: string): FormulaValue {
    this.next(); // ident
    this.next(); // lparen
    if (name === 'TODAY' || name === 'NOW') return this.dateNow(name);
    if (name === 'IF') return this.ifCall();
    if (name === 'IFS') return this.ifsCall();
    if (name === 'COUNTIF' || name === 'SUMIF' || name === 'AVERAGEIF') {
      return this.conditionalAggregate(name);
    }
    if (name === 'COUNTIFS' || name === 'SUMIFS' || name === 'AVERAGEIFS') {
      return this.conditionalAggregateMulti(name);
    }
    if (name === 'VLOOKUP') return this.vlookup();
    if (name === 'HLOOKUP') return this.hlookup();
    if (name === 'XLOOKUP') return this.xlookup();
    if (name === 'INDEX') return this.indexFn();
    if (name === 'MATCH') return this.matchFn();
    const values: (FormulaValue | null)[] = [];
    if (this.peek()?.type !== 'rparen') {
      do {
        this.argument(values);
      } while (this.peek()?.type === 'comma' && this.next());
    }
    if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
    this.next(); // rparen
    return applyFunction(name, values);
  }

  /**
   * IF(cond, then[, else]) with **lazy** branches: only the taken branch is
   * evaluated, so `=IF(A1=0, 0, 1/A1)` never raises #DIV/0! when A1 is 0.
   */
  private ifCall(): FormulaValue {
    const cond = toNumber(this.comparison());
    this.expectComma();
    const thenStart = this.pos;
    this.skipArg();
    let elseStart = -1;
    if (this.peek()?.type === 'comma') {
      this.next();
      elseStart = this.pos;
      this.skipArg();
    }
    if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
    const end = this.pos;

    let result: FormulaValue;
    if (cond !== 0) {
      this.pos = thenStart;
      result = this.comparison();
    } else if (elseStart >= 0) {
      this.pos = elseStart;
      result = this.comparison();
    } else {
      result = 0; // no else branch → FALSE
    }

    this.pos = end;
    this.next(); // rparen
    return result;
  }

  private expectComma(): void {
    if (this.peek()?.type !== 'comma') throw new Error('#ERROR!');
    this.next();
  }

  /** Advance past one argument (to a top-level comma/rparen), respecting nesting. */
  private skipArg(): void {
    let depth = 0;
    for (;;) {
      const token = this.peek();
      if (!token) throw new Error('#ERROR!');
      if (depth === 0 && (token.type === 'comma' || token.type === 'rparen')) return;
      if (token.type === 'lparen') depth++;
      else if (token.type === 'rparen') depth--;
      this.next();
    }
  }

  private argument(values: (FormulaValue | null)[]): void {
    for (const v of this.rangeValues()) values.push(v);
  }

  /** Read one argument as a flat value list: a range `A1:B2` expands; else a scalar. */
  private rangeValues(): (FormulaValue | null)[] {
    const token = this.peek();
    if (token?.type === 'ident' && this.at(1)?.type === 'colon' && this.at(2)?.type === 'ident') {
      const startToken = this.next() as Token & { value: string };
      this.next(); // colon
      const endToken = this.next() as Token & { value: string };
      const [r0c0, r1c1] = [this.coord(startToken.value), this.coord(endToken.value)];
      const values: (FormulaValue | null)[] = [];
      for (let r = Math.min(r0c0[0], r1c1[0]); r <= Math.max(r0c0[0], r1c1[0]); r++) {
        for (let c = Math.min(r0c0[1], r1c1[1]); c <= Math.max(r0c0[1], r1c1[1]); c++) {
          values.push(this.resolve(r, c));
        }
      }
      return values;
    }
    return [this.comparison()];
  }

  /**
   * COUNTIF / SUMIF / AVERAGEIF: `(range, criteria[, sum_range])`. Criteria is a
   * comparison (`>10`, `<>0`), a value (exact match), or text (`"apple"`) — our
   * equivalent of Excel's quoted string criteria. SUMIF/AVERAGEIF sum/average the
   * aligned `sum_range` (or `range`) where the criteria matches.
   */
  private conditionalAggregate(name: string): FormulaValue {
    const range = this.rangeValues();
    this.expectComma();
    const { op, threshold } = this.parseCriteria();
    let sumRange: (FormulaValue | null)[] | null = null;
    if (this.peek()?.type === 'comma') {
      this.next();
      sumRange = this.rangeValues();
    }
    if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
    this.next(); // rparen

    const matched: number[] = [];
    range.forEach((v, i) => {
      if (v !== null && compareValues(v, op, threshold)) matched.push(i);
    });
    if (name === 'COUNTIF') return matched.length;

    const source = sumRange ?? range;
    const picked = matched.map((i) => {
      const s = source[i];
      return typeof s === 'number' ? s : 0; // sum/average ignore non-numeric
    });
    if (name === 'SUMIF') return picked.reduce((a, b) => a + b, 0);
    if (picked.length === 0) throw new Error('#DIV/0!'); // AVERAGEIF
    return picked.reduce((a, b) => a + b, 0) / picked.length;
  }

  /** Parse a criteria argument: an optional comparator then a threshold expression. */
  private parseCriteria(): { op: string; threshold: FormulaValue } {
    const token = this.peek();
    let op = '=';
    if (token?.type === 'op' && Parser.COMPARATORS.has(token.value)) {
      op = token.value;
      this.next();
    }
    return { op, threshold: this.expression() };
  }

  /** TODAY() / NOW() — no args; reads the injected clock (ms since epoch). */
  private dateNow(name: string): FormulaValue {
    this.expectRparen();
    const ms = this.now();
    // TODAY → whole day serial; NOW → fractional serial (carries time-of-day).
    return name === 'TODAY' ? Math.floor(ms / MS_PER_DAY) : ms / MS_PER_DAY;
  }

  /**
   * IFS(cond1, val1, cond2, val2, …) — returns the first matching value. Conditions
   * are evaluated in order and **stop at the first true** (Excel short-circuit);
   * only the chosen value is evaluated, so the others can't raise errors. No match
   * → #N/A.
   */
  private ifsCall(): FormulaValue {
    let chosen = -1;
    for (;;) {
      if (chosen === -1) {
        const cond = toNumber(this.comparison());
        this.expectComma();
        const valueStart = this.pos;
        this.skipArg();
        if (cond !== 0) chosen = valueStart;
      } else {
        // Already matched — skip the remaining (cond, value) without evaluating.
        this.skipArg();
        this.expectComma();
        this.skipArg();
      }
      if (this.peek()?.type === 'comma') {
        this.next();
        continue;
      }
      break;
    }
    if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
    const end = this.pos;
    if (chosen === -1) throw new Error('#N/A');
    this.pos = chosen;
    const result = this.comparison();
    this.pos = end;
    this.next(); // rparen
    return result;
  }

  /**
   * SUMIFS(sum_range, crit_range1, crit1, …), COUNTIFS(crit_range1, crit1, …),
   * AVERAGEIFS(avg_range, crit_range1, crit1, …). An index matches when **every**
   * (range, criteria) pair holds (AND); criteria reuse `parseCriteria`.
   */
  private conditionalAggregateMulti(name: string): FormulaValue {
    let valueRange: (FormulaValue | null)[] | null = null;
    if (name === 'SUMIFS' || name === 'AVERAGEIFS') {
      valueRange = this.rangeValues();
      this.expectComma();
    }
    const pairs: { range: (FormulaValue | null)[]; op: string; threshold: FormulaValue }[] = [];
    for (;;) {
      const range = this.rangeValues();
      this.expectComma();
      const { op, threshold } = this.parseCriteria();
      pairs.push({ range, op, threshold });
      if (this.peek()?.type === 'comma') {
        this.next();
        continue;
      }
      break;
    }
    this.expectRparen();
    if (pairs.length === 0) throw new Error('#ERROR!');

    const len = pairs[0]!.range.length;
    const matched: number[] = [];
    for (let i = 0; i < len; i++) {
      const ok = pairs.every(({ range, op, threshold }) => {
        const v = range[i];
        return v != null && compareValues(v, op, threshold);
      });
      if (ok) matched.push(i);
    }
    if (name === 'COUNTIFS') return matched.length;

    const source = valueRange ?? [];
    const picked = matched.map((i) => {
      const s = source[i];
      return typeof s === 'number' ? s : 0; // sum/average ignore non-numeric
    });
    if (name === 'SUMIFS') return picked.reduce((a, b) => a + b, 0);
    if (picked.length === 0) throw new Error('#DIV/0!'); // AVERAGEIFS
    return picked.reduce((a, b) => a + b, 0) / picked.length;
  }

  /** Read one argument as a 2D rect (rows × cols); a single cell/scalar → 1×1. */
  private rangeRect(): (FormulaValue | null)[][] {
    const token = this.peek();
    if (token?.type === 'ident' && this.at(1)?.type === 'colon' && this.at(2)?.type === 'ident') {
      const startToken = this.next() as Token & { value: string };
      this.next(); // colon
      const endToken = this.next() as Token & { value: string };
      const [r0c0, r1c1] = [this.coord(startToken.value), this.coord(endToken.value)];
      const rect: (FormulaValue | null)[][] = [];
      for (let r = Math.min(r0c0[0], r1c1[0]); r <= Math.max(r0c0[0], r1c1[0]); r++) {
        const row: (FormulaValue | null)[] = [];
        for (let c = Math.min(r0c0[1], r1c1[1]); c <= Math.max(r0c0[1], r1c1[1]); c++) {
          row.push(this.resolve(r, c));
        }
        rect.push(row);
      }
      return rect;
    }
    return [[this.comparison()]];
  }

  /**
   * MATCH(lookup, range, [type]). type 0 = exact (default — Excel uses 1); 1 =
   * largest value ≤ lookup (ascending); -1 = smallest ≥ lookup (descending).
   * Returns the 1-based position; no match → #N/A.
   */
  private matchFn(): FormulaValue {
    const lookup = this.comparison();
    this.expectComma();
    const flat = this.rangeRect().flat();
    let type = 0;
    if (this.peek()?.type === 'comma') {
      this.next();
      type = toNumber(this.comparison());
    }
    this.expectRparen();

    if (type === 0) {
      const idx = flat.findIndex((v) => v !== null && compareValues(v, '=', lookup));
      if (idx === -1) throw new Error('#N/A');
      return idx + 1;
    }
    // Approximate: ascending (type>0) keeps the last value ≤ lookup; descending
    // (type<0) keeps the last value ≥ lookup.
    const op = type > 0 ? '<=' : '>=';
    let best = -1;
    flat.forEach((v, i) => {
      if (v !== null && compareValues(v, op, lookup)) best = i;
    });
    if (best === -1) throw new Error('#N/A');
    return best + 1;
  }

  /**
   * VLOOKUP(lookup, table, colIndex, [approx]). Searches the table's first
   * column; approx 0 = exact (default — Excel uses TRUE), nonzero = approximate
   * (ascending). Returns the matched row's colIndex (1-based) cell.
   */
  private vlookup(): FormulaValue {
    const lookup = this.comparison();
    this.expectComma();
    const table = this.rangeRect();
    this.expectComma();
    const colIndex = Math.trunc(toNumber(this.comparison()));
    let approx = 0;
    if (this.peek()?.type === 'comma') {
      this.next();
      approx = toNumber(this.comparison());
    }
    this.expectRparen();

    let matchRow = -1;
    if (approx === 0) {
      matchRow = table.findIndex((row) => row[0] != null && compareValues(row[0], '=', lookup));
    } else {
      table.forEach((row, i) => {
        if (row[0] != null && compareValues(row[0], '<=', lookup)) matchRow = i;
      });
    }
    if (matchRow === -1) throw new Error('#N/A');
    const row = table[matchRow]!;
    if (colIndex < 1 || colIndex > row.length) throw new Error('#REF!');
    return row[colIndex - 1] ?? 0;
  }

  /**
   * HLOOKUP(lookup, table, rowIndex, [approx]) — the row-wise twin of VLOOKUP:
   * searches the table's first ROW, returns the matched column's rowIndex cell.
   */
  private hlookup(): FormulaValue {
    const lookup = this.comparison();
    this.expectComma();
    const table = this.rangeRect();
    this.expectComma();
    const rowIndex = Math.trunc(toNumber(this.comparison()));
    let approx = 0;
    if (this.peek()?.type === 'comma') {
      this.next();
      approx = toNumber(this.comparison());
    }
    this.expectRparen();

    const header = table[0] ?? [];
    let matchCol = -1;
    if (approx === 0) {
      matchCol = header.findIndex((v) => v != null && compareValues(v, '=', lookup));
    } else {
      header.forEach((v, i) => {
        if (v != null && compareValues(v, '<=', lookup)) matchCol = i;
      });
    }
    if (matchCol === -1) throw new Error('#N/A');
    if (rowIndex < 1 || rowIndex > table.length) throw new Error('#REF!');
    return table[rowIndex - 1]![matchCol] ?? 0;
  }

  /**
   * XLOOKUP(lookup, lookup_range, return_range, [if_not_found]) — exact match;
   * returns the aligned cell in return_range, or if_not_found / #N/A on a miss.
   */
  private xlookup(): FormulaValue {
    const lookup = this.comparison();
    this.expectComma();
    const lookupRange = this.rangeRect().flat();
    this.expectComma();
    const returnRange = this.rangeRect().flat();
    let ifNotFound: FormulaValue | undefined;
    if (this.peek()?.type === 'comma') {
      this.next();
      ifNotFound = this.comparison();
    }
    this.expectRparen();

    const idx = lookupRange.findIndex((v) => v !== null && compareValues(v, '=', lookup));
    if (idx === -1) {
      if (ifNotFound !== undefined) return ifNotFound;
      throw new Error('#N/A');
    }
    return returnRange[idx] ?? 0;
  }

  /** INDEX(range, rowNum, [colNum]) — 1-based; out of range → #REF!. */
  private indexFn(): FormulaValue {
    const rect = this.rangeRect();
    this.expectComma();
    const rowNum = Math.trunc(toNumber(this.comparison()));
    let colNum = 0;
    if (this.peek()?.type === 'comma') {
      this.next();
      colNum = Math.trunc(toNumber(this.comparison()));
    }
    this.expectRparen();

    const rows = rect.length;
    const cols = rect[0]?.length ?? 0;
    // A single row/column lets the lone index address it directly.
    let r = rowNum;
    let c = colNum;
    if (colNum === 0) {
      if (cols === 1) c = 1;
      else if (rows === 1) {
        c = rowNum;
        r = 1;
      } else c = 1;
    }
    if (r < 1 || r > rows || c < 1 || c > cols) throw new Error('#REF!');
    return rect[r - 1]![c - 1] ?? 0;
  }

  private expectRparen(): void {
    if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
    this.next();
  }

  private coord(ref: string): [number, number] {
    return this.resolveRef(ref); // named ref → A1 → throws #NAME?/#ERROR! (engine-injected)
  }
}

export function evaluateFormula(
  source: string,
  resolve: CellResolver,
  resolveRef?: RefResolver,
  now?: () => number,
): FormulaValue {
  return new Parser(source, resolve, resolveRef, now).parse();
}
