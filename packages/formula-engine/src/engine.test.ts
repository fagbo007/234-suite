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

  it('honours operator precedence and parentheses', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '=2+3*4');
    engine.setCell(0, 1, '=(2+3)*4');
    engine.setCell(0, 2, '=2^3^2'); // right-associative → 2^9 = 512
    expect(engine.getValue(0, 0)).toBe(14);
    expect(engine.getValue(0, 1)).toBe(20);
    expect(engine.getValue(0, 2)).toBe(512);
  });

  it('reports errors as Excel-style codes', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '=1/0');
    engine.setCell(1, 0, '=FOO(1)'); // unsupported function
    engine.setCell(2, 0, '=A3'); // self-reference (A3 === row 2, col 0)
    expect(engine.getValue(0, 0)).toBe('#DIV/0!');
    expect(engine.getValue(1, 0)).toBe('#NAME?');
    expect(engine.getValue(2, 0)).toBe('#CYCLE!');
  });

  it('resolves named references in formulas', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '10');
    engine.defineName('rev', 0, 0);
    engine.setCell(1, 0, '=rev*2');
    expect(engine.getValue(1, 0)).toBe(20);
    expect(engine.nameAt(0, 0)).toBe('rev');
  });

  it('reports an unknown name as #NAME?', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '=missing');
    expect(engine.getValue(0, 0)).toBe('#NAME?');
  });

  it('preserves named references on row insert (while raw A1 does not follow)', () => {
    engine = new SheetEngine();
    engine.setCell(2, 0, '30'); // A3 = 30
    engine.defineName('tot', 2, 0); // tot → A3
    engine.setCell(0, 1, '=tot'); // B1
    engine.setCell(0, 2, '=A3'); // C1
    expect(engine.getValue(0, 1)).toBe(30);
    expect(engine.getValue(0, 2)).toBe(30);

    engine.insertRow(0); // everything shifts down; tot follows to A4

    expect(engine.getValue(1, 1)).toBe(30); // =tot still correct
    expect(engine.getValue(1, 2)).toBe(0); // =A3 now points at the empty inserted row
    expect(engine.coordOf('tot')).toEqual({ row: 3, col: 0 });
  });

  it('audits external links per cell', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '=SUM(A2:A3)'); // internal — not flagged
    engine.setCell(0, 1, '=[Book.xlsx]Sheet1!A1');
    const links = engine.auditExternalLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ row: 0, col: 1 });
    expect(links[0]?.refs).toContain('[Book.xlsx]Sheet1!A1');
  });

  it('evaluates comparisons and IF over cell references', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '8'); // A1
    engine.setCell(1, 0, '3'); // A2
    engine.setCell(0, 1, '=IF(A1>A2, A1, A2)'); // larger of the two
    engine.setCell(1, 1, '=A1>=A2'); // numeric boolean
    engine.setCell(2, 1, '=IF(A2=0, 0, A1/A2)'); // lazy: no #DIV/0! when A2≠0

    expect(engine.getValue(0, 1)).toBe(8);
    expect(engine.getValue(1, 1)).toBe(1);
    expect(engine.getValue(2, 1)).toBeCloseTo(8 / 3);
  });

  it('reads a range and a single named reference', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '10');
    engine.setCell(1, 0, '20');
    engine.setCell(2, 0, '30');
    expect(engine.readRange('A1:A3')).toEqual([10, 20, 30]);
    engine.defineName('top', 0, 0);
    expect(engine.readRange('top')).toEqual([10]);
  });

  it('evaluates COUNTIF / SUMIF / AVERAGEIF with comparison or value criteria', () => {
    engine = new SheetEngine();
    [5, 15, 20, 8, 25].forEach((v, r) => engine!.setCell(r, 0, String(v))); // A1:A5
    [1, 2, 3, 4, 5].forEach((v, r) => engine!.setCell(r, 1, String(v))); // B1:B5

    engine.setCell(0, 2, '=COUNTIF(A1:A5, >10)'); // 15, 20, 25 → 3
    engine.setCell(1, 2, '=COUNTIF(A1:A5, 8)'); // exact match → 1
    engine.setCell(2, 2, '=SUMIF(A1:A5, >10)'); // 15+20+25 → 60
    engine.setCell(3, 2, '=SUMIF(A1:A5, >10, B1:B5)'); // B2+B3+B5 = 2+3+5 → 10
    engine.setCell(4, 2, '=AVERAGEIF(A1:A5, >10)'); // 60/3 → 20

    expect(engine.getValue(0, 2)).toBe(3);
    expect(engine.getValue(1, 2)).toBe(1);
    expect(engine.getValue(2, 2)).toBe(60);
    expect(engine.getValue(3, 2)).toBe(10);
    expect(engine.getValue(4, 2)).toBe(20);
  });

  it('handles text cells: concatenation, SUM ignores text, string results', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, 'hello'); // A1 (text)
    engine.setCell(1, 0, '10'); // A2 (number)
    engine.setCell(2, 0, '20'); // A3 (number)
    engine.setCell(0, 1, '=A1 & " world"'); // B1 → "hello world"
    engine.setCell(1, 1, '=SUM(A1:A3)'); // B2 → 30 (text ignored)
    engine.setCell(2, 1, '=UPPER(A1)'); // B3 → "HELLO"

    expect(engine.getValue(0, 1)).toBe('hello world');
    expect(engine.getValue(1, 1)).toBe(30);
    expect(engine.getValue(2, 1)).toBe('HELLO');
  });

  it('evaluates ad-hoc expressions via evaluate() (for rule predicates)', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '5'); // A1
    expect(engine.evaluate('1+2')).toBe(3);
    expect(engine.evaluate('=A1>3')).toBe(1); // leading = tolerated; comparison → 1
    expect(engine.evaluate('A1<3')).toBe(0);
    expect(engine.evaluate('NOPE(1)')).toBe('#NAME?'); // error code, never throws
    expect(engine.evaluate('')).toBeNull();
  });
});
