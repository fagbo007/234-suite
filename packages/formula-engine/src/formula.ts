import { a1ToCell } from './a1';

/**
 * Minimal, dependency-free (MIT) formula evaluator for the documented Phase 1
 * scope: arithmetic (`+ - * / ^`, parentheses, unary minus) plus `SUM` /
 * `AVERAGE` / `COUNT` over ranges and arguments. Replaces HyperFormula (GPLv3)
 * so the suite stays cleanly MIT. Broader Excel coverage is a Phase 2 concern
 * (extend this evaluator or adopt formula.js, MIT).
 *
 * Errors are thrown as `Error` whose message is an Excel-style code
 * (`#DIV/0!`, `#NAME?`, `#VALUE!`, `#ERROR!`); the engine surfaces the code.
 */

/** Resolve a cell to its numeric value, or null when the cell is empty. */
export type CellResolver = (row: number, col: number) => number | null;

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

function applyFunction(name: string, values: (number | null)[]): number {
  switch (name) {
    case 'SUM':
      return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
    case 'COUNT':
      return values.filter((v) => v !== null).length;
    case 'AVERAGE': {
      const nums = values.filter((v): v is number => v !== null);
      if (nums.length === 0) throw new Error('#DIV/0!');
      return nums.reduce((a, b) => a + b, 0) / nums.length;
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

  parse(): number {
    const value = this.expression();
    if (this.pos !== this.tokens.length) throw new Error('#ERROR!');
    return value;
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

  private argument(values: (number | null)[]): void {
    const token = this.peek();
    if (token?.type === 'ident' && this.at(1)?.type === 'colon' && this.at(2)?.type === 'ident') {
      const startToken = this.next() as Token & { value: string };
      this.next(); // colon
      const endToken = this.next() as Token & { value: string };
      const [r0c0, r1c1] = [this.coord(startToken.value), this.coord(endToken.value)];
      const rowStart = Math.min(r0c0[0], r1c1[0]);
      const rowEnd = Math.max(r0c0[0], r1c1[0]);
      const colStart = Math.min(r0c0[1], r1c1[1]);
      const colEnd = Math.max(r0c0[1], r1c1[1]);
      for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) values.push(this.resolve(r, c));
      }
    } else {
      values.push(this.expression());
    }
  }

  private coord(ref: string): [number, number] {
    const { row, col } = a1ToCell(ref); // throws on a non-A1 token → mapped to #ERROR!
    return [row, col];
  }
}

export function evaluateFormula(source: string, resolve: CellResolver): number {
  return new Parser(source, resolve).parse();
}
