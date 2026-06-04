import { a1ToCell } from './a1';

/**
 * Minimal, dependency-free (MIT) formula evaluator. Replaces HyperFormula
 * (GPLv3) so the suite stays cleanly MIT. Supports:
 *  - arithmetic (`+ - * / ^`, parens, unary minus) and ranges
 *  - comparisons (`= <> < <= > >=`) — booleans are numeric (TRUE=1, FALSE=0)
 *  - functions: SUM / AVERAGE / COUNT / MIN / MAX, IF (lazy branches),
 *    AND / OR / NOT, ABS / INT / SQRT / POWER / MOD / ROUND,
 *    COUNTIF / SUMIF / AVERAGEIF (criteria = a comparison like `>10` or a value)
 * Further breadth (SUMIF, lookups, text, dates, arrays) stays planned — see
 * docs/formula-compat.md; unknown functions return `#NAME?` (never guessed).
 *
 * Errors are thrown as `Error` whose message is an Excel-style code
 * (`#DIV/0!`, `#NAME?`, `#NUM!`, `#VALUE!`, `#ERROR!`); the engine surfaces it.
 */

/** Resolve a cell to its numeric value, or null when the cell is empty. */
export type CellResolver = (row: number, col: number) => number | null;

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

type Token =
  | { type: 'num'; value: string }
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
    } else if (/[A-Za-z]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9]/.test(src[j]!)) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
    } else if ('+-*/^'.includes(ch)) {
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

/** Compare two numbers; booleans are represented numerically (TRUE=1, FALSE=0). */
function compare(a: number, op: string, b: number): boolean {
  switch (op) {
    case '=':
      return a === b;
    case '<>':
      return a !== b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    default:
      throw new Error('#ERROR!');
  }
}

function applyFunction(name: string, values: (number | null)[]): number {
  const nums = () => values.filter((v): v is number => v !== null);
  switch (name) {
    case 'SUM':
      return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
    case 'COUNT':
      return values.filter((v) => v !== null).length;
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
      return values.every((v) => (v ?? 0) !== 0) ? 1 : 0;
    case 'OR':
      return values.some((v) => (v ?? 0) !== 0) ? 1 : 0;
    case 'NOT':
      return (values[0] ?? 0) === 0 ? 1 : 0;
    // Scalar math — positional arguments (a range flattens; the first value is used).
    case 'ABS':
      return Math.abs(values[0] ?? 0);
    case 'INT':
      return Math.floor(values[0] ?? 0);
    case 'SQRT': {
      const x = values[0] ?? 0;
      if (x < 0) throw new Error('#NUM!');
      return Math.sqrt(x);
    }
    case 'POWER':
      return Math.pow(values[0] ?? 0, values[1] ?? 0);
    case 'MOD': {
      const a = values[0] ?? 0;
      const b = values[1] ?? 0;
      if (b === 0) throw new Error('#DIV/0!');
      return ((a % b) + b) % b; // Excel: result takes the divisor's sign
    }
    case 'ROUND': {
      const x = values[0] ?? 0;
      const f = Math.pow(10, Math.trunc(values[1] ?? 0));
      return Math.round(x * f) / f;
    }
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

  parse(): number {
    const value = this.comparison();
    if (this.pos !== this.tokens.length) throw new Error('#ERROR!');
    return value;
  }

  /** Lowest precedence: comparisons yield 1 (true) or 0 (false). */
  private comparison(): number {
    let left = this.expression();
    let token = this.peek();
    while (token?.type === 'op' && Parser.COMPARATORS.has(token.value)) {
      const op = token.value;
      this.next();
      const right = this.expression();
      left = compare(left, op, right) ? 1 : 0;
      token = this.peek();
    }
    return left;
  }

  private expression(): number {
    let left = this.term();
    let token = this.peek();
    while (token?.type === 'op' && (token.value === '+' || token.value === '-')) {
      this.next();
      const right = this.term();
      left = token.value === '+' ? left + right : left - right;
      token = this.peek();
    }
    return left;
  }

  private term(): number {
    let left = this.power();
    let token = this.peek();
    while (token?.type === 'op' && (token.value === '*' || token.value === '/')) {
      this.next();
      const right = this.power();
      if (token.value === '/') {
        if (right === 0) throw new Error('#DIV/0!');
        left = left / right;
      } else {
        left = left * right;
      }
      token = this.peek();
    }
    return left;
  }

  private power(): number {
    const base = this.unary();
    const token = this.peek();
    if (token?.type === 'op' && token.value === '^') {
      this.next();
      return Math.pow(base, this.power());
    }
    return base;
  }

  private unary(): number {
    const token = this.peek();
    if (token?.type === 'op' && token.value === '-') {
      this.next();
      return -this.unary();
    }
    if (token?.type === 'op' && token.value === '+') {
      this.next();
      return this.unary();
    }
    return this.primary();
  }

  private primary(): number {
    const token = this.peek();
    if (!token) throw new Error('#ERROR!');

    if (token.type === 'num') {
      this.next();
      const n = Number(token.value);
      if (!Number.isFinite(n)) throw new Error('#ERROR!');
      return n;
    }
    if (token.type === 'lparen') {
      this.next();
      const value = this.expression();
      if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
      this.next();
      return value;
    }
    if (token.type === 'ident') {
      if (this.at(1)?.type === 'lparen') return this.functionCall(token.value.toUpperCase());
      this.next();
      return this.resolve(...this.coord(token.value)) ?? 0;
    }
    throw new Error('#ERROR!');
  }

  private functionCall(name: string): number {
    this.next(); // ident
    this.next(); // lparen
    if (name === 'IF') return this.ifCall();
    if (name === 'COUNTIF' || name === 'SUMIF' || name === 'AVERAGEIF') {
      return this.conditionalAggregate(name);
    }
    const values: (number | null)[] = [];
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
  private ifCall(): number {
    const cond = this.comparison();
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

    let result: number;
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

  private argument(values: (number | null)[]): void {
    for (const v of this.rangeValues()) values.push(v);
  }

  /** Read one argument as a flat value list: a range `A1:B2` expands; else a scalar. */
  private rangeValues(): (number | null)[] {
    const token = this.peek();
    if (token?.type === 'ident' && this.at(1)?.type === 'colon' && this.at(2)?.type === 'ident') {
      const startToken = this.next() as Token & { value: string };
      this.next(); // colon
      const endToken = this.next() as Token & { value: string };
      const [r0c0, r1c1] = [this.coord(startToken.value), this.coord(endToken.value)];
      const values: (number | null)[] = [];
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
   * comparison (`>10`, `<>0`) or a bare value (exact match) — our numeric-only
   * equivalent of Excel's quoted string criteria. SUMIF/AVERAGEIF sum/average the
   * aligned `sum_range` (or `range`) where the criteria matches.
   */
  private conditionalAggregate(name: string): number {
    const range = this.rangeValues();
    this.expectComma();
    const { op, threshold } = this.parseCriteria();
    let sumRange: (number | null)[] | null = null;
    if (this.peek()?.type === 'comma') {
      this.next();
      sumRange = this.rangeValues();
    }
    if (this.peek()?.type !== 'rparen') throw new Error('#ERROR!');
    this.next(); // rparen

    const matched: number[] = [];
    range.forEach((v, i) => {
      if (v !== null && compare(v, op, threshold)) matched.push(i);
    });
    if (name === 'COUNTIF') return matched.length;

    const source = sumRange ?? range;
    const picked = matched.map((i) => source[i] ?? 0);
    if (name === 'SUMIF') return picked.reduce((a, b) => a + b, 0);
    if (picked.length === 0) throw new Error('#DIV/0!'); // AVERAGEIF
    return picked.reduce((a, b) => a + b, 0) / picked.length;
  }

  /** Parse a criteria argument: an optional comparator then a threshold expression. */
  private parseCriteria(): { op: string; threshold: number } {
    const token = this.peek();
    let op = '=';
    if (token?.type === 'op' && Parser.COMPARATORS.has(token.value)) {
      op = token.value;
      this.next();
    }
    return { op, threshold: this.expression() };
  }

  private coord(ref: string): [number, number] {
    return this.resolveRef(ref); // named ref → A1 → throws #NAME?/#ERROR! (engine-injected)
  }
}

export function evaluateFormula(
  source: string,
  resolve: CellResolver,
  resolveRef?: RefResolver,
): number {
  return new Parser(source, resolve, resolveRef).parse();
}
